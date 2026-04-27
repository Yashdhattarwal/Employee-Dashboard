import { Ticket, Comment } from '../models/Ticket.js';
import User from '../models/User.js';
import { Op } from 'sequelize';

export const createTicket = async (req, res) => {
  try {
    const { subject, description, priority } = req.body;
    const user = await User.findByPk(req.user.id);

    const ticket = await Ticket.create({
      userId: req.user.id,
      assignedTo: user.managerId,
      subject,
      description,
      priority,
    });

    res.status(201).json({ ...ticket.toJSON(), _id: ticket.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ 
      where: { userId: req.user.id },
      include: [
        { model: User, as: 'user', attributes: ['name'] },
        { model: Comment, as: 'comments', include: [{ model: User, as: 'user', attributes: ['name'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });
    const mapped = tickets.map(t => ({ ...t.toJSON(), _id: t.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamTickets = async (req, res) => {
  try {
    const subordinates = await User.findAll({ where: { managerId: req.user.id } });
    const subordinateIds = subordinates.map(u => u.id);

    const tickets = await Ticket.findAll({ 
      where: {
        [Op.or]: [
          { assignedTo: req.user.id },
          { userId: { [Op.in]: subordinateIds } }
        ]
      },
      include: [
        { model: User, as: 'user', attributes: ['name'] },
        { model: Comment, as: 'comments', include: [{ model: User, as: 'user', attributes: ['name'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });
    const mapped = tickets.map(t => ({ ...t.toJSON(), _id: t.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      include: [
        { model: User, as: 'user', attributes: ['name'] },
        { model: User, as: 'assignee', attributes: ['name'] },
        { model: Comment, as: 'comments', include: [{ model: User, as: 'user', attributes: ['name'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });
    const mapped = tickets.map(t => ({ ...t.toJSON(), _id: t.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findByPk(req.params.id);

    if (ticket) {
      ticket.status = status;
      await ticket.save();
      
      // Auto comment
      await Comment.create({
        ticketId: ticket.id,
        userId: req.user.id,
        text: `Status updated to ${status} by ${req.user.name}`
      });

      res.json({ ...ticket.toJSON(), _id: ticket.id });
    } else {
      res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const ticket = await Ticket.findByPk(req.params.id);

    if (ticket) {
      const comment = await Comment.create({
        ticketId: ticket.id,
        userId: req.user.id,
        text,
      });
      // reload ticket to include comments and user info
      const updatedTicket = await Ticket.findByPk(ticket.id, {
        include: [
          { model: User, as: 'user', attributes: ['name'] },
          { model: Comment, as: 'comments', include: [{ model: User, as: 'user', attributes: ['name'] }] }
        ]
      });
      res.json({ ...updatedTicket.toJSON(), _id: updatedTicket.id });
    } else {
      res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const escalateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);

    if (ticket) {
      ticket.status = 'Escalated';
      const adminUser = await User.findOne({ where: { role: 'admin' } });
      if (adminUser) {
        ticket.assignedTo = adminUser.id;
      }
      await ticket.save();

      // Auto comment
      await Comment.create({
        ticketId: ticket.id,
        userId: req.user.id,
        text: `Ticket escalated to Admin by ${req.user.name}`
      });

      res.json({ ...ticket.toJSON(), _id: ticket.id });
    } else {
      res.status(404).json({ message: 'Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
