import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: 'user_date_unique'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  checkIn: {
    type: DataTypes.STRING,
  },
  checkOut: {
    type: DataTypes.STRING,
  },
  breakIn: {
    type: DataTypes.STRING,
  },
  breakOut: {
    type: DataTypes.STRING,
  },
  remarks: {
    type: DataTypes.STRING,
  },
  eodWork: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pendingTasks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  eodAttachment: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: 'user_date_unique'
  },
  markedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

import Break from './Break.js';
Attendance.hasMany(Break, { as: 'breaks', foreignKey: 'attendanceId' });
Break.belongsTo(Attendance, { foreignKey: 'attendanceId' });

export default Attendance;
