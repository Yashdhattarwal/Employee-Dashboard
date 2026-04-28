import express from 'express';
import {
  getMyAttendance,
  getTeamAttendance,
  getAllAttendance,
  markAttendance,
  selfAttendanceAction,
  getAttendanceStatus,
  deleteAttendance,
  createCorrection,
  getCorrections,
  updateCorrectionStatus
} from '../controllers/attendanceController.js';
import { protect, admin, manager } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/my').get(protect, getMyAttendance);
router.get('/status', protect, getAttendanceStatus);
router.post('/action', protect, selfAttendanceAction);
router.route('/team').get(protect, manager, getTeamAttendance);
router.route('/all').get(protect, admin, getAllAttendance);
router.route('/').post(protect, admin, markAttendance);
router.route('/corrections').post(protect, manager, createCorrection).get(protect, getCorrections);
router.put('/corrections/:id', protect, admin, updateCorrectionStatus);
router.route('/:id').delete(protect, admin, deleteAttendance);

export default router;
