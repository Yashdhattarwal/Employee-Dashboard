import Expense from '../models/Expense.js';
import User from '../models/User.js';
import fs from 'fs';

export const uploadExpense = async (req, res) => {
  try {
    const { description, amount, month } = req.body;
    const userId = req.user.id;
    
    let invoiceData = null;
    let invoiceMimeType = null;
    let invoiceUrl = null;

    if (req.file) {
      invoiceData = fs.readFileSync(req.file.path);
      invoiceMimeType = req.file.mimetype;
      // We'll use a virtual URL that points to our database retrieval route
      invoiceUrl = `/api/expenses/file/temp`; 
      
      // Clean up the temporary file immediately after reading into buffer
      fs.unlinkSync(req.file.path);
    }

    const expense = await Expense.create({
      userId,
      description,
      amount: parseFloat(amount),
      invoiceUrl, // This will be overridden in the frontend with the ID-based link
      invoiceData,
      invoiceMimeType,
      month,
      status: 'Pending'
    });

    // Update the URL to include the actual ID
    expense.invoiceUrl = `/api/expenses/file/${expense.id}`;
    await expense.save();

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInvoiceFile = async (req, res) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense || !expense.invoiceData) {
      return res.status(404).send('Invoice file not found');
    }

    // Authorization check: owner or admin
    if (expense.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).send('Unauthorized to view this invoice');
    }

    res.set('Content-Type', expense.invoiceMimeType);
    res.send(expense.invoiceData);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

export const getMyExpenses = async (req, res) => {
  try {
    const expenses = await Expense.findAll({
      where: { userId: req.user.id },
      attributes: { exclude: ['invoiceData'] }, // Don't send heavy BLOB data in list
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
      attributes: { exclude: ['invoiceData'] },
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
