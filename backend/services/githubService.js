import crypto from 'crypto';

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Fetch helper with Authorization headers.
 */
const githubFetch = async (endpoint, token, options = {}) => {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'RepoMind-AI-Server',
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${GITHUB_API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
};

/**
 * Get repository basic details, issues count, stars, forks, etc.
 */
export const getRepoMetadata = async (fullName, token) => {
  try {
    if (!token) return getMockRepoMetadata(fullName);
    return await githubFetch(`/repos/${fullName}`, token);
  } catch (error) {
    console.warn(`GitHub fetch metadata failed for ${fullName}, falling back to mock:`, error.message);
    return getMockRepoMetadata(fullName);
  }
};

/**
 * Get repository pull requests (both open and closed).
 */
export const getRepoPullRequests = async (fullName, token) => {
  try {
    if (!token) return getMockPullRequests(fullName);
    // Fetch last 50 PRs (state: all) to compute metrics
    return await githubFetch(`/repos/${fullName}/pulls?state=all&per_page=50`, token);
  } catch (error) {
    console.warn(`GitHub fetch PRs failed for ${fullName}, falling back to mock:`, error.message);
    return getMockPullRequests(fullName);
  }
};

/**
 * Fetch raw PR diff content.
 */
export const getPullRequestDiff = async (fullName, prNumber, token) => {
  try {
    if (!token) return getMockDiff();
    const headers = {
      Accept: 'application/vnd.github.diff',
      'User-Agent': 'RepoMind-AI-Server'
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${GITHUB_API_URL}/repos/${fullName}/pulls/${prNumber}`, {
      headers
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.warn(`GitHub fetch PR diff failed for ${fullName} #${prNumber}, using mock diff:`, error.message);
    return getMockDiff();
  }
};

/**
 * Post comment back to the GitHub PR.
 */
export const postPRComment = async (fullName, prNumber, commentBody, token) => {
  try {
    if (!token) {
      console.log(`[Offline Mode] Would post comment to ${fullName} #${prNumber}:`, commentBody);
      return { id: 'mock-comment-id', body: commentBody };
    }
    return await githubFetch(`/repos/${fullName}/issues/${prNumber}/comments`, token, {
      method: 'POST',
      body: JSON.stringify({ body: commentBody })
    });
  } catch (error) {
    console.error(`Failed to post PR comment to ${fullName} #${prNumber}:`, error.message);
    throw error;
  }
};

/* ==========================================================================
   Mock Fallbacks (Ensures the app runs beautifully even without keys/tokens)
   ========================================================================== */

const getMockRepoMetadata = (fullName) => {
  const [owner, name] = fullName.split('/');
  return {
    id: 123456789,
    node_id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3ODk=',
    name: name || 'repository',
    full_name: fullName,
    private: false,
    owner: {
      login: owner || 'unknown',
      id: 987654
    },
    html_url: `https://github.com/${fullName}`,
    description: `Analysis statistics for ${fullName}`,
    fork: false,
    stargazers_count: Math.floor(Math.random() * 500) + 1200,
    watchers_count: Math.floor(Math.random() * 200) + 500,
    forks_count: Math.floor(Math.random() * 150) + 300,
    open_issues_count: Math.floor(Math.random() * 45) + 5,
    default_branch: 'main'
  };
};

const getMockPullRequests = (fullName) => {
  const prs = [];
  const now = new Date();
  
  // Create 15 mock PRs with varying creation and closing dates
  for (let i = 1; i <= 15; i++) {
    const isMerged = i % 3 !== 0; // 66% merge rate
    const isOpen = i === 1 || i === 5;
    
    const createdAt = new Date(now.getTime() - i * 3.5 * 24 * 60 * 60 * 1000); // Created i * 3.5 days ago
    const closedAt = isOpen ? null : new Date(createdAt.getTime() + (Math.random() * 5 + 1) * 24 * 60 * 60 * 1000); // Took 1 to 6 days to close
    
    prs.push({
      number: 100 + i,
      state: isOpen ? 'open' : 'closed',
      title: `Feature implementation ${i} for ${fullName}`,
      created_at: createdAt.toISOString(),
      closed_at: closedAt ? closedAt.toISOString() : null,
      merged_at: isMerged && !isOpen ? closedAt.toISOString() : null,
      user: {
        login: i % 2 === 0 ? 'john_doe' : 'alice_smith'
      }
    });
  }
  return prs;
};

const getMockDiff = () => {
  return `diff --git a/backend/server.js b/backend/server.js
index f30f8ca..769213d 100644
--- a/backend/server.js
+++ b/backend/server.js
@@ -10,3 +10,13 @@ dotenv.config();
 const app = express();
-const PORT = process.env.PORT || 5001;
+const PORT = process.env.PORT || 5002;
 
+// Add health endpoint
+app.get('/api/health', (req, res) => {
+  res.status(200).json({ status: 'healthy' });
+});
+diff --git a/backend/services/aiService.js b/backend/services/aiService.js
index c6b92a1..3a9f82d 100644
--- a/backend/services/aiService.js
+++ b/backend/services/aiService.js
@@ -54,3 +54,3 @@ export const getEmbedding = async (text) => {
-  if (!hasOpenAIKey()) return null;
+  if (!hasOpenAIKey()) return new Array(1536).fill(0);
`;
};
