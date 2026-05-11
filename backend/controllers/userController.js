import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import Attendance from '../models/Attendance.js';
import { Ticket } from '../models/Ticket.js';
import Leave from '../models/Leave.js';
import Expense from '../models/Expense.js';
import Payroll from '../models/Payroll.js';

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, managerId, teamId, salaryINR, salaryUSD, salaryCurrency, bankName, accountHolderName, accountNumber, ifscCode, branchName, shiftTime, shiftEndTime, designation, employmentType } = req.body;
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
      employmentType: employmentType || 'Full-time'
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
      password, shiftTime, shiftEndTime, designation, employmentType
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

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.json({ ...user.toJSON(), _id: user.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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
      totalStaff = await User.count({ where: { role: { [Op.or]: ['employee', 'manager'] } } });
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

    res.json({
      totalEmployees: totalStaff,
      presentToday,
      onLeave,
      pendingTickets,
      attendanceTrend,
      recentLeaves: recentLeaves.map(l => ({ ...l.toJSON(), _id: l.id }))
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
