import fs from 'fs-extra';
import path from 'path';

// Set of directories to ignore
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  'out',
  'venv',
  'env',
  '.idea',
  '.vscode',
  'tmp',
  'temp',
  'bower_components',
  '.serverless',
  '.docker'
]);

// Set of file names or extensions to ignore
const IGNORED_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  '.DS_Store',
  'thumbs.db'
]);

const IGNORED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.bmp', '.tiff', // Images
  '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z', // Documents / Archives
  '.mp4', '.mov', '.avi', '.mkv', '.webm', // Video
  '.mp3', '.wav', '.flac', '.ogg', // Audio
  '.woff', '.woff2', '.ttf', '.eot', // Fonts
  '.exe', '.dll', '.so', '.dylib', '.bin' // Binaries
]);

// Helper to check if a file is binary
const isBinaryFile = (filePath, contentBuffer) => {
  // Simple check: see if there are null bytes in the first few kilobytes
  const size = Math.min(contentBuffer.length, 8000);
  for (let i = 0; i < size; i++) {
    if (contentBuffer[i] === 0) {
      return true;
    }
  }
  return false;
};

// Map extensions to readable language names
const getLanguageFromExtension = (ext) => {
  const mapping = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.c': 'c',
    '.h': 'cpp',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.html': 'html',
    '.css': 'css',
    '.sh': 'shell',
    '.md': 'markdown',
    '.json': 'json',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.toml': 'toml',
    '.sql': 'sql',
    '.graphql': 'graphql',
    '.dockerfile': 'dockerfile',
    'dockerfile': 'dockerfile'
  };
  return mapping[ext.toLowerCase()] || 'text';
};

/**
 * Parses the repository directory and generates tree structure, metrics, and text files.
 * @param {string} dirPath - The root directory of the cloned repo.
 * @param {string} relativeRoot - The current relative path (starts empty).
 * @returns {Promise<{ fileTree: object, files: Array<{path: string, content: string, lines: number, language: string}>, metrics: object }>}
 */
export const parseRepository = async (dirPath, relativeRoot = '') => {
  const result = {
    fileTree: {
      name: relativeRoot || path.basename(dirPath),
      type: 'directory',
      path: relativeRoot || '.',
      children: []
    },
    files: [], // Array of readable source files
    metrics: {
      totalFiles: 0,
      totalLines: 0,
      languages: {}
    }
  };

  const traverse = async (currentDir, currentRelative, treeNode) => {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    // Separate directories and files to list directories first (standard file explorer behavior)
    const dirs = [];
    const files = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          dirs.push(entry);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (!IGNORED_FILES.has(entry.name) && !IGNORED_EXTENSIONS.has(ext)) {
          files.push(entry);
        }
      }
    }

    // Process directories
    for (const dir of dirs) {
      const fullPath = path.join(currentDir, dir.name);
      const relPath = currentRelative ? `${currentRelative}/${dir.name}` : dir.name;
      const childNode = {
        name: dir.name,
        type: 'directory',
        path: relPath,
        children: []
      };
      
      treeNode.children.push(childNode);
      await traverse(fullPath, relPath, childNode);
    }

    // Process files
    for (const file of files) {
      const fullPath = path.join(currentDir, file.name);
      const relPath = currentRelative ? `${currentRelative}/${file.name}` : file.name;
      const ext = path.extname(file.name);
      
      try {
        const buffer = await fs.readFile(fullPath);
        
        // Skip binary files
        if (isBinaryFile(fullPath, buffer)) {
          continue;
        }

        const content = buffer.toString('utf-8');
        const linesCount = content.split('\n').length;
        const language = getLanguageFromExtension(ext || file.name);

        // Add to files list
        result.files.push({
          path: relPath,
          content,
          lines: linesCount,
          language
        });

        // Add to tree
        treeNode.children.push({
          name: file.name,
          type: 'file',
          path: relPath,
          lines: linesCount,
          language
        });

        // Update metrics
        result.metrics.totalFiles += 1;
        result.metrics.totalLines += linesCount;
        result.metrics.languages[language] = (result.metrics.languages[language] || 0) + linesCount;

      } catch (err) {
        console.error(`Error reading file ${fullPath}:`, err.message);
      }
    }
  };

  await traverse(dirPath, relativeRoot, result.fileTree);
  return result;
};

/**
 * Chunks a file's content into overlapping chunks of lines.
 * @param {string} filePath - Path of the file.
 * @param {string} content - Full text content.
 * @param {string} language - File language.
 * @param {number} maxLinesPerChunk - Max lines in a single chunk.
 * @param {number} overlapLines - Overlap lines.
 * @returns {Array<{filePath: string, content: string, startLine: number, endLine: number, language: string}>}
 */
export const chunkFile = (filePath, content, language, maxLinesPerChunk = 60, overlapLines = 15) => {
  const lines = content.split('\n');
  const chunks = [];

  if (lines.length <= maxLinesPerChunk) {
    // Small file: single chunk
    chunks.push({
      filePath,
      content,
      startLine: 1,
      endLine: lines.length,
      language
    });
    return chunks;
  }

  let start = 0;
  while (start < lines.length) {
    const end = Math.min(start + maxLinesPerChunk, lines.length);
    const chunkLines = lines.slice(start, end);
    
    // Prefix each chunk with a small file context line
    const chunkContent = `// File: ${filePath} (Lines ${start + 1}-${end})\n` + chunkLines.join('\n');
    
    chunks.push({
      filePath,
      content: chunkContent,
      startLine: start + 1,
      endLine: end,
      language
    });

    start += (maxLinesPerChunk - overlapLines);
  }

  return chunks;
};
