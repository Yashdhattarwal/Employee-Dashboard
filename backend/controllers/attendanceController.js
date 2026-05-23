import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import AttendanceCorrection from '../models/AttendanceCorrection.js';
import Break from '../models/Break.js';
import { Op } from 'sequelize';

const calculateDiffMinutes = (startStr, endStr) => {
  if (!startStr || !endStr) return 0;
  
  const parseTime = (t) => {
    let hours, minutes;
    if (t.includes('AM') || t.includes('PM')) {
      const [time, modifier] = t.split(' ');
      [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
    } else {
      [hours, minutes] = t.split(':').map(Number);
    }
    return hours * 60 + minutes;
  };

  const diff = parseTime(endStr) - parseTime(startStr);
  return diff < 0 ? diff + 24 * 60 : diff;
};

export const getMyAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findAll({ 
      where: { userId: req.user.id },
      include: [{ model: Break, as: 'breaks' }],
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
      include: [
        { model: User, as: 'user', attributes: ['name', 'employmentType'] },
        { model: Break, as: 'breaks' }
      ],
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
      include: [
        { model: User, as: 'user', attributes: ['name', 'employmentType'] },
        { model: Break, as: 'breaks' }
      ],
      order: [['date', 'DESC']]
    });
    const mapped = attendance.map(a => ({ ...a.toJSON(), _id: a.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const validateAttendanceStatus = async (user, date, checkIn, checkOut, breaks) => {
  if (!checkIn || !checkOut) return 'Present'; // Status remains as is until checkout

  const workingMinutes = calculateDiffMinutes(checkIn, checkOut);
  const breakMinutes = (breaks || []).reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
  const actualWorkMinutes = workingMinutes - breakMinutes;

  const isFullTime = user.employmentType === 'Full-time';
  const normalMin = isFullTime ? 480 : 240; // 8h or 4h
  const graceMin = isFullTime ? 450 : 225;  // 7.5h or 3.75h

  // 1. If they hit the normal minimum, they are definitely Present
  if (actualWorkMinutes >= normalMin) return 'Present';

  // 2. If they are even below the grace period, they are definitely Absent
  if (actualWorkMinutes < graceMin) return 'Absent';

  // 3. If they are in the Grace Zone (Grace <= Work < Normal), check consecutive days
  // We need to check the last 3 days before this 'date'
  const prevRecords = await Attendance.findAll({
    where: { 
      userId: user.id, 
      date: { [Op.lt]: date },
      status: { [Op.in]: ['Present', 'Checked Out', 'Absent'] } // Include Absent if we want to track working attempts
    },
    include: [{ model: Break, as: 'breaks' }],
    order: [['date', 'DESC']],
    limit: 3
  });

  let consecutiveGraceCount = 0;
  for (const rec of prevRecords) {
    const recWork = calculateDiffMinutes(rec.checkIn, rec.checkOut) - (rec.breaks || []).reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
    // If they were in grace zone on a previous day, increment count
    if (recWork >= graceMin && recWork < normalMin) {
      consecutiveGraceCount++;
    } else {
      // If they hit normal hours, the consecutive chain is broken
      break;
    }
  }

  // Allowed only for 3 consecutive days
  if (consecutiveGraceCount >= 3) {
    console.log(`User ${user.id} exceeded 3 consecutive grace days on ${date}. Marking Absent.`);
    return 'Absent';
  }

  return 'Present';
};

export const markAttendance = async (req, res) => {
  try {
    const { userId, date, status, checkIn, checkOut, remarks } = req.body;
    const user = await User.findByPk(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    let finalStatus = status;
    // Only auto-validate if status is Present or Checked Out
    if (['Present', 'Checked Out'].includes(status)) {
       finalStatus = await validateAttendanceStatus(user, date, checkIn, checkOut, []);
    }

    let attendance = await Attendance.findOne({ where: { userId, date } });

    if (attendance) {
      attendance.status = finalStatus;
      attendance.checkIn = checkIn;
      attendance.checkOut = checkOut;
      attendance.remarks = remarks;
      attendance.markedBy = req.user.id;
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        userId, date, status: finalStatus, checkIn, checkOut, remarks, markedBy: req.user.id
      });
    }

    res.json({ ...attendance.toJSON(), _id: attendance.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const formatAttendanceWithISO = (attendance) => {
  if (!attendance) return null;
  const json = attendance.toJSON ? attendance.toJSON() : attendance;
  
  const parseServerTimeToISO = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const cleanT = timeStr.replace(/(AM|PM)/gi, '').trim();
    const parts = cleanT.split(':');
    if (parts.length < 2) return null;
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (timeStr.toUpperCase().includes('PM') && h < 12) h += 12;
    if (timeStr.toUpperCase().includes('AM') && h === 12) h = 0;
    
    // Parse using server's local time zone
    const d = new Date(dateStr);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  json.checkInTimeISO = parseServerTimeToISO(json.date, json.checkIn);
  json.checkOutTimeISO = parseServerTimeToISO(json.date, json.checkOut);
  
  if (json.breaks) {
    json.breaks = json.breaks.map(b => {
      return {
        ...b,
        startTimeISO: parseServerTimeToISO(json.date, b.startTime),
        endTimeISO: parseServerTimeToISO(json.date, b.endTime)
      };
    });
  }
  
  return json;
};

export const selfAttendanceAction = async (req, res) => {
  try {
    const { type } = req.body;
    const userId = req.user.id;
    // Get local date of the server/user instead of UTC to avoid shifts
    const localDate = new Date();
    const date = localDate.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
    const time = localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    let attendance;
    if (type === 'clock-in') {
      attendance = await Attendance.findOne({ where: { userId, date } });
    } else {
      attendance = await Attendance.findOne({
        where: {
          userId,
          checkIn: { [Op.ne]: null },
          checkOut: null
        },
        order: [['date', 'DESC']]
      });
      if (!attendance) {
        attendance = await Attendance.findOne({ where: { userId, date } });
      }
    }

    if (type === 'clock-in') {
      if (attendance && attendance.checkIn) return res.status(400).json({ message: 'Already clocked in today' });
      
      if (attendance) {
        // If record exists (e.g. marked as Weekoff/Absent by admin), allow user to clock in
        attendance.status = 'Present';
        attendance.checkIn = time;
        attendance.markedBy = userId;
        await attendance.save();
      } else {
        attendance = await Attendance.create({
          userId,
          date,
          status: 'Present',
          checkIn: time,
          markedBy: userId
        });
      }
    } else if (!attendance) {
      return res.status(400).json({ message: 'Must clock in first' });
    } else if (type === 'clock-out') {
      const user = await User.findByPk(req.user.id);
      const breaks = await Break.findAll({ where: { attendanceId: attendance.id } });
      const finalStatus = await validateAttendanceStatus(user, attendance.date, attendance.checkIn, time, breaks);

      const isFullTime = user.employmentType === 'Full-time';
      const limitMinutes = isFullTime ? 9 * 60 : 5 * 60;
      const elapsedMinutes = calculateDiffMinutes(attendance.checkIn, time);

      if (elapsedMinutes > limitMinutes) {
        attendance.pendingCheckOut = time;
        attendance.status = 'Pending Approval';
        if (req.body.eodWork) attendance.eodWork = req.body.eodWork;
        if (req.body.pendingTasks) attendance.pendingTasks = req.body.pendingTasks;
        if (req.file) attendance.eodAttachment = `/uploads/eod/${req.file.filename}`;
        await attendance.save();

        await AttendanceCorrection.create({
          userId: user.id,
          managerId: user.managerId || 1,
          comment: `Exceeded late sign-out limit (Shift: ${user.shiftTime}-${user.shiftEndTime}). Attempted checkout at ${time} (${Math.round(elapsedMinutes / 60)} hrs elapsed). Productive time stopped, requires Admin approval.`,
          date: attendance.date,
          status: 'Pending'
        });
      } else {
        attendance.checkOut = time;
        attendance.status = finalStatus;
        if (req.body.eodWork) attendance.eodWork = req.body.eodWork;
        if (req.body.pendingTasks) attendance.pendingTasks = req.body.pendingTasks;
        if (req.file) attendance.eodAttachment = `/uploads/eod/${req.file.filename}`;
        await attendance.save();
      }
    } else if (type === 'break-in') {
      const activeBreak = await Break.findOne({ where: { attendanceId: attendance.id, endTime: null } });
      if (activeBreak) return res.status(400).json({ message: 'Already on a break' });
      
      await Break.create({ attendanceId: attendance.id, startTime: time });
      attendance.status = 'On Break';
      await attendance.save();
    } else if (type === 'break-out') {
      const activeBreak = await Break.findOne({ 
        where: { attendanceId: attendance.id, endTime: null },
        order: [['createdAt', 'DESC']]
      });
      if (!activeBreak) return res.status(400).json({ message: 'No active break found' });
      
      activeBreak.endTime = time;
      activeBreak.durationMinutes = calculateDiffMinutes(activeBreak.startTime, time);
      await activeBreak.save();
      
      attendance.status = 'Present';
      await attendance.save();
    }

    res.json(formatAttendanceWithISO(attendance));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAttendanceStatus = async (req, res) => {
  try {
    const date = new Date().toLocaleDateString('en-CA');
    let attendance = await Attendance.findOne({ 
      where: { userId: req.user.id, checkOut: null, checkIn: { [Op.ne]: null } },
      include: [{ model: Break, as: 'breaks' }],
      order: [['date', 'DESC']]
    });
    if (!attendance) {
      attendance = await Attendance.findOne({
        where: { userId: req.user.id, date },
        include: [{ model: Break, as: 'breaks' }]
      });
    }
    res.json(attendance ? formatAttendanceWithISO(attendance) : { status: 'Not Clocked In' });
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

    // Finalize late sign-out attendance if matching record is in Pending Approval state
    const attendance = await Attendance.findOne({ where: { userId: correction.userId, date: correction.date } });
    if (attendance && attendance.status === 'Pending Approval') {
      if (status === 'Approved') {
        const user = await User.findByPk(attendance.userId);
        const breaks = await Break.findAll({ where: { attendanceId: attendance.id } });
        const finalStatus = await validateAttendanceStatus(user, attendance.date, attendance.checkIn, attendance.pendingCheckOut, breaks);
        
        attendance.checkOut = attendance.pendingCheckOut;
        attendance.status = finalStatus;
        attendance.pendingCheckOut = null;
        await attendance.save();
      } else {
        attendance.checkOut = attendance.pendingCheckOut;
        attendance.status = 'Absent';
        attendance.pendingCheckOut = null;
        await attendance.save();
      }
    }

    res.json(correction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const tempCleanupDatabase = async (req, res) => {
  try {
    const logs = [];
    
    const user = await User.findOne({ where: { name: 'Jai Prakash Pandey' } });
    if (!user) {
      logs.push('User Jai Prakash Pandey not found!');
    } else {
      const userId = user.id;
      logs.push(`Found Jai Prakash Pandey with ID: ${userId}`);

      const badRecord = await Attendance.findOne({
        where: {
          userId,
          date: '2026-05-23',
          checkIn: '12:13 AM'
        }
      });

      if (badRecord) {
        logs.push(`Found incorrect record on 2026-05-23: ${JSON.stringify(badRecord.toJSON())}`);
        
        const goodRecord = await Attendance.findOne({
          where: {
            userId,
            date: '2026-05-22'
          }
        });

        if (goodRecord) {
          logs.push(`Found correct record on 2026-05-22: ${JSON.stringify(goodRecord.toJSON())}`);
          
          goodRecord.checkOut = '12:13 AM';
          goodRecord.status = 'Present';
          await goodRecord.save();
          logs.push('Successfully updated 2026-05-22 record!');

          await badRecord.destroy();
          logs.push('Successfully deleted incorrect 2026-05-23 record!');
        } else {
          logs.push('Could not find 2026-05-22 record to merge checkout!');
        }
      } else {
        logs.push('No incorrect 2026-05-23 record found with checkIn 12:13 AM.');
      }
    }

    const allBadRecords = await Attendance.findAll({
      where: {
        checkIn: { [Op.ne]: null },
        checkOut: { [Op.ne]: null },
        status: 'Absent'
      }
    });

    for (const rec of allBadRecords) {
      if (rec.checkIn === rec.checkOut) {
        const isEarlyAM = rec.checkIn.includes('AM') && (
          rec.checkIn.startsWith('12:') || 
          rec.checkIn.startsWith('01:') || 
          rec.checkIn.startsWith('02:') || 
          rec.checkIn.startsWith('03:') || 
          rec.checkIn.startsWith('04:') || 
          rec.checkIn.startsWith('05:')
        );

        if (isEarlyAM) {
          logs.push(`Analyzing potential bad record on ${rec.date} for user ${rec.userId}: checkIn/out at ${rec.checkIn}`);
          
          const currentDate = new Date(rec.date);
          currentDate.setDate(currentDate.getDate() - 1);
          const prevDateStr = currentDate.toISOString().split('T')[0];

          const prevRecord = await Attendance.findOne({
            where: {
              userId: rec.userId,
              date: prevDateStr
            }
          });

          if (prevRecord && (!prevRecord.checkOut || prevRecord.checkOut === '--:--')) {
            logs.push(`Found matching previous open record on ${prevDateStr} for user ${rec.userId}! Merging checkout: ${rec.checkIn}`);
            
            prevRecord.checkOut = rec.checkIn;
            prevRecord.status = 'Present';
            await prevRecord.save();
            
            await rec.destroy();
            logs.push(`Successfully merged open session and deleted bad record on ${rec.date}.`);
          }
        }
      }
    }

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
