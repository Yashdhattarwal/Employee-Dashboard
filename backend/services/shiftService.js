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
          const defaultStatus = isSunday ? 'Weekoff' : 'Absent';
          const defaultRemarks = isSunday 
            ? 'Sunday Weekoff' 
            : `Automated absent: Missed shift beginning at ${shift}`;

          await Attendance.create({
            userId: person.id,
            date: todayStr,
            status: defaultStatus,
            remarks: defaultRemarks
          });
        }
      }
    }
  } catch (err) {
    console.error('Shift absence logging error:', err.message);
  }
};

export const updateExistingSundayRecords = async () => {
  try {
    const records = await Attendance.findAll();
    console.log(`Checking ${records.length} existing records for Sunday updates...`);
    let updatedCount = 0;
    for (const r of records) {
      if (r.date) {
        const parts = r.date.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const dateObj = new Date(year, month, day);
          
          if (dateObj.getDay() === 0) { // Sunday
            // If they didn't check in or check out, and they are not on leave, mark them as 'Weekoff'
            if ((!r.checkIn || r.checkIn === '--:--') && r.status !== 'On Leave') {
              if (r.status !== 'Weekoff') {
                r.status = 'Weekoff';
                r.remarks = 'Sunday Weekoff (Historical)';
                await r.save();
                updatedCount++;
              }
            }
          }
        }
      }
    }
    if (updatedCount > 0) {
      console.log(`Updated ${updatedCount} historical Sunday records to 'Weekoff'.`);
    } else {
      console.log('No historical Sunday records needed updates.');
    }
  } catch (err) {
    console.error('Error updating historical Sunday records:', err.message);
  }
};
