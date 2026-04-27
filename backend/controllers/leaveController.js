import Leave from '../models/Leave.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';

export const applyLeave = async (req, res) => {
  try {
    const { type, fromDate, toDate, reason } = req.body;
    const user = await User.findByPk(req.user.id);

    const leave = await Leave.create({
      userId: req.user.id,
      managerId: user.managerId,
      type,
      fromDate,
      toDate,
      reason,
    });

    res.status(201).json({ ...leave.toJSON(), _id: leave.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.findAll({ 
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    const mapped = leaves.map(l => ({ ...l.toJSON(), _id: l.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamLeaves = async (req, res) => {
  try {
    const leaves = await Leave.findAll({ 
      where: { managerId: req.user.id },
      include: [{ model: User, as: 'user', attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });
    const mapped = leaves.map(l => ({ ...l.toJSON(), _id: l.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.findAll({
      include: [{ model: User, as: 'user', attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });
    const mapped = leaves.map(l => ({ ...l.toJSON(), _id: l.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const leave = await Leave.findByPk(req.params.id);

    if (leave) {
      leave.status = status;
      await leave.save();

      // Sync with Attendance if Approved
      if (status === 'Approved') {
        const start = new Date(leave.fromDate);
        const end = new Date(leave.toDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toLocaleDateString('en-CA');
          
          // Use findOne and update/create to ensure sync
          const existing = await Attendance.findOne({ where: { userId: leave.userId, date: dateStr } });
          if (existing) {
            existing.status = 'On Leave';
            existing.remarks = `Approved ${leave.type} Leave`;
            await existing.save();
          } else {
            await Attendance.create({
              userId: leave.userId,
              date: dateStr,
              status: 'On Leave',
              remarks: `Approved ${leave.type} Leave`
            });
          }
        }
      }

      res.json({ ...leave.toJSON(), _id: leave.id });
    } else {
      res.status(404).json({ message: 'Leave not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
