import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const ProductivityLog = sequelize.define('ProductivityLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  activeMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  idleMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  clickCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  keyCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  scrollCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  movementCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  currentPage: {
    type: DataTypes.STRING,
    defaultValue: 'Home',
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
  },
  liveStatus: {
    type: DataTypes.STRING,
    defaultValue: 'Offline',
  },
  lastHeartbeat: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

ProductivityLog.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(ProductivityLog, { as: 'productivityLogs', foreignKey: 'userId' });

export default ProductivityLog;
