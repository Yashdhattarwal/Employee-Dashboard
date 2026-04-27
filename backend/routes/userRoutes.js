import express from 'express';
import { createUser, getUsers, getTeamMembers, updateUserStatus, getDashboardStats, deleteUser } from '../controllers/userController.js';
import { protect, admin, manager } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.route('/').post(protect, admin, createUser).get(protect, admin, getUsers);
router.route('/team').get(protect, manager, getTeamMembers);
router.route('/:id/status').put(protect, admin, updateUserStatus);
router.route('/:id').delete(protect, admin, deleteUser);

export default router;
