import express from 'express';
import { uploadExpense, getMyExpenses, getAllExpenses, approveExpense, rejectExpense } from '../controllers/expenseController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/expenses');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

router.post('/', protect, upload.single('invoice'), uploadExpense);
router.get('/my', protect, getMyExpenses);
router.get('/', protect, admin, getAllExpenses);
router.put('/:id/approve', protect, admin, approveExpense);
router.put('/:id/reject', protect, admin, rejectExpense);

export default router;
