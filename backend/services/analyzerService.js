import { calculateHealthScore } from './healthService.js';
import path from 'path';

/**
 * Computes all analytical metrics (Feature 1, 2, 3, 4) for a repository.
 *
 * @param {object} params - Input parameters.
 * @param {object} params.parsed - Output of parseRepository (files, fileTree, metrics).
 * @param {object} params.metadata - GitHub repository metadata.
 * @param {Array} params.prs - GitHub repository pull requests.
 * @param {object} params.gitStats - Local git history stats (fileLastTouched, fileAuthorCommits, fileTotalCommits, weeklyCommits).
 * @param {number} params.stalenessThreshold - Days threshold for dead code detection.
 * @returns {object} Calculated metrics object containing healthScore, breakdown, bus factor risk list, velocity tracker, and stale files.
 */
export const runAnalytics = ({
  parsed,
  metadata,
  prs,
  gitStats,
  stalenessThreshold = 90
}) => {
  const totalFilesCount = parsed.files.length;
  
  // 1. Calculate Test File Ratio
  const testFiles = parsed.files.filter(f => 
    /\.(test|spec)\.[a-zA-Z0-9]+$/.test(f.path) || 
    f.path.includes('/tests/') || 
    f.path.includes('/test/')
  );
  const testFileRatio = totalFilesCount > 0 ? (testFiles.length / totalFilesCount) : 0;

  // 2. Calculate PR Merge Rate & Average PR Age
  const closedPrs = prs.filter(p => p.state === 'closed');
  const mergedPrs = prs.filter(p => p.merged_at);
  const prMergeRate = closedPrs.length > 0 ? (mergedPrs.length / closedPrs.length) : 0.5;

  let totalPrAgeHours = 0;
  let prAgeCount = 0;
  let reviewBottlenecksCount = 0;

  for (const pr of prs) {
    const created = new Date(pr.created_at);
    const closed = pr.closed_at ? new Date(pr.closed_at) : new Date();
    const durationHours = (closed.getTime() - created.getTime()) / (1000 * 60 * 60);

    if (pr.state === 'closed') {
      totalPrAgeHours += durationHours;
      prAgeCount++;
    }

    // Flag bottlenecks: PRs open for more than 48 hours
    if (durationHours > 48) {
      reviewBottlenecksCount++;
    }
  }

  const averagePrAgeHours = prAgeCount > 0 ? (totalPrAgeHours / prAgeCount) : 48;

  // 3. Commit Frequency (average weekly commits in the last 12 weeks)
  const totalCommitsIn12Weeks = gitStats.weeklyCommits.reduce((sum, val) => sum + val, 0);
  const commitsPerWeek = totalCommitsIn12Weeks / 12;

  // 4. Calculate Weighted Health Score
  const openIssuesCount = metadata.open_issues_count || 0;
  const health = calculateHealthScore({
    openIssuesCount,
    prMergeRate,
    testFileRatio,
    averagePrAgeHours,
    commitsPerWeek
  });

  // 5. Contributor DNA & Bus Factor Map (Feature 2)
  const riskFiles = [];
  const dirFilesCount = {}; // dirPath -> total files
  const dirRiskFilesCount = {}; // dirPath -> risk files

  for (const file of parsed.files) {
    const filePath = file.path;
    const authorCommits = gitStats.fileAuthorCommits[filePath] || {};
    const totalCommits = gitStats.fileTotalCommits[filePath] || 0;
    const lastTouched = gitStats.fileLastTouched[filePath];

    if (totalCommits >= 3) {
      // Find top contributor
      let topContributor = 'Unknown';
      let maxCommits = 0;
      for (const [author, count] of Object.entries(authorCommits)) {
        if (count > maxCommits) {
          maxCommits = count;
          topContributor = author;
        }
      }

      const percentage = totalCommits > 0 ? (maxCommits / totalCommits) : 0;
      
      // If one person authored >80% of commits, flag as high risk
      const isHighRisk = percentage > 0.8;

      // Extract directory path hierarchy
      const dirPath = path.dirname(filePath);
      const dirs = getDirectoryHierarchy(dirPath);

      for (const d of dirs) {
        dirFilesCount[d] = (dirFilesCount[d] || 0) + 1;
        if (isHighRisk) {
          dirRiskFilesCount[d] = (dirRiskFilesCount[d] || 0) + 1;
        }
      }

      if (isHighRisk) {
        riskFiles.push({
          file: filePath,
          topContributor,
          contributorCommits: maxCommits,
          totalCommits,
          percentage: Math.round(percentage * 100),
          lastCommitDate: lastTouched ? new Date(lastTouched.timestamp * 1000) : new Date()
        });
      }
    }
  }

  // Calculate risk level per directory (0 to 100)
  const riskDirectories = {};
  for (const [dir, total] of Object.entries(dirFilesCount)) {
    const riskCount = dirRiskFilesCount[dir] || 0;
    riskDirectories[dir] = Math.round((riskCount / total) * 100);
  }

  // Sort risk files by percentage and total commits
  riskFiles.sort((a, b) => b.percentage - a.percentage || b.totalCommits - a.totalCommits);

  // 6. Dead Code Detector (Feature 4)
  const staleFiles = [];
  const nowMs = Date.now();
  const millisecondsInDay = 24 * 60 * 60 * 1000;

  for (const file of parsed.files) {
    const filePath = file.path;
    const lastTouched = gitStats.fileLastTouched[filePath];

    if (lastTouched) {
      const touchedDate = new Date(lastTouched.timestamp * 1000);
      const daysStale = (nowMs - touchedDate.getTime()) / millisecondsInDay;

      if (daysStale > stalenessThreshold) {
        // Estimate size using string content byte size
        const sizeBytes = Buffer.byteLength(file.content || '', 'utf8');
        
        staleFiles.push({
          file: filePath,
          lastTouchedDate: touchedDate,
          sizeBytes,
          primaryAuthor: lastTouched.author,
          daysStale: Math.round(daysStale)
        });
      }
    }
  }

  // Sort stale files by size (largest first) to prioritize highest recovery value
  staleFiles.sort((a, b) => b.sizeBytes - a.sizeBytes);

  return {
    healthScore: health.score,
    metrics: {
      totalFiles: parsed.metrics.totalFiles,
      totalLines: parsed.metrics.totalLines,
      languages: parsed.metrics.languages,
      architectureScore: health.breakdown.prAgeScore, // placeholder fallback
      maintainabilityScore: health.score,
      estimatedComplexity: parsed.metrics.totalLines > 10000 ? 'High' : (parsed.metrics.totalLines > 2000 ? 'Medium' : 'Low'),
      onboardingDifficulty: parsed.metrics.totalFiles > 50 ? 'Hard' : (parsed.metrics.totalFiles > 15 ? 'Medium' : 'Easy'),
      
      healthBreakdown: health.breakdown,
      busFactorRisk: {
        riskFiles: riskFiles.slice(0, 30), // Limit to top 30
        riskDirectories
      },
      devVelocity: {
        averagePrMergeTimeHours: Math.round(averagePrAgeHours),
        reviewBottlenecksCount,
        weeklyCommits: gitStats.weeklyCommits
      },
      deadCode: {
        staleFiles
      }
    }
  };
};

/**
 * Returns all parent directory paths for a given directory path.
 * e.g., "src/components/button" -> ["src/components/button", "src/components", "src", "."]
 */
const getDirectoryHierarchy = (dirPath) => {
  if (!dirPath || dirPath === '.') return ['.'];
  const parts = dirPath.split(path.sep);
  const dirs = ['.'];
  let current = '';
  for (const part of parts) {
    if (!part) continue;
    current = current ? `${current}/${part}` : part;
    dirs.push(current);
  }
  return dirs;
};
