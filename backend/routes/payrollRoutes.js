import express from 'express';
import {
  generatePayroll,
  getPayrolls,
  updatePayroll,
  getMyPayrolls
} from '../controllers/payrollController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, admin, getPayrolls)
  .post(protect, admin, generatePayroll);

router.route('/my')
  .get(protect, getMyPayrolls);

router.route('/:id')
  .put(protect, admin, updatePayroll);

export default router;
