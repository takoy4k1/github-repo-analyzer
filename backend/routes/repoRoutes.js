import express from 'express';
import { 
  getRepositories, 
  getRepositoryById, 
  analyzeRepository, 
  getFileExplanation, 
  deleteRepository,
  getRepoBadge,
  compareRepositories,
  getPRReviews,
  triggerPRReview,
  getSecurityReport,
  triggerSecurityScan
} from '../controllers/repoController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Public route (for embedding in READMEs)
router.get('/badge/:id', getRepoBadge);

router.use(auth); // Secure all routes below this line

router.get('/', getRepositories);
router.get('/compare', compareRepositories);
router.get('/:id', getRepositoryById);
router.post('/analyze', analyzeRepository);
router.post('/explain-file', getFileExplanation);
router.delete('/:id', deleteRepository);

// PR Reviewer
router.get('/:id/pr-reviews', getPRReviews);
router.post('/:id/pr-reviews', triggerPRReview);

// Security Scan
router.get('/:id/security', getSecurityReport);
router.post('/:id/security', triggerSecurityScan);

export default router;
