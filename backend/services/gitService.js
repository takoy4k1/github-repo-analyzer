import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';

/**
 * Clones a public GitHub repository to a temporary directory.
 * @param {string} repoUrl - The URL of the GitHub repository.
 * @param {string} tempPath - The local path where the repo should be cloned.
 * @param {string} branch - The branch to clone (default 'main').
 * @returns {Promise<void>}
 */
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Clones a public GitHub repository to a temporary directory.
 * @param {string} repoUrl - The URL of the GitHub repository.
 * @param {string} tempPath - The local path where the repo should be cloned.
 * @param {string} branch - The branch to clone (default 'main').
 * @returns {Promise<void>}
 */
export const cloneRepo = async (repoUrl, tempPath, branch = 'main') => {
  try {
    // Ensure the parent directory exists
    await fs.ensureDir(path.dirname(tempPath));
    
    // If the path already exists, clean it up first
    if (await fs.exists(tempPath)) {
      await fs.remove(tempPath);
    }
    
    const git = simpleGit();
    
    // Clone with depth 1. Try branch first, fall back to default if it fails.
    try {
      await git.clone(repoUrl, tempPath, ['--depth', '1', '-b', branch]);
    } catch (branchError) {
      console.warn(`Failed to clone branch "${branch}", falling back to default branch: ${branchError.message}`);
      await git.clone(repoUrl, tempPath, ['--depth', '1']);
    }
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error.message}`);
  }
};

/**
 * Deletes the cloned repository files.
 * @param {string} tempPath - The path of the local repository.
 * @returns {Promise<void>}
 */
export const cleanupRepo = async (tempPath) => {
  try {
    if (await fs.exists(tempPath)) {
      await fs.remove(tempPath);
    }
  } catch (error) {
    console.error(`Error cleaning up repository path ${tempPath}:`, error.message);
  }
};

/**
 * Runs git log analysis to calculate file touch times, weekly commit stats, and author contributions.
 * @param {string} repoPath - Local path to the cloned git repository.
 * @returns {Promise<object>} Parsed git history.
 */
export const analyzeGitHistory = async (repoPath) => {
  try {
    // Check if the directory exists and has a .git folder
    const hasGit = await fs.exists(path.join(repoPath, '.git'));
    if (!hasGit) {
      throw new Error('Not a git repository');
    }

    // Fetch commit history (newest to oldest) with file name changes
    const { stdout } = await execPromise(
      'git log --name-only --pretty=format:"COMMIT:%ct|%an"',
      { cwd: repoPath, maxBuffer: 20 * 1024 * 1024 } // 20MB buffer limit
    );

    const lines = stdout.split('\n');
    
    const fileLastTouched = {};
    const fileAuthorCommits = {};
    const fileTotalCommits = {};
    
    const now = Math.floor(Date.now() / 1000);
    const SECONDS_IN_WEEK = 7 * 24 * 60 * 60;
    const weeklyCommits = new Array(12).fill(0);

    let currentCommit = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('COMMIT:')) {
        const parts = trimmed.substring(7).split('|');
        const timestamp = parseInt(parts[0], 10);
        const author = parts[1] || 'Unknown';
        
        currentCommit = { timestamp, author };

        const weeksAgo = Math.floor((now - timestamp) / SECONDS_IN_WEEK);
        if (weeksAgo >= 0 && weeksAgo < 12) {
          weeklyCommits[weeksAgo]++;
        }
      } else if (currentCommit) {
        const filePath = trimmed;
        
        // 1. First occurrence of filePath is its last touched date
        if (!fileLastTouched[filePath]) {
          fileLastTouched[filePath] = {
            timestamp: currentCommit.timestamp,
            author: currentCommit.author
          };
        }

        // 2. Map contributions
        if (!fileAuthorCommits[filePath]) {
          fileAuthorCommits[filePath] = {};
        }
        fileAuthorCommits[filePath][currentCommit.author] = (fileAuthorCommits[filePath][currentCommit.author] || 0) + 1;
        
        // 3. Count total commits per file
        fileTotalCommits[filePath] = (fileTotalCommits[filePath] || 0) + 1;
      }
    }

    return {
      fileLastTouched,
      fileAuthorCommits,
      fileTotalCommits,
      weeklyCommits: weeklyCommits.reverse() // chronological
    };
  } catch (error) {
    console.error('Error analyzing git history:', error.message);
    return {
      fileLastTouched: {},
      fileAuthorCommits: {},
      fileTotalCommits: {},
      weeklyCommits: new Array(12).fill(0)
    };
  }
};

