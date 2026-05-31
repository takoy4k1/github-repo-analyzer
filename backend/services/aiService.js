import dotenv from "dotenv";

dotenv.config();

/* =========================
   Clients
========================= */
const GROK_BASE_URL = "https://api.groq.com/openai/v1";
const OPENAI_BASE_URL = "https://api.openai.com/v1";

const hasGrokKey   = () => !!process.env.XAI_API_KEY?.trim();
const hasOpenAIKey = () => !!process.env.OPENAI_API_KEY?.trim();
const hasAnthropicKey = () => !!process.env.ANTHROPIC_API_KEY?.trim();

const grokHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.XAI_API_KEY}`,
});

const openaiHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
});

const anthropicGenerate = async (prompt, json = false) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        if (status === 429 && attempt < 3) {
          const delay = attempt * 2000;
          await sleep(delay);
          continue;
        }
        throw Object.assign(
          new Error(err.error?.message ?? "Anthropic API error"),
          { status }
        );
      }

      const data = await response.json();
      const text = data.content?.[0]?.text ?? "";
      if (json) return parseJsonResponse(text);
      return text;
    } catch (err) {
      if (err.status === 429 && attempt < 3) {
        const delay = attempt * 2000;
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
};

/* =========================
   Helpers
========================= */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanText = (text = "") => text.replace(/\n/g, " ").trim();

const parseJsonResponse = (text) => {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(cleaned);
};

const shouldSkipContent = (text) => {
  if (!text || text.trim().length < 5) return true;
  if (/^\/\/ Empty file:/i.test(text.trim())) return true;
  if (/^# Empty file:/i.test(text.trim())) return true;
  return false;
};

/* =========================
   Embeddings
   Uses OpenAI's text-embedding-3-small (1536-dim) when
   OPENAI_API_KEY is set. Add it to your .env:
     OPENAI_API_KEY=sk-...
   Returns null for skippable content so the caller can
   decide whether to skip saving that chunk entirely.
========================= */
export const getEmbedding = async (text) => {
  const cleanedText = cleanText(text);

  if (shouldSkipContent(cleanedText)) {
    console.log("Skipping embedding: empty or placeholder content. Returning mock embedding.");
    return new Array(1536).fill(0);
  }

  if (!hasOpenAIKey()) {
    console.warn(
      "No OPENAI_API_KEY found. Returning mock embedding. " +
        "Add OPENAI_API_KEY to your .env to enable semantic search."
    );
    return new Array(1536).fill(0);
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
        method: "POST",
        headers: openaiHeaders(),
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: cleanedText,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        if (status === 429 && attempt < 3) {
          const delay = attempt * 2000;
          console.log(`Rate limited (embeddings). Retrying in ${delay / 1000}s... (attempt ${attempt}/3)`);
          await sleep(delay);
          continue;
        }
        throw Object.assign(
          new Error(err.error?.message ?? "OpenAI embeddings error"),
          { status }
        );
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (err) {
      if (err.status === 429 && attempt < 3) {
        const delay = attempt * 2000;
        console.log(`Rate limited (embeddings). Retrying in ${delay / 1000}s... (attempt ${attempt}/3)`);
        await sleep(delay);
      } else {
        console.error("Embedding failed:", err.message);
        throw err;
      }
    }
  }
};

/* =========================
   Generate (with retry)
========================= */
const grokGenerate = async (prompt, json = false) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${GROK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: grokHeaders(),
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          ...(json && { response_format: { type: "json_object" } }),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        if (status === 429 && attempt < 3) {
          const delay = attempt * 2000;
          console.log(`Rate limited. Retrying in ${delay / 1000}s... (attempt ${attempt}/3)`);
          await sleep(delay);
          continue;
        }
        throw Object.assign(
          new Error(err.error?.message ?? "Grok API error"),
          { status }
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      if (json) return parseJsonResponse(text);
      return text;
    } catch (err) {
      if (err.status === 429 && attempt < 3) {
        const delay = attempt * 2000;
        console.log(`Rate limited. Retrying in ${delay / 1000}s... (attempt ${attempt}/3)`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
};

/* =========================
   Summary
========================= */
export const generateSummary = async (
  repoName,
  fileStructure,
  readmeText,
  topFilesContent
) => {
  if (!hasAnthropicKey() && !hasGrokKey()) {
    return getMockSummary(repoName);
  }

  const prompt = `
Analyze repository.

REPOSITORY:
${repoName}

FILES:
${fileStructure}

README:
${readmeText || "None"}

CORE FILES:
${topFilesContent}

Return JSON with exact keys:
{
 "overview": "string",
 "architecture": "string",
 "techStack": ["array"],
 "modules": [{"name":"string","purpose":"string"}],
 "onboarding": "string",
 "scalability": "string",
 "codeQuality": "string",
 "improvements": "string",
 "diagram": "raw mermaid string"
}

Mermaid diagram guidelines:
- Use standard flowchart structure (e.g. "graph TD" or "graph LR").
- Do NOT use semicolons at the end of lines.
- Always quote node labels using double quotes if they contain spaces, dots, slashes, or special characters. For example, use: A["main.py"] or B["Alpha Vantage API"] instead of A(main.py) or B(Alpha Vantage API).
`;

  try {
    if (hasAnthropicKey()) {
      return await anthropicGenerate(prompt, true);
    }
    return await grokGenerate(prompt, true);
  } catch (err) {
    console.error("Summary failed:", err.message);
    return getMockSummary(repoName);
  }
};

/* =========================
   Explain file
========================= */
export const generateFileExplanation = async (filePath, fileContent) => {
  if (!hasGrokKey()) {
    return `### AI Explanation (Offline Mode)\n- File: \`${filePath}\`\nAdd an XAI_API_KEY to unlock AI analysis.`;
  }

  const prompt = `
Explain this file:

${filePath}

${fileContent}

Include:
- purpose
- major functions
- dependencies
- architecture role
`;

  try {
    return await grokGenerate(prompt);
  } catch (err) {
    throw new Error(`File explanation failed: ${err.message}`);
  }
};

/* =========================
   Chat answer
========================= */
export const generateChatAnswer = async (question, retrievedChunks) => {
  if (!hasGrokKey()) {
    return "Please configure XAI_API_KEY in your .env file.";
  }

  const context = retrievedChunks
    .map((chunk, i) => `[Source ${i + 1}] ${chunk.filePath}\n${chunk.content}`)
    .join("\n\n");

  const prompt = `
Answer ONLY from repository context.

Cite source files like [Source 1].

Context:
${context}

Question:
${question}
`;

  try {
    return await grokGenerate(prompt);
  } catch (err) {
    throw new Error(`Chat failed: ${err.message}`);
  }
};

/* =========================
   Mock fallback
========================= */
const getMockSummary = (repoName) => ({
  overview: `Mock overview for ${repoName}`,
  architecture: "Client-server",
  techStack: ["Node.js", "React"],
  modules: [],
  onboarding: "npm install",
  scalability: "Stateless",
  codeQuality: "Readable",
  improvements: "Add tests",
  diagram: "",
});

/* =========================
   PR Reviewer
========================= */
export const generatePRReview = async (prNumber, diffContent) => {
  if (!hasAnthropicKey() && !hasGrokKey()) {
    return getMockPRReview(prNumber);
  }

  const prompt = `
Analyze the following pull request diff for PR #${prNumber} and generate a structured review.
Identify potential bugs, security issues, code quality issues, missing tests, or dependency concerns.

DIFF:
${diffContent.slice(0, 12000)}

Return JSON with exact keys:
{
  "aiSummary": "A concise summary of changes and overall review of the PR.",
  "flaggedIssues": [
    {
      "type": "missingTest | largeDiff | dependencyBump | bug | security | style",
      "file": "path/to/file",
      "message": "Specific issue description and location/context.",
      "severity": "warning | info | critical"
    }
  ]
}
`;

  try {
    if (hasAnthropicKey()) {
      return await anthropicGenerate(prompt, true);
    }
    return await grokGenerate(prompt, true);
  } catch (err) {
    console.error("PR review generation failed, falling back to mock:", err.message);
    return getMockPRReview(prNumber);
  }
};

const getMockPRReview = (prNumber) => ({
  aiSummary: `Mock AI review for PR #${prNumber}. The changes look solid, focusing on port updates and health check integration. No critical issues detected.`,
  flaggedIssues: [
    {
      type: 'info',
      file: 'backend/server.js',
      message: 'Changed default port to 5002. Ensure your docker-compose or environment setup is aligned.',
      severity: 'info'
    },
    {
      type: 'missingTest',
      file: 'backend/server.js',
      message: 'Added health check endpoint but no corresponding unit tests were detected in this diff.',
      severity: 'warning'
    }
  ]
});