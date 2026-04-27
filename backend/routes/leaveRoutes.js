import express from 'express';
import {
  applyLeave,
  getMyLeaves,
  getTeamLeaves,
  getAllLeaves,
  updateLeaveStatus,
} from '../controllers/leaveController.js';
import { protect, admin, manager } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, applyLeave);
router.route('/my').get(protect, getMyLeaves);
router.route('/team').get(protect, manager, getTeamLeaves);
router.route('/all').get(protect, admin, getAllLeaves);
router.route('/:id/status').put(protect, manager, updateLeaveStatus);

export default router;
