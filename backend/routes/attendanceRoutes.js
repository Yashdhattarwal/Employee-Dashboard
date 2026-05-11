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
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/eod/');
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

const router = express.Router();

router.route('/my').get(protect, getMyAttendance);
router.get('/status', protect, getAttendanceStatus);
router.post('/action', protect, upload.single('eodAttachment'), selfAttendanceAction);
router.route('/team').get(protect, manager, getTeamAttendance);
router.route('/all').get(protect, admin, getAllAttendance);
router.route('/').post(protect, admin, markAttendance);
router.route('/corrections').post(protect, manager, createCorrection).get(protect, getCorrections);
router.put('/corrections/:id', protect, admin, updateCorrectionStatus);
router.route('/:id').delete(protect, admin, deleteAttendance);

export default router;
