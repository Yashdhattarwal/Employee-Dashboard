import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'Low',
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Open',
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  hiddenFromManager: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  ticketId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

Ticket.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Ticket.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });
Ticket.hasMany(Comment, { as: 'comments', foreignKey: 'ticketId' });
Comment.belongsTo(User, { as: 'user', foreignKey: 'userId' });

export { Ticket, Comment };
