import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import Attendance from '../models/Attendance.js';
import { Ticket } from '../models/Ticket.js';
import Leave from '../models/Leave.js';
import Expense from '../models/Expense.js';
import Payroll from '../models/Payroll.js';
import Break from '../models/Break.js';


export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, managerId, teamId, salaryINR, salaryUSD, salaryCurrency, bankName, accountHolderName, accountNumber, ifscCode, branchName, shiftTime, shiftEndTime, designation, employmentType, timezone } = req.body;
    const lowerEmail = email.toLowerCase();

    const userExists = await User.findOne({ where: { email: lowerEmail } });
    if (userExists) return res.status(400).json({ message: 'User already exists' });
    
    // Auto generate employeeId in sequence
    const lastUser = await User.findOne({ order: [['id', 'DESC']] });
    let nextIdNum = 1;
    if (lastUser && lastUser.employeeId && lastUser.employeeId.startsWith('EMP-')) {
      const parts = lastUser.employeeId.split('-');
      if (parts.length === 2 && !isNaN(parts[1])) {
        nextIdNum = parseInt(parts[1], 10) + 1;
      }
    } else if (lastUser) {
      // If last user doesn't follow EMP-XXX format, fallback to id count + 1
      nextIdNum = lastUser.id + 1;
    }
    const employeeId = `EMP-${nextIdNum.toString().padStart(3, '0')}`;

    if (password) {
      const isValid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password) && !/\s/.test(password);
      if (!isValid) {
        return res.status(400).json({ message: 'Password does not meet complexity requirements: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char, and no spaces.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: lowerEmail,
      password: hashedPassword,
      role,
      managerId: managerId || null,
      teamId,
      employeeId,
      salaryINR: salaryINR || null,
      salaryUSD: salaryUSD || null,
      salaryCurrency: salaryCurrency || 'INR',
      bankName: bankName || null,
      accountHolderName: accountHolderName || null,
      accountNumber: accountNumber || null,
      ifscCode: ifscCode || null,
      branchName: branchName || null,
      shiftTime: shiftTime || '09:00 AM',
      shiftEndTime: shiftEndTime || '06:00 PM',
      designation: designation || null,
      employmentType: employmentType || 'Full-time',
      profilePhoto: req.file ? `/uploads/profiles/${req.file.filename}` : null,
      timezone: timezone || 'IST'
    });

    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{ model: User, as: 'manager', attributes: ['name', 'email'] }]
    });
    // Map id to _id for frontend compatibility
    const mapped = users.map(u => ({ ...u.toJSON(), _id: u.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamMembers = async (req, res) => {
  try {
    const teamMembers = await User.findAll({ where: { managerId: req.user.id } });
    const mapped = teamMembers.map(u => ({ ...u.toJSON(), _id: u.id }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (user) {
      user.activeStatus = req.body.activeStatus;
      await user.save();
      res.json({ message: 'User status updated' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const {
      name, email, role, managerId, teamId,
      salaryINR, salaryUSD, salaryCurrency,
      bankName, accountHolderName, accountNumber, ifscCode, branchName,
      password, shiftTime, shiftEndTime, designation, employmentType, timezone
    } = req.body;

    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail !== (user.email || '').toLowerCase()) {
        const emailExists = await User.findOne({ where: { email: trimmedEmail } });
        if (emailExists && emailExists.id !== user.id) {
          return res.status(400).json({ message: 'Email already registered' });
        }
        user.email = trimmedEmail;
      }
    }

    if (name) user.name = name;
    if (role) user.role = role;
    user.managerId = managerId || null;
    if (teamId !== undefined) user.teamId = teamId;
    
    if (salaryINR !== undefined) user.salaryINR = salaryINR || null;
    if (salaryUSD !== undefined) user.salaryUSD = salaryUSD || null;
    if (salaryCurrency) user.salaryCurrency = salaryCurrency;

    if (bankName !== undefined) user.bankName = bankName || null;
    if (accountHolderName !== undefined) user.accountHolderName = accountHolderName || null;
    if (accountNumber !== undefined) user.accountNumber = accountNumber || null;
    if (ifscCode !== undefined) user.ifscCode = ifscCode || null;
    if (branchName !== undefined) user.branchName = branchName || null;
    if (shiftTime) user.shiftTime = shiftTime;
    if (shiftEndTime) user.shiftEndTime = shiftEndTime;
    if (designation !== undefined) user.designation = designation;
    if (employmentType) user.employmentType = employmentType;
    if (timezone) user.timezone = timezone;

    if (password) {
      const isValid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password) && !/\s/.test(password);
      if (!isValid) {
        return res.status(400).json({ message: 'Password does not meet complexity requirements: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char, and no spaces.' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    if (req.file) {
      user.profilePhoto = `/uploads/profiles/${req.file.filename}`;
    }

    await user.save();
    res.json({ ...user.toJSON(), _id: user.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.file) {
      user.profilePhoto = `/uploads/profiles/${req.file.filename}`;
    }
    
    if (req.body.password) {
      const pwd = req.body.password;
      const isValid = pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd) && /[!@#$%^&*(),.?":{}|<>]/.test(pwd) && !/\s/.test(pwd);
      if (!isValid) {
        return res.status(400).json({ message: 'Password does not meet complexity requirements: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char, and no spaces.' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(pwd, salt);
    }

    if (req.body.timezone) {
      user.timezone = req.body.timezone;
    }

    await user.save();

    const updatedUser = await User.findByPk(user.id, {
      include: [{ model: User, as: 'manager', attributes: ['name'] }]
    });

    res.json({
      _id: updatedUser.id,
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      employeeId: updatedUser.employeeId,
      designation: updatedUser.designation,
      employmentType: updatedUser.employmentType,
      managerName: updatedUser.manager?.name || 'N/A',
      profilePhoto: updatedUser.profilePhoto,
      firstTimeLogin: updatedUser.firstTimeLogin,
      timezone: updatedUser.timezone,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const calculateWorkingHours = (attendance) => {
  if (!attendance.checkIn || !attendance.checkOut) return null;
  
  const parseTime = (t) => {
    let hours, minutes;
    if (t.includes('AM') || t.includes('PM')) {
      const [time, modifier] = t.split(' ');
      const [hStr, mStr] = time.split(':');
      hours = parseInt(hStr, 10);
      minutes = parseInt(mStr, 10);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
    } else {
      const [hStr, mStr] = t.split(':');
      hours = parseInt(hStr, 10);
      minutes = parseInt(mStr, 10);
    }
    return hours * 60 + minutes;
  };

  const diff = parseTime(attendance.checkOut) - parseTime(attendance.checkIn);
  const elapsedMinutes = diff < 0 ? diff + 24 * 60 : diff;
  
  const breakMinutes = (attendance.breaks || []).reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
  const actualWorkMinutes = Math.max(0, elapsedMinutes - breakMinutes);
  
  return (actualWorkMinutes / 60).toFixed(2);
};

export const getDashboardStats = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.id;

    // For managers, we only count their subordinates
    let subordinateIds = [];
    if (!isAdmin) {
      const subordinates = await User.findAll({ where: { managerId: userId }, attributes: ['id'] });
      subordinateIds = subordinates.map(u => u.id);
    }

    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
    const attendanceFilter = isAdmin ? {} : { userId: { [Op.in]: subordinateIds } };

    // Counts
    let totalStaff, presentToday, onLeave, pendingTickets;

    if (isAdmin) {
      totalStaff = await User.count({ where: { role: { [Op.or]: ['employee', 'manager', 'teamlead'] } } });
      presentToday = await Attendance.count({ where: { date: today, status: { [Op.in]: ['Present', 'Checked In', 'Checked Out'] } } });
      onLeave = await Attendance.count({ where: { date: today, status: 'On Leave' } });
      pendingTickets = await Ticket.count({ where: { status: { [Op.not]: 'Resolved' } } });
    } else {
      totalStaff = subordinateIds.length;
      presentToday = await Attendance.count({ where: { userId: { [Op.in]: subordinateIds }, date: today, status: { [Op.in]: ['Present', 'Checked In', 'Checked Out'] } } });
      onLeave = await Attendance.count({ where: { userId: { [Op.in]: subordinateIds }, date: today, status: 'On Leave' } });
      pendingTickets = await Ticket.count({ 
        where: { 
          [Op.and]: [
            { status: { [Op.not]: 'Resolved' } },
            { [Op.or]: [{ userId: { [Op.in]: subordinateIds } }, { assignedTo: userId }] }
          ]
        } 
      });
    }

    console.log('Dashboard Stats calculated:', { totalStaff, presentToday, onLeave, pendingTickets, today });

    // Attendance Trend (Last 7 days)
    const attendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      const count = await Attendance.count({ where: { ...attendanceFilter, date: dateStr, status: { [Op.in]: ['Present', 'Checked In', 'Checked Out'] } } });
      attendanceTrend.push({ date: dateStr.split('-').slice(1).join('/'), count });
    }

    // Recent Leaves
    const recentLeaves = await Leave.findAll({
      where: attendanceFilter,
      include: [{ model: User, as: 'user', attributes: ['name'] }],
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    // Detailed list of present employees today
    const presentListFilter = isAdmin ? { date: today, status: { [Op.in]: ['Present', 'Checked In', 'Checked Out'] } } : { userId: { [Op.in]: subordinateIds }, date: today, status: { [Op.in]: ['Present', 'Checked In', 'Checked Out'] } };
    const presentList = await Attendance.findAll({
      where: presentListFilter,
      include: [
        { model: User, as: 'user', attributes: ['name', 'employeeId'] },
        { model: Break, as: 'breaks' }
      ],
      order: [['checkIn', 'ASC']]
    });

    // 1. Detailed list of Total Staff
    const staffListFilter = isAdmin ? { role: { [Op.in]: ['employee', 'manager', 'teamlead'] } } : { id: { [Op.in]: subordinateIds } };
    const staffList = await User.findAll({
      where: staffListFilter,
      attributes: ['id', 'name', 'employeeId', 'role'],
      order: [['name', 'ASC']]
    });

    // 2. Detailed list of Leaves and Absents today
    const leavesListFilter = isAdmin ? { date: today, status: { [Op.in]: ['On Leave', 'Absent'] } } : { userId: { [Op.in]: subordinateIds }, date: today, status: { [Op.in]: ['On Leave', 'Absent'] } };
    const leavesList = await Attendance.findAll({
      where: leavesListFilter,
      include: [{ model: User, as: 'user', attributes: ['name', 'employeeId'] }],
      order: [['status', 'ASC']]
    });

    // 3. Detailed list of Pending Tickets today
    const ticketsListFilter = isAdmin 
      ? { status: { [Op.not]: 'Resolved' } } 
      : { 
          [Op.and]: [
            { status: { [Op.not]: 'Resolved' } },
            { [Op.or]: [{ userId: { [Op.in]: subordinateIds } }, { assignedTo: userId }] }
          ]
        };
    const ticketsList = await Ticket.findAll({
      where: ticketsListFilter,
      include: [{ model: User, as: 'user', attributes: ['name', 'employeeId'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      totalEmployees: totalStaff,
      presentToday,
      onLeave,
      pendingTickets,
      attendanceTrend,
      recentLeaves: recentLeaves.map(l => ({ ...l.toJSON(), _id: l.id })),
      presentList: presentList.map(a => {
        const json = a.toJSON();
        return {
          ...json,
          _id: a.id,
          workingHours: calculateWorkingHours(json)
        };
      }),
      staffList: staffList.map(u => ({ ...u.toJSON(), _id: u.id })),
      leavesList: leavesList.map(a => ({ ...a.toJSON(), _id: a.id })),
      ticketsList: ticketsList.map(t => ({ ...t.toJSON(), _id: t.id }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFinancialStats = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month is required' });

    // Calculate Total Salary (Locked/Approved payrolls)
    const payrolls = await Payroll.findAll({
      where: { 
        month,
        status: 'Locked'
      }
    });
    
    console.log(`Financial Stats Debug [${month}]: Found ${payrolls.length} payroll records.`);

    // Normalize to INR for comparison
    const totalSalary = payrolls.reduce((acc, p) => {
      const amount = p.netSalary || 0;
      // Only multiply by exchange rate if the record is in USD
      // If it's INR, the rate should effectively be 1
      const rate = (p.currency === 'USD') ? (p.exchangeRate || 83) : 1;
      const contribution = amount * rate;
      console.log(` - UserID ${p.userId}: Net ${amount} (${p.currency}) * Factor ${rate} = ${contribution}`);
      return acc + contribution;
    }, 0);

    // Calculate Total Expenses (Approved only)
    const expenses = await Expense.findAll({
      where: { 
        month,
        status: 'Approved'
      }
    });
    const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    res.json({
      month,
      totalSalary: Math.round(totalSalary * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      salaryCount: payrolls.length,
      expenseCount: expenses.length,
      currency: 'INR'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Check if user is trying to delete themselves
    if (user.id === req.user.id) return res.status(400).json({ message: 'Cannot delete your own account' });

    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: User, as: 'manager', attributes: ['name'] }]
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      designation: user.designation,
      employmentType: user.employmentType,
      managerName: user.manager?.name || 'N/A',
      profilePhoto: user.profilePhoto,
      firstTimeLogin: user.firstTimeLogin,
      shiftTime: user.shiftTime,
      shiftEndTime: user.shiftEndTime,
      timezone: user.timezone
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
