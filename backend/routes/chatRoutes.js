import express from 'express';
import { 
  createChatSession, 
  getChatSessions, 
  getChatSessionById, 
  sendMessage 
} from '../controllers/chatController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.use(auth); // Secure all chat routes

router.post('/', createChatSession);
router.get('/', getChatSessions);
router.get('/:id', getChatSessionById);
router.post('/:id/message', sendMessage);

export default router;
