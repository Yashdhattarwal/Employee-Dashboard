import express from 'express';
import { 
  sendHeartbeat, 
  getLiveMonitoring, 
  getDetailedAnalytics, 
  getDeviceStats, 
  exportProductivityReports 
} from '../controllers/productivityController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Clocked-in users heartbeat
router.post('/heartbeat', protect, sendHeartbeat);

// Strict Admin-only endpoints
router.get('/live', protect, admin, getLiveMonitoring);
router.get('/analytics/:userId', protect, admin, getDetailedAnalytics);
router.get('/devices', protect, admin, getDeviceStats);
router.get('/export', protect, admin, exportProductivityReports);

export default router;
