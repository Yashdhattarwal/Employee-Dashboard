import express from 'express';
import multer from 'multer';
import path from 'path';
import { createUser, getUsers, getTeamMembers, updateUserStatus, updateUser, updateProfile, getDashboardStats, getFinancialStats, deleteUser, getProfile } from '../controllers/userController.js';
import { protect, admin, manager } from '../middleware/authMiddleware.js';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${req.user ? req.user.id : Date.now()}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

const router = express.Router();

router.get('/stats', protect, getDashboardStats);
router.get('/financial-stats', protect, admin, getFinancialStats);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, upload.single('profilePhoto'), updateProfile);
router.route('/').post(protect, admin, upload.single('profilePhoto'), createUser).get(protect, admin, getUsers);
router.route('/team').get(protect, manager, getTeamMembers);
router.route('/:id/status').put(protect, admin, updateUserStatus);
router.route('/:id').put(protect, admin, upload.single('profilePhoto'), updateUser).delete(protect, admin, deleteUser);

export default router;
