import express from 'express';
import { loginUser, logoutUser, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/change-password', protect, changePassword);

export default router;
