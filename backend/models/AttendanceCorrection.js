import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const AttendanceCorrection = sequelize.define('AttendanceCorrection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  managerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Pending',
  },
});

AttendanceCorrection.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });
AttendanceCorrection.belongsTo(User, { as: 'user', foreignKey: 'userId' });

export default AttendanceCorrection;
