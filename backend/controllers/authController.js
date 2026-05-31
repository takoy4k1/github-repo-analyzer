import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';


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
 * Redirects the client to GitHub's authorization page.
 */
export const githubAuth = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5001/api/auth/github/callback';
  
  if (!clientId) {
    return res.status(500).json({ message: 'GitHub OAuth Client ID is not configured on the server.' });
  }

  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=repo,user`;
  res.redirect(githubUrl);
};

/**
 * Handles GitHub OAuth Callback.
 * Exchanges the code for access token, fetches profile, and authenticates the user.
 */
export const githubCallback = async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=no_code`);
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

    if (!accessToken) {
      console.error('Failed to retrieve GitHub access token:', tokenData);
      return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    // 2. Fetch User Profile from GitHub API
    const userProfileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'RepoMind-AI-Server'
      }
    });

    const profile = await userProfileResponse.json();

    if (!profile.id) {
      console.error('Failed to retrieve GitHub profile:', profile);
      return res.redirect(`${frontendUrl}/login?error=profile_fetch_failed`);
    }

    // 3. Find or Create User in MongoDB
    let user = await User.findOne({ githubId: profile.id.toString() });

    if (!user) {
      user = new User({
        githubId: profile.id.toString(),
        username: profile.login,
        avatarUrl: profile.avatar_url
      });
    } else {
      // Keep username and avatar up-to-date
      user.username = profile.login;
      user.avatarUrl = profile.avatar_url;
    }

    // Encrypt and store access token
    user.encryptToken(accessToken);
    await user.save();

    // 4. Generate Session Tokens
    const token = generateToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    // Update user's hashed refresh token in their document for additional session security
    user.hashRefreshToken(refreshToken);
    await user.save();

    // 5. Redirect browser back to Frontend callback handler
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&refreshToken=${refreshToken}`);
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    res.redirect(`${frontendUrl}/login?error=server_error`);
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

