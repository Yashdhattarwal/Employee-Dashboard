import { Ticket, Comment } from '../models/Ticket.js';
import User from '../models/User.js';
import { Op } from 'sequelize';

export const createTicket = async (req, res) => {
  try {
    const { subject, description, priority, assignedTo, cc } = req.body;
    const user = await User.findByPk(req.user.id);

    let finalAssignee = assignedTo;
    if (!finalAssignee) {
      if (user.managerId) {
        finalAssignee = user.managerId;
      } else {
        const firstAdmin = await User.findOne({ where: { role: 'admin' } });
        if (firstAdmin) {
          finalAssignee = firstAdmin.id;
        }
      }
    }

    const ticket = await Ticket.create({
      userId: req.user.id,
      assignedTo: finalAssignee,
      cc: cc || '',
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
    const userIdStr = String(req.user.id);
    const tickets = await Ticket.findAll({ 
      include: [
        { model: User, as: 'user', attributes: ['name', 'email'] },
        { model: User, as: 'assignee', attributes: ['name', 'email'] },
        { model: Comment, as: 'comments', include: [{ model: User, as: 'user', attributes: ['name'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Highly robust JavaScript filtering to handle SQLite/Postgres CC lists cleanly
    const filtered = tickets.filter(t => {
      if (t.userId === req.user.id) return true;
      if (t.assignedTo === req.user.id) return true;
      if (t.cc) {
        const ccIds = t.cc.split(',').map(s => s.trim());
        if (ccIds.includes(userIdStr)) return true;
      }
      return false;
    });

    const mapped = filtered.map(t => ({ ...t.toJSON(), _id: t.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamTickets = async (req, res) => {
  try {
    const userIdStr = String(req.user.id);
    const subordinates = await User.findAll({ where: { managerId: req.user.id } });
    const subordinateIds = subordinates.map(u => u.id);

    const tickets = await Ticket.findAll({ 
      where: { hiddenFromManager: false },
      include: [
        { model: User, as: 'user', attributes: ['name', 'email'] },
        { model: User, as: 'assignee', attributes: ['name', 'email'] },
        { model: Comment, as: 'comments', include: [{ model: User, as: 'user', attributes: ['name'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Highly robust JavaScript filtering for managers & TLs with full CC visibility
    const filtered = tickets.filter(t => {
      if (t.assignedTo === req.user.id) return true;
      if (t.userId === req.user.id) return true;
      if (subordinateIds.includes(t.userId)) return true;
      if (t.cc) {
        const ccIds = t.cc.split(',').map(s => s.trim());
        if (ccIds.includes(userIdStr)) return true;
      }
      return false;
    });

    const mapped = filtered.map(t => ({ ...t.toJSON(), _id: t.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      include: [
        { model: User, as: 'user', attributes: ['name', 'email'] },
        { model: User, as: 'assignee', attributes: ['name', 'email'] },
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
      // Check permissions: Admin, Manager, or the Ticket Owner
      const isOwner = ticket.userId === req.user.id;
      const isManagerOrAdmin = req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'teamlead';
      
      if (!isOwner && !isManagerOrAdmin) {
        return res.status(403).json({ message: 'You do not have permission to update this ticket status' });
      }

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

      if (req.user.role === 'admin' && ticket.status === 'Escalated') {
        ticket.hiddenFromManager = true;
        await ticket.save();
      }
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

export const getTicketAssignees = async (req, res) => {
  try {
    const currentUser = await User.findByPk(req.user.id);
    
    // 1. Get all admins
    const admins = await User.findAll({ 
      where: { role: 'admin' }, 
      attributes: ['id', 'name', 'role', 'email'] 
    });

    // 2. Get the user's manager/TL (if any)
    let managers = [];
    if (currentUser.managerId) {
      const mgr = await User.findByPk(currentUser.managerId, {
        attributes: ['id', 'name', 'role', 'email']
      });
      if (mgr) {
        managers.push(mgr);
      }
    }

    // 3. If the user is a manager or team lead, get all their team members (subordinates)
    let team = [];
    if (currentUser.role === 'manager' || currentUser.role === 'teamlead' || currentUser.role === 'admin') {
      const condition = currentUser.role === 'admin' ? {} : { managerId: currentUser.id };
      team = await User.findAll({
        where: condition,
        attributes: ['id', 'name', 'role', 'email']
      });
    }

    // Combine and deduplicate
    const allUsersMap = {};
    admins.forEach(u => { allUsersMap[u.id] = u.toJSON(); });
    managers.forEach(u => { allUsersMap[u.id] = u.toJSON(); });
    team.forEach(u => { allUsersMap[u.id] = u.toJSON(); });

    // Remove self from candidates
    delete allUsersMap[req.user.id];

    const candidates = Object.values(allUsersMap).map(u => ({ ...u, _id: u.id }));
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
