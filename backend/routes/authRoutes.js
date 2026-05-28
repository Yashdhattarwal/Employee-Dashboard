import express from 'express';
import { loginUser, logoutUser, changePassword, endSession } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.post('/session-end', protect, endSession);
router.post('/change-password', protect, changePassword);

export default router;
