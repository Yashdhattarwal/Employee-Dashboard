import Payroll from '../models/Payroll.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import { Op } from 'sequelize';

export const generatePayroll = async (req, res) => {
  try {
    const { month, exchangeRate } = req.body; // month e.g. '2026-04'
    if (!month) return res.status(400).json({ message: 'Month is required' });

    const rate = exchangeRate || 83.0; // Default fallback

    const users = await User.findAll({ where: { role: { [Op.not]: 'admin' }, activeStatus: true } });

    const payrolls = [];

    for (const user of users) {
      // Calculate present days
      const [year, mth] = month.split('-');
      const lastDay = new Date(parseInt(year), parseInt(mth), 0).getDate();
      const startOfMonth = `${month}-01`;
      const endOfMonth = `${month}-${lastDay.toString().padStart(2, '0')}`;

      const attendanceCount = await Attendance.count({
        where: {
          userId: user.id,
          date: { [Op.between]: [startOfMonth, endOfMonth] },
          status: { [Op.notIn]: ['Absent', 'Weekoff'] }
        }
      });

      // Payroll Logic: Total Salary / 26 = 1 Day Salary
      const baseSalaryUSD = user.salaryUSD || (user.salaryINR ? user.salaryINR / rate : 0);
      const baseSalaryINR = user.salaryINR || (user.salaryUSD ? user.salaryUSD * rate : 0);

      const chosenCurrency = user.salaryCurrency || 'INR';
      const totalSalary = chosenCurrency === 'USD' ? baseSalaryUSD : baseSalaryINR;

      const oneDaySalary = totalSalary / 26;
      const absentDays = Math.max(0, 26 - attendanceCount);
      const absenceDeduction = absentDays * oneDaySalary;

      let payroll = await Payroll.findOne({ where: { userId: user.id, month } });

      if (payroll && payroll.status === 'Locked') {
        // Skip updating locked payrolls
        payrolls.push(payroll);
        continue;
      }

      if (payroll) {
        payroll.presentDays = attendanceCount;
        payroll.baseSalary = totalSalary;
        // Overwrite deductions with absence calculation for now, admin can adjust later
        payroll.deductions = absenceDeduction;
        payroll.netSalary = totalSalary + (payroll.bonus || 0) + (payroll.overtime || 0) - payroll.deductions;
        payroll.exchangeRate = rate;
        await payroll.save();
      } else {
        payroll = await Payroll.create({
          userId: user.id,
          month,
          presentDays: attendanceCount,
          baseSalary: totalSalary,
          bonus: 0,
          overtime: 0,
          deductions: absenceDeduction,
          netSalary: totalSalary - absenceDeduction,
          currency: chosenCurrency,
          exchangeRate: rate,
          status: 'Draft'
        });
      }

      payrolls.push(payroll);
    }

    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPayrolls = async (req, res) => {
  try {
    const { month } = req.query;
    const where = month ? { month } : {};

    const payrolls = await Payroll.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['name', 'email', 'employeeId', 'salaryCurrency', 'salaryINR', 'salaryUSD', 'bankName', 'accountHolderName', 'accountNumber', 'ifscCode', 'branchName'] }],
      order: [['month', 'DESC']]
    });
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePayroll = async (req, res) => {
  try {
    const { bonus, overtime, deductions, status } = req.body;
    const payroll = await Payroll.findByPk(req.params.id);

    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    if (payroll.status === 'Locked') return res.status(400).json({ message: 'Cannot edit locked payroll' });

    if (bonus !== undefined) payroll.bonus = bonus;
    if (overtime !== undefined) payroll.overtime = overtime;
    if (deductions !== undefined) payroll.deductions = deductions;
    if (status !== undefined) payroll.status = status;

    payroll.netSalary = payroll.baseSalary + (payroll.bonus || 0) + (payroll.overtime || 0) - (payroll.deductions || 0);
    await payroll.save();

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyPayrolls = async (req, res) => {
  try {
    const payrolls = await Payroll.findAll({
      where: { userId: req.user.id },
      include: [{ model: User, as: 'user', attributes: ['name', 'email', 'employeeId', 'salaryCurrency', 'salaryINR', 'salaryUSD', 'bankName', 'accountHolderName', 'accountNumber', 'ifscCode', 'branchName'] }],
      order: [['month', 'DESC']]
    });
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
