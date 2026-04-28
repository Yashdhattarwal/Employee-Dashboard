import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const Payroll = sequelize.define('Payroll', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  month: {
    type: DataTypes.STRING, // e.g. '2026-04'
    allowNull: false,
  },
  baseSalary: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  presentDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  bonus: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  overtime: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  deductions: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  netSalary: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'INR',
  },
  exchangeRate: {
    type: DataTypes.FLOAT,
    defaultValue: 1,
  },
  status: {
    type: DataTypes.STRING, // 'Draft', 'Approved', 'Locked'
    defaultValue: 'Draft',
  },
});

Payroll.belongsTo(User, { as: 'user', foreignKey: 'userId' });

export default Payroll;
