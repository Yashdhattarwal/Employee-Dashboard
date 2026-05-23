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
  updateCorrectionStatus,
  tempCleanupDatabase
} from '../controllers/attendanceController.js';
import { protect, admin, manager } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads/eod');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
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
router.get('/temp-cleanup', tempCleanupDatabase);

export default router;
