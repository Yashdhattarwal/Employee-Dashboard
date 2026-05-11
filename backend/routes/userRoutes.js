import express from 'express';
import { createUser, getUsers, getTeamMembers, updateUserStatus, updateUser, getDashboardStats, getFinancialStats, deleteUser } from '../controllers/userController.js';
import { protect, admin, manager } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.get('/financial-stats', protect, admin, getFinancialStats);
router.route('/').post(protect, admin, createUser).get(protect, admin, getUsers);
router.route('/team').get(protect, manager, getTeamMembers);
router.route('/:id/status').put(protect, admin, updateUserStatus);
router.route('/:id').put(protect, admin, updateUser).delete(protect, admin, deleteUser);

export default router;
