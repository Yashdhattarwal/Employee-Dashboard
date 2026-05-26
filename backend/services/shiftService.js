import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import { Op } from 'sequelize';

export const processShiftAbsences = async () => {
  try {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const now = new Date();
    
    // Check if today is Sunday
    const isSunday = new Date(todayStr).getDay() === 0;
    
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
        if (isSunday) {
          await Attendance.create({
            userId: person.id,
            date: todayStr,
            status: 'Weekoff',
            remarks: 'Sunday Weekoff'
          });
        } else {
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
    }
  } catch (err) {
    console.error('Shift absence logging error:', err.message);
  }
};

export const updateExistingSundayRecords = async () => {
  try {
    const staff = await User.findAll({
      where: {
        role: { [Op.in]: ['employee', 'manager'] },
        activeStatus: true
      }
    });

    const sundays = ['2026-05-24'];
    const allRecords = await Attendance.findAll();
    
    for (const r of allRecords) {
      if (r.date && !sundays.includes(r.date)) {
        const parts = r.date.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const dateObj = new Date(year, month, day);
          if (dateObj.getDay() === 0) {
            sundays.push(r.date);
          }
        }
      }
    }

    console.log(`Checking Sundays: ${JSON.stringify(sundays)}`);
    let updatedCount = 0;
    let createdCount = 0;

    for (const sundayStr of sundays) {
      for (const person of staff) {
        const r = await Attendance.findOne({
          where: { userId: person.id, date: sundayStr }
        });

        if (!r) {
          await Attendance.create({
            userId: person.id,
            date: sundayStr,
            status: 'Weekoff',
            remarks: 'Sunday Weekoff (Historical - No Record)'
          });
          createdCount++;
        } else {
          const hasCheckIn = r.checkIn && r.checkIn !== '--:--';
          if (!hasCheckIn && r.status !== 'On Leave' && r.status !== 'Weekoff') {
            r.status = 'Weekoff';
            r.remarks = 'Sunday Weekoff (Historical - Update)';
            await r.save();
            updatedCount++;
          }
        }
      }
    }

    console.log(`Historical Sunday Migration Complete. Created: ${createdCount}, Updated: ${updatedCount}`);
  } catch (err) {
    console.error('Error updating historical Sunday records:', err.message);
  }
};
