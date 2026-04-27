import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';
import Notification from './Notification.js';

const Acknowledgement = sequelize.define('Acknowledgement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  notificationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  acknowledgedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
});

Acknowledgement.belongsTo(Notification, { foreignKey: 'notificationId' });
Acknowledgement.belongsTo(User, { foreignKey: 'userId' });
Notification.hasMany(Acknowledgement, { as: 'acknowledgements', foreignKey: 'notificationId' });

export default Acknowledgement;
