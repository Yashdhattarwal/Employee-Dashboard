import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Break = sequelize.define('Break', {
  attendanceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.STRING, // Store as "01:30 PM"
    allowNull: false,
  },
  endTime: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
});

export default Break;
