import express from 'express';
import { queryDashMind } from '../controllers/dashmindController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/query', protect, queryDashMind);

export default router;
