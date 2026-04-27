import express from 'express';
import { sendNotification, getMyNotifications, markAsRead, acknowledgeNotification, getSentNotifications, getNotificationStats } from '../controllers/notificationController.js';
import { protect, manager } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getMyNotifications).post(protect, manager, sendNotification);
router.route('/sent').get(protect, manager, getSentNotifications);
router.route('/:id/read').put(protect, markAsRead);
router.route('/:id/acknowledge').post(protect, acknowledgeNotification);
router.route('/:id/stats').get(protect, manager, getNotificationStats);

export default router;
