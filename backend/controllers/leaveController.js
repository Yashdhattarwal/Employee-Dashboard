import Leave from '../models/Leave.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';

export const applyLeave = async (req, res) => {
  try {
    const { type, fromDate, toDate, reason } = req.body;

    // Senior Requirement: Limit Sick Leave to same day and next day
    if (type === 'Sick Leave') {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toLocaleDateString('en-CA');

      const requestedFromStr = fromDate.split('T')[0];

      if (requestedFromStr !== todayStr && requestedFromStr !== tomorrowStr) {
        return res.status(400).json({ 
          message: 'Sick Leave can only be applied for today or tomorrow.' 
        });
      }
    }

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
        const startStr = typeof leave.fromDate === 'string' ? leave.fromDate.split('T')[0] : new Date(leave.fromDate).toISOString().split('T')[0];
        const endStr = typeof leave.toDate === 'string' ? leave.toDate.split('T')[0] : new Date(leave.toDate).toISOString().split('T')[0];

        const start = new Date(startStr + 'T00:00:00Z');
        const end = new Date(endStr + 'T00:00:00Z');
        
        const current = new Date(start);
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          
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
          current.setUTCDate(current.getUTCDate() + 1);
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
