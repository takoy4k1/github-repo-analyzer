/**
 * Computes a weighted composite health score (0-100) for a repository.
 * Weights:
 * - Open Issues: 15%
 * - PR Merge Rate: 20%
 * - Test File Ratio: 30%
 * - Average PR Age: 15%
 * - Commit Frequency: 20%
 *
 * @param {object} params - Input parameters.
 * @param {number} params.openIssuesCount - Total open issues.
 * @param {number} params.prMergeRate - Percentage of merged PRs (0 to 1).
 * @param {number} params.testFileRatio - Ratio of test files (0 to 1).
 * @param {number} params.averagePrAgeHours - Average age of PRs in hours.
 * @param {number} params.commitsPerWeek - Commits per week.
 * @returns {object} Health score (0-100) and breakdown metrics.
 */
export const calculateHealthScore = ({
  openIssuesCount = 0,
  prMergeRate = 0.5,
  testFileRatio = 0.05,
  averagePrAgeHours = 48,
  commitsPerWeek = 5
}) => {
  const openIssuesScore = Math.max(0, 100 - openIssuesCount * 1.5);
  const prMergeRateScore = prMergeRate * 100;
  const testFileRatioScore = Math.min(100, (testFileRatio / 0.1) * 100);
  const prAgeScore = Math.max(0, 100 - (averagePrAgeHours / (14 * 24)) * 100);
  const commitFreqScore = Math.min(100, (commitsPerWeek / 10) * 100);

  const weightedScore = Math.round(
    openIssuesScore * 0.15 +
    prMergeRateScore * 0.20 +
    testFileRatioScore * 0.30 +
    prAgeScore * 0.15 +
    commitFreqScore * 0.20
  );

  return {
    score: Math.min(100, Math.max(0, weightedScore)),
    breakdown: {
      openIssuesScore: Math.round(openIssuesScore),
      prMergeRateScore: Math.round(prMergeRateScore),
      testFileRatioScore: Math.round(testFileRatioScore),
      prAgeScore: Math.round(prAgeScore),
      commitFreqScore: Math.round(commitFreqScore)
    }
  };
};
