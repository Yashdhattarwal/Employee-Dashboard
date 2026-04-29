import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'employee',
  },
  managerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  teamId: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  shiftTime: {
    type: DataTypes.STRING,
    defaultValue: '09:00 AM',
  },
  shiftEndTime: {
    type: DataTypes.STRING,
    defaultValue: '06:00 PM',
  },
  activeStatus: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  firstTimeLogin: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  salaryINR: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  salaryUSD: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  salaryCurrency: {
    type: DataTypes.STRING,
    defaultValue: 'INR',
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  accountHolderName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ifscCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  branchName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

User.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });

export default User;
