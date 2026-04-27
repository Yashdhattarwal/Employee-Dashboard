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
  activeStatus: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  firstTimeLogin: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
});

User.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });

export default User;
