import ChatSession from '../models/ChatSession.js';
import Repository from '../models/Repository.js';
import { searchSimilarChunks } from '../services/ragService.js';
import { generateChatAnswer } from '../services/aiService.js';

export const createChatSession = async (req, res) => {
  const { repositoryId, title } = req.body;

  try {
    const repo = await Repository.findOne({ _id: repositoryId, user: req.user.id });
    if (!repo) {
      return res.status(404).json({ message: 'Repository not found' });
    }

    const session = await ChatSession.create({
      user: req.user.id,
      repository: repositoryId,
      title: title || `Chat about ${repo.name}`,
      messages: []
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getChatSessions = async (req, res) => {
  const { repositoryId } = req.query;

  try {
    const query = { user: req.user.id };
    if (repositoryId) {
      query.repository = repositoryId;
    }

    const sessions = await ChatSession.find(query)
      .select('title repository createdAt updatedAt')
      .populate('repository', 'name owner')
      .sort({ updatedAt: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getChatSessionById = async (req, res) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, user: req.user.id })
      .populate('repository', 'name owner url');
      
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  const { content } = req.body;
  const sessionId = req.params.id;

  if (!content) {
    return res.status(400).json({ message: 'Message content is required' });
  }

  try {
    const session = await ChatSession.findOne({ _id: sessionId, user: req.user.id });
    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' });
    }

    // Step 1: Perform similarity search over repo chunks
    const retrievedChunks = await searchSimilarChunks(session.repository, content, 5);

    // Step 2: Query AI model using RAG prompt
    let aiResponse = '';
    try {
      aiResponse = await generateChatAnswer(content, retrievedChunks);
    } catch (aiErr) {
      console.error('AI chat answer failed:', aiErr.message);
      aiResponse = `⚠️ **AI Answer Failed:** ${aiErr.message}\n\nPlease check your \`XAI_API_KEY\` configuration in the backend \`.env\` file.`;
    }

    // Step 3: Map citations for front-end rendering
    const citations = retrievedChunks.map(chunk => ({
      filePath: chunk.filePath,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      content: chunk.content
    }));

    // Step 4: Save messages to the chat history
    session.messages.push({
      role: 'user',
      content
    });

    session.messages.push({
      role: 'assistant',
      content: aiResponse,
      citations
    });

    await session.save();

    // Return the response containing the assistant's message
    const assistantMessage = session.messages[session.messages.length - 1];
    res.status(201).json(assistantMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
