import express from 'express';
import {
  createTicket,
  getMyTickets,
  getTeamTickets,
  getAllTickets,
  updateTicketStatus,
  addComment,
  escalateTicket,
  getTicketAssignees,
} from '../controllers/ticketController.js';
import { protect, admin, manager } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/assignees').get(protect, getTicketAssignees);

router.route('/').post(protect, createTicket);
router.route('/my').get(protect, getMyTickets);
router.route('/team').get(protect, manager, getTeamTickets);
router.route('/all').get(protect, admin, getAllTickets);

router.route('/:id/status').put(protect, updateTicketStatus);
router.route('/:id/comments').post(protect, addComment);
router.route('/:id/escalate').put(protect, manager, escalateTicket);

export default router;
