import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const UserSessionLog = sequelize.define('UserSessionLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  loginTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  logoutTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deviceType: {
    type: DataTypes.STRING,
    defaultValue: 'Desktop',
  },
  browserName: {
    type: DataTypes.STRING,
    defaultValue: 'Chrome',
  },
  osName: {
    type: DataTypes.STRING,
    defaultValue: 'Windows',
  }
});

UserSessionLog.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(UserSessionLog, { as: 'sessionLogs', foreignKey: 'userId' });

export default UserSessionLog;
