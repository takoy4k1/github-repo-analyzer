import { getEmbedding } from './aiService.js';
import CodeChunk from '../models/CodeChunk.js';

/**
 * Computes the dot product of two vectors.
 * Since OpenAI embeddings are normalized to unit length, this equals cosine similarity.
 * @param {Array<number>} vecA - First vector.
 * @param {Array<number>} vecB - Second vector.
 * @returns {number} Similarity score.
 */
const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
};

/**
 * Performs semantic similarity search on code chunks stored in the database.
 * @param {string} repositoryId - MongoDB ObjectId of the repository.
 * @param {string} queryText - The search query / user question.
 * @param {number} topK - Number of chunks to retrieve (default 5).
 * @returns {Promise<Array<object>>} Top matching chunks sorted by relevance.
 */
export const searchSimilarChunks = async (repositoryId, queryText, topK = 5) => {
  try {
    // Generate query embedding
    const queryEmbedding = await getEmbedding(queryText);

    // Retrieve all chunks for this repository from MongoDB
    const chunks = await CodeChunk.find({ repository: repositoryId });

    if (chunks.length === 0) {
      return [];
    }

    // If embedding is not available or mock (all zeros), we cannot compute similarity
    const isMock = !queryEmbedding || queryEmbedding.every(v => v === 0);

    if (isMock) {
      // Fallback: return the first topK chunks with a default score
      return chunks.slice(0, topK).map(chunk => ({
        _id: chunk._id,
        filePath: chunk.filePath,
        content: chunk.content,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        language: chunk.language,
        score: 1
      }));
    }

    // Map chunks and calculate cosine similarity scores
    const scoredChunks = chunks.map(chunk => {
      const chunkEmbedding = chunk.embedding && chunk.embedding.length > 0 ? chunk.embedding : new Array(1536).fill(0);
      const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
      return {
        _id: chunk._id,
        filePath: chunk.filePath,
        content: chunk.content,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        language: chunk.language,
        score
      };
    });

    // Sort chunks by score in descending order
    scoredChunks.sort((a, b) => b.score - a.score);

    // Return the top K matches
    return scoredChunks.slice(0, topK);
  } catch (error) {
    console.error('Error searching similar chunks:', error);
    throw new Error(`RAG search failed: ${error.message}`);
  }
};
