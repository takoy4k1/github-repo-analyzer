/**
 * Generates a clean, modern flat-style SVG badge for code health scores.
 * Colors:
 * - Green (>= 80): #10b981
 * - Amber (50-79): #f59e0b
 * - Red (< 50): #ef4444
 *
 * @param {number} score - Repository health score (0-100).
 * @returns {string} Plain SVG XML string.
 */
export const generateSVG = (score) => {
  const cleanScore = Math.min(100, Math.max(0, Math.round(score)));
  
  let color = '#ef4444'; // Red
  if (cleanScore >= 80) {
    color = '#10b981'; // Green
  } else if (cleanScore >= 50) {
    color = '#f59e0b'; // Amber
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="135" height="20" viewBox="0 0 135 20">
    <linearGradient id="b" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
        <rect width="135" height="20" rx="4" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
        <rect width="80" height="20" fill="#1e293b"/>
        <rect x="80" width="55" height="20" fill="${color}"/>
        <rect width="135" height="20" fill="url(#b)"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11" font-weight="bold">
        <text x="40" y="15" fill="#000" fill-opacity=".3">code health</text>
        <text x="40" y="14">code health</text>
        <text x="107.5" y="15" fill="#000" fill-opacity=".3">${cleanScore}%</text>
        <text x="107.5" y="14">${cleanScore}%</text>
    </g>
</svg>`;
};
export default generateSVG;
