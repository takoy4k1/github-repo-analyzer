import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// In-memory CSRF state store.  Each state maps to metadata and has a 10-min
// expiry.  This is intentionally stateless relative to sessions; the JWT
// carries the user identity for the "connect GitHub to existing account" flow.
// ---------------------------------------------------------------------------
const oauthStateMap = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const createOAuthState = (userId = null) => {
  const state = crypto.randomBytes(24).toString('hex');
  oauthStateMap.set(state, { userId, createdAt: Date.now() });
  // Prune expired states periodically
  for (const [s, meta] of oauthStateMap) {
    if (Date.now() - meta.createdAt > OAUTH_STATE_TTL_MS) oauthStateMap.delete(s);
  }
  return state;
};

const consumeOAuthState = (state) => {
  const meta = oauthStateMap.get(state);
  if (!meta) return null;
  oauthStateMap.delete(state);
  if (Date.now() - meta.createdAt > OAUTH_STATE_TTL_MS) return null;
  return meta;
};


const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'fallback_secret_key',
    { expiresIn: '1d' } // Access token valid for 1 day
  );
};

const generateRefreshToken = async (userId) => {
  // Generate a secure random token
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  // Save hash to database (valid for 60 days)
  await RefreshToken.create({
    tokenHash,
    userId,
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  });
  
  return token;
};

/**
 * Initiates GitHub OAuth Flow.
 *
 * Two modes:
 *   1. Guest / login:  No Authorization header → create a new RepoMind session via GitHub.
 *   2. Connect:        Authorization header present → connect GitHub to an existing local account.
 *
 * A cryptographically random state is generated, stored server-side, and sent
 * to GitHub.  It is validated in the callback to prevent CSRF.
 */
export const githubAuth = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5001/api/auth/github/callback';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!clientId) {
    // Redirect to callback page to display clean notification to user
    return res.redirect(`${frontendUrl}/auth/callback?github_error=not_configured`);
  }

  // Attempt to extract existing user ID from JWT (connect-to-account flow)
  let userId = null;
  const rawToken = req.query.token || (
    req.header('Authorization')?.startsWith('Bearer ')
      ? req.header('Authorization').split(' ')[1]
      : null
  );

  if (rawToken) {
    try {
      const decoded = jwt.verify(
        rawToken,
        process.env.JWT_SECRET || 'fallback_secret_key'
      );
      userId = decoded.id;
    } catch {
      // Ignore invalid token – treat as anonymous OAuth login
    }
  }

  const state = createOAuthState(userId);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'repo,user:email',
    state
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
};

/**
 * Handles GitHub OAuth Callback.
 *
 * Validates the state parameter (CSRF), exchanges code for access token,
 * fetches GitHub profile, then either:
 *   - Creates / updates a RepoMind user (login/register flow), or
 *   - Attaches the GitHub token to an existing local user (connect flow).
 *
 * Session tokens are passed via a short-lived one-time-use code rather than
 * putting JWTs directly in the URL, mitigating leakage through referrer headers
 * or server logs.
 */
export const githubCallback = async (req, res) => {
  const { code, state, error: githubError } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // --- User denied authorization ---
  if (githubError === 'access_denied') {
    return res.redirect(`${frontendUrl}/auth?github_error=access_denied`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/auth?github_error=no_code`);
  }

  // --- CSRF state validation ---
  if (!state) {
    return res.redirect(`${frontendUrl}/auth?github_error=missing_state`);
  }

  const stateMeta = consumeOAuthState(state);
  if (!stateMeta) {
    return res.redirect(`${frontendUrl}/auth?github_error=invalid_state`);
  }

  if (!clientId || !clientSecret) {
    return res.redirect(`${frontendUrl}/auth?github_error=not_configured`);
  }

  try {
    // 1. Exchange OAuth code for an access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (tokenData.error || !accessToken) {
      const reason = tokenData.error_description || tokenData.error || 'unknown';
      console.error('GitHub token exchange failed:', tokenData);
      return res.redirect(`${frontendUrl}/auth?github_error=token_exchange_failed&reason=${encodeURIComponent(reason)}`);
    }

    // 2. Fetch GitHub profile
    const profileRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'RepoMind-AI-Server'
      }
    });

    if (!profileRes.ok) {
      console.error('GitHub profile fetch failed:', profileRes.status);
      return res.redirect(`${frontendUrl}/auth?github_error=profile_fetch_failed`);
    }

    const profile = await profileRes.json();

    if (!profile.id) {
      return res.redirect(`${frontendUrl}/auth?github_error=profile_fetch_failed`);
    }

    let user;

    // --- Connect flow: attach GitHub to an existing local user ---
    if (stateMeta.userId) {
      user = await User.findById(stateMeta.userId);
      if (!user) {
        return res.redirect(`${frontendUrl}/dashboard?github_error=user_not_found`);
      }
      // Check for collision: another account already linked to this GitHub ID
      const existingGithub = await User.findOne({ githubId: profile.id.toString(), _id: { $ne: user._id } });
      if (existingGithub) {
        return res.redirect(`${frontendUrl}/dashboard?github_error=github_account_already_linked`);
      }
      user.githubId = profile.id.toString();
      // Update avatar only if not already set to a custom one
      if (!user.avatarUrl || user.avatarUrl.includes('dicebear')) {
        user.avatarUrl = profile.avatar_url;
      }
      user.encryptToken(accessToken);
      await user.save();

      // Use a one-time exchange code so the JWT isn't in the URL
      const exchangeCode = crypto.randomBytes(16).toString('hex');
      const codeHash = crypto.createHash('sha256').update(exchangeCode).digest('hex');
      // Temporarily store the code→userId mapping (5-min TTL reuses the state map pattern)
      oauthStateMap.set(`xchg:${codeHash}`, { userId: user._id.toString(), type: 'connect', createdAt: Date.now() });

      return res.redirect(`${frontendUrl}/auth/callback?xchg=${exchangeCode}&connected=true`);
    }

    // --- Login / register flow: find or create user by GitHub ID ---
    user = await User.findOne({ githubId: profile.id.toString() });

    if (!user) {
      // Check if there's a local account with the same username
      const usernameConflict = await User.findOne({ username: profile.login });
      const username = usernameConflict ? `${profile.login}_gh` : profile.login;

      user = new User({
        githubId: profile.id.toString(),
        username,
        avatarUrl: profile.avatar_url
      });
    } else {
      user.avatarUrl = profile.avatar_url;
    }

    user.encryptToken(accessToken);
    await user.save();

    // Generate RepoMind session tokens
    const token = generateToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);
    user.hashRefreshToken(refreshToken);
    await user.save();

    // Store tokens server-side behind a one-time exchange code
    const exchangeCode = crypto.randomBytes(16).toString('hex');
    const codeHash = crypto.createHash('sha256').update(exchangeCode).digest('hex');
    oauthStateMap.set(`xchg:${codeHash}`, {
      userId: user._id.toString(),
      token,
      refreshToken,
      type: 'login',
      createdAt: Date.now()
    });

    res.redirect(`${frontendUrl}/auth/callback?xchg=${exchangeCode}`);
  } catch (error) {
    console.error('OAuth Callback Error:', error.message);
    res.redirect(`${frontendUrl}/auth?github_error=server_error`);
  }
};

/**
 * Exchanges a one-time OAuth callback code for session tokens.
 * The frontend calls this immediately on landing at /auth/callback.
 * Keeps JWTs out of browser history and referrer headers.
 */
export const exchangeOAuthCode = (req, res) => {
  const { xchg } = req.body;

  if (!xchg) {
    return res.status(400).json({ message: 'Exchange code is required' });
  }

  const codeHash = crypto.createHash('sha256').update(xchg).digest('hex');
  const cacheKey = `xchg:${codeHash}`;
  const meta = oauthStateMap.get(cacheKey);

  if (!meta) {
    return res.status(400).json({ message: 'Exchange code is invalid or expired' });
  }

  if (Date.now() - meta.createdAt > 5 * 60 * 1000) {
    oauthStateMap.delete(cacheKey);
    return res.status(400).json({ message: 'Exchange code has expired' });
  }

  // If already exchanged in the last 30 seconds (e.g. React StrictMode duplicate request in dev)
  if (meta.cachedResponse) {
    return res.json(meta.cachedResponse);
  }

  let responseData;
  if (meta.type === 'connect') {
    responseData = { connected: true, userId: meta.userId };
  } else {
    responseData = { token: meta.token, refreshToken: meta.refreshToken };
  }

  // Cache response for 30 seconds to support duplicate dev mounts, then clean up
  meta.cachedResponse = responseData;
  setTimeout(() => {
    oauthStateMap.delete(cacheKey);
  }, 30000);

  return res.json(responseData);
};

/**
 * Disconnects the GitHub account from the currently authenticated user.
 * Deletes the encrypted GitHub access token and clears githubId.
 */
export const disconnectGitHub = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.githubId) {
      return res.status(400).json({ message: 'GitHub account is not connected' });
    }

    // If the user has no local password (GitHub-only login), block disconnection
    if (!user.password) {
      return res.status(400).json({
        message: 'Cannot disconnect GitHub: this account was created with GitHub login and has no local password. Delete the account instead.'
      });
    }

    user.githubId = undefined;
    user.accessToken = undefined;
    await user.save();

    res.json({ message: 'GitHub account disconnected successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Refreshes an expired JWT access token using a Refresh Token.
 */
export const refreshSession = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    if (storedToken.used) {
      // Refresh Token Reuse Detection: Invalidate all refresh tokens for this user
      await RefreshToken.deleteMany({ userId: storedToken.userId });
      return res.status(401).json({ message: 'Refresh token has been used. Revoking all sessions.' });
    }

    if (new Date() > storedToken.expiresAt) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      return res.status(401).json({ message: 'Refresh token has expired' });
    }

    // Mark current token as used
    storedToken.used = true;
    await storedToken.save();

    // Generate new pair of tokens
    const user = await User.findById(storedToken.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const token = generateToken(user._id);
    const newRefreshToken = await generateRefreshToken(user._id);

    user.hashRefreshToken(newRefreshToken);
    await user.save();

    res.json({
      token,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Fetch authenticated user settings & details.
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-accessToken -refreshToken');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Updates user settings profile.
 */
export const updateSettings = async (req, res) => {
  const { settings } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (settings) {
      user.settings = {
        ...user.settings.toObject(),
        ...settings
      };
      await user.save();
    }

    res.json({
      message: 'Settings updated successfully',
      settings: user.settings
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Register a new local user with email & password.
 */
export const register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingUser = await User.findOne({ 
      $or: [
        { username: username.trim() },
        { email: email.trim().toLowerCase() }
      ] 
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`
    });

    await user.save();

    const token = generateToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    user.hashRefreshToken(refreshToken);
    await user.save();

    res.status(201).json({
      token,
      refreshToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        settings: user.settings
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

/**
 * Login a local user using email & password.
 */
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'This account uses GitHub login. Please log in with GitHub.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    user.hashRefreshToken(refreshToken);
    await user.save();

    res.json({
      token,
      refreshToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        settings: user.settings
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};
