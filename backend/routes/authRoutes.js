import express from 'express';
import { 
  githubAuth, 
  githubCallback,
  exchangeOAuthCode,
  disconnectGitHub,
  refreshSession, 
  getMe, 
  updateSettings,
  register,
  login
} from '../controllers/authController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);
router.post('/github/exchange', exchangeOAuthCode);   // Called by frontend callback page
router.delete('/github/disconnect', auth, disconnectGitHub); // Requires JWT auth
router.post('/refresh', refreshSession);
router.get('/me', auth, getMe);
router.put('/settings', auth, updateSettings);

export default router;
