import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import { Op } from 'sequelize';

export const processShiftAbsences = async () => {
  try {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const now = new Date();
    
    const staff = await User.findAll({
      where: {
        role: { [Op.in]: ['employee', 'manager'] },
        activeStatus: true
      }
    });

    for (const person of staff) {
      const existing = await Attendance.findOne({
        where: { userId: person.id, date: todayStr }
      });
      
      if (!existing) {
        const shift = person.shiftTime || '09:00 AM';
        let shiftHour = 9;
        let shiftMin = 0;
        
        const match = shift.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
          shiftHour = parseInt(match[1], 10);
          shiftMin = parseInt(match[2], 10);
          const period = match[3] ? match[3].toUpperCase() : '';
          
          if (period === 'PM' && shiftHour < 12) shiftHour += 12;
          if (period === 'AM' && shiftHour === 12) shiftHour = 0;
        }

        const shiftDate = new Date();
        shiftDate.setHours(shiftHour, shiftMin, 0, 0);

        if (now > shiftDate) {
          await Attendance.create({
            userId: person.id,
            date: todayStr,
            status: 'Absent',
            remarks: `Automated absent: Missed shift beginning at ${shift}`
          });
        }
      }
    }
  } catch (err) {
    console.error('Shift absence logging error:', err.message);
  }
};
