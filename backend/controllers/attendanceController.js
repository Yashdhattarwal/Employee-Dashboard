import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import AttendanceCorrection from '../models/AttendanceCorrection.js';
import { Op } from 'sequelize';

export const getMyAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findAll({ 
      where: { userId: req.user.id },
      order: [['date', 'DESC']]
    });
    const mapped = attendance.map(a => ({ ...a.toJSON(), _id: a.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamAttendance = async (req, res) => {
  try {
    const teamMembers = await User.findAll({ where: { managerId: req.user.id }, attributes: ['id'] });
    const teamIds = teamMembers.map(m => m.id);
    teamIds.push(req.user.id);

    const attendance = await Attendance.findAll({
      where: { userId: { [Op.in]: teamIds } },
      include: [{ model: User, as: 'user', attributes: ['name'] }],
      order: [['date', 'DESC']]
    });
    const mapped = attendance.map(a => ({ ...a.toJSON(), _id: a.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findAll({
      include: [{ model: User, as: 'user', attributes: ['name'] }],
      order: [['date', 'DESC']]
    });
    const mapped = attendance.map(a => ({ ...a.toJSON(), _id: a.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const { userId, date, status, checkIn, checkOut, remarks } = req.body;
    console.log('Marking Attendance Request:', { userId, date, status });

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (req.user.role === 'manager' && userId.toString() === req.user.id.toString()) {
       return res.status(403).json({ message: 'Managers cannot mark their own attendance via Team Management' });
    }

    // Use the date string directly if it's already in the correct format
    // This avoids timezone shifts caused by new Date() parsing
    const startOfDay = date;
    console.log('Final Date to save:', startOfDay);

    let attendance = await Attendance.findOne({
      where: { userId, date: startOfDay }
    });

    if (attendance) {
      console.log('Updating existing record:', attendance.id);
      attendance.status = status;
      attendance.checkIn = checkIn;
      attendance.checkOut = checkOut;
      attendance.remarks = remarks;
      attendance.markedBy = req.user.id;
      await attendance.save();
    } else {
      console.log('Creating new record for user:', userId);
      attendance = await Attendance.create({
        userId,
        markedBy: req.user.id,
        date: startOfDay,
        status,
        checkIn,
        checkOut,
        remarks,
      });
    }

    res.json({ ...attendance.toJSON(), _id: attendance.id });
  } catch (error) {
    console.error('Mark Attendance Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const selfAttendanceAction = async (req, res) => {
  try {
    const { type } = req.body;
    const userId = req.user.id;
    // Get local date of the server/user instead of UTC to avoid shifts
    const localDate = new Date();
    const date = localDate.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
    const time = localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    let attendance = await Attendance.findOne({ where: { userId, date } });

    if (type === 'clock-in') {
      if (attendance) return res.status(400).json({ message: 'Already clocked in today' });
      attendance = await Attendance.create({
        userId,
        date,
        status: 'Present',
        checkIn: time,
        markedBy: userId
      });
    } else if (!attendance) {
      return res.status(400).json({ message: 'Must clock in first' });
    } else if (type === 'clock-out') {
      attendance.checkOut = time;
      attendance.status = 'Checked Out';
      await attendance.save();
    } else if (type === 'break-in') {
      attendance.breakIn = time;
      attendance.status = 'On Break';
      await attendance.save();
    } else if (type === 'break-out') {
      attendance.breakOut = time;
      attendance.status = 'Present';
      await attendance.save();
    }

    res.json({ ...attendance.toJSON(), _id: attendance.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAttendanceStatus = async (req, res) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({ where: { userId: req.user.id, date } });
    res.json(attendance || { status: 'Not Clocked In' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id);
    if (!attendance) return res.status(404).json({ message: 'Record not found' });
    
    // Check permissions
    if (req.user.role === 'manager') {
       const user = await User.findByPk(attendance.userId);
       if (user.managerId !== req.user.id) return res.status(403).json({ message: 'Not authorized to delete this record' });
    }

    await attendance.destroy();
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCorrection = async (req, res) => {
  try {
    const { userId, comment, date } = req.body;
    if (!userId || !comment || !date) {
      return res.status(400).json({ message: 'User ID, date, and comment are required' });
    }

    const correction = await AttendanceCorrection.create({
      userId,
      managerId: req.user.id,
      comment,
      date,
    });

    res.json(correction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCorrections = async (req, res) => {
  try {
    const corrections = await AttendanceCorrection.findAll({
      include: [
        { model: User, as: 'manager', attributes: ['name'] },
        { model: User, as: 'user', attributes: ['name'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(corrections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCorrectionStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only Admin can update request status' });
    }

    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided' });
    }

    const correction = await AttendanceCorrection.findByPk(req.params.id);
    if (!correction) return res.status(404).json({ message: 'Correction request not found' });

    correction.status = status;
    await correction.save();

    res.json(correction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
