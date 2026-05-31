
/**
 * Scan repository files for secrets, code anti-patterns, and vulnerable dependencies via OSV.dev.
 *
 * @param {Array} files - Array of parsed files: { path, content, language }
 * @returns {Promise<Array>} List of security findings: { severity, type, file, suggestion }
 */
export const runSecurityScan = async (files) => {
  const findings = [];

  // 1. Secrets Regex Scans & Code Anti-Patterns
  const secretRegexes = [
    {
      name: 'Private Key',
      regex: /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----/,
      severity: 'critical',
      suggestion: 'Remove private keys from source control immediately. Use an environment variable or secret manager.'
    },
    {
      name: 'AWS Client ID/Key',
      regex: /(?:AKIA[A-Z0-9]{16})|(?:aws_secret_access_key|aws_key|aws_secret)\s*[:=]\s*['"`]([a-zA-Z0-9+/]{40})['"`]/i,
      severity: 'critical',
      suggestion: 'Revoke the AWS credential and rotate your credentials immediately.'
    },
    {
      name: 'GitHub Token',
      regex: /ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}/,
      severity: 'critical',
      suggestion: 'Revoke the GitHub personal access token and use environment secrets instead.'
    },
    {
      name: 'Generic API Key/Secret',
      regex: /(?:api_key|apikey|db_password|client_secret|auth_token)\s*[:=]\s*['"`]([a-zA-Z0-9\-_+=]{16,})['"`]/i,
      severity: 'high',
      suggestion: 'Move API keys and secrets to environment files (.env) and add .env to .gitignore.'
    },
    {
      name: 'Slack Webhook URL',
      regex: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9_]{8}\/B[A-Z0-9_]{8}\/[A-Za-z0-9_]{24}/,
      severity: 'high',
      suggestion: 'Revoke the webhook URL and inject it via environment variables.'
    }
  ];

  const antiPatterns = [
    {
      name: 'Dangerous eval() usage',
      regex: /\beval\s*\(/,
      severity: 'high',
      suggestion: 'Avoid eval() due to arbitrary code execution risks. Refactor with JSON.parse or direct object mapping.'
    },
    {
      name: 'child_process.exec execution risk',
      regex: /\bexec\s*\(\s*[`'"]/,
      severity: 'medium',
      suggestion: 'Ensure inputs to exec() are fully sanitized to prevent command injection, or use execFile/spawn.'
    },
    {
      name: 'dangerouslySetInnerHTML usage',
      regex: /dangerouslySetInnerHTML/,
      severity: 'medium',
      suggestion: 'Using dangerouslySetInnerHTML risks Cross-Site Scripting (XSS). Sanitize HTML before inserting it.'
    },
    {
      name: 'Raw SQL string concatenation',
      regex: /SELECT\s+.+\s+FROM\s+.+\s+WHERE\s+.+\s*=\s*['"`]?\s*\+\s*\w+/i,
      severity: 'high',
      suggestion: 'Use parameterized queries or ORM pre-binding to prevent SQL Injection.'
    }
  ];

  for (const file of files) {
    if (!file.content) continue;

    // Scan for secrets
    for (const rule of secretRegexes) {
      if (rule.regex.test(file.content)) {
        findings.push({
          severity: rule.severity,
          type: 'secretLeak',
          file: file.path,
          suggestion: `Detected potential ${rule.name}. ${rule.suggestion}`
        });
      }
    }

    // Scan for anti-patterns
    for (const rule of antiPatterns) {
      if (rule.regex.test(file.content)) {
        findings.push({
          severity: rule.severity,
          type: 'codeAntiPattern',
          file: file.path,
          suggestion: `Detected ${rule.name}. ${rule.suggestion}`
        });
      }
    }
  }

  // 2. OSV.dev dependency scanner
  const packageJsonFile = files.find(f => f.path.endsWith('package.json'));
  if (packageJsonFile) {
    try {
      const packageJson = JSON.parse(packageJsonFile.content);
      const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
      };

      const queries = Object.entries(dependencies).map(([name, version]) => {
        // Clean semver prefix (e.g. ^1.2.3 -> 1.2.3)
        const cleanVersion = version.replace(/^[~^>=<]+/g, '');
        return {
          package: {
            name,
            ecosystem: 'npm'
          },
          version: cleanVersion
        };
      });

      if (queries.length > 0) {
        // OSV query batch API
        const response = await fetch('https://api.osv.dev/v1/querybatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queries })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.results) {
            data.results.forEach((result, idx) => {
              if (result.vulns && result.vulns.length > 0) {
                const pkg = queries[idx].package.name;
                const ver = queries[idx].version;
                result.vulns.forEach(vuln => {
                  let severity = 'low';
                  if (vuln.database_specific?.severity === 'CRITICAL' || vuln.database_specific?.cvss?.score >= 9) {
                    severity = 'critical';
                  } else if (vuln.database_specific?.severity === 'HIGH' || vuln.database_specific?.cvss?.score >= 7) {
                    severity = 'high';
                  } else if (vuln.database_specific?.severity === 'MODERATE' || vuln.database_specific?.cvss?.score >= 4) {
                    severity = 'medium';
                  }

                  findings.push({
                    severity,
                    type: 'cveVulnerability',
                    file: `package.json (${pkg}@${ver})`,
                    suggestion: `Dependency vulnerability ${vuln.id}: ${vuln.summary || 'Vulnerable package version'}. Upgrade ${pkg} to a secure version.`
                  });
                });
              }
            });
          }
        }
      }
    } catch (osvErr) {
      console.error('Error scanning with OSV.dev API:', osvErr.message);
    }
  }

  return findings;
};
