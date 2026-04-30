import Expense from '../models/Expense.js';
import User from '../models/User.js';
import path from 'path';
import fs from 'fs';

export const uploadExpense = async (req, res) => {
  try {
    const { description, amount, month } = req.body;
    const userId = req.user.id;
    const invoiceUrl = req.file ? `/uploads/expenses/${req.file.filename}` : null;

    const expense = await Expense.create({
      userId,
      description,
      amount: parseFloat(amount),
      invoiceUrl,
      month,
      status: 'Pending'
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyExpenses = async (req, res) => {
  try {
    const expenses = await Expense.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllExpenses = async (req, res) => {
  try {
    const { month } = req.query;
    const where = {};
    if (month) where.month = month;

    const expenses = await Expense.findAll({
      where,
      include: [{ model: User, attributes: ['name', 'employeeId'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveExpense = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    expense.status = 'Approved';
    await expense.save();

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectExpense = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    expense.status = 'Rejected';
    expense.rejectionReason = rejectionReason;
    await expense.save();

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
