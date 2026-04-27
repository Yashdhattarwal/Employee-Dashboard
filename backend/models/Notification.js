import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING, // info, warning, success, danger
    defaultValue: 'info',
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  receiverId: {
    type: DataTypes.INTEGER, // null for broadcast
    allowNull: true,
  },
  targetRole: {
    type: DataTypes.STRING, // 'all', 'manager', 'employee', 'team'
    defaultValue: 'all',
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
});

Notification.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Notification.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });

export default Notification;
