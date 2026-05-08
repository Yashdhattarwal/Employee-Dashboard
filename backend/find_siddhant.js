import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Payroll from './models/Payroll.js';
import Attendance from './models/Attendance.js';
import { Op } from 'sequelize';

dotenv.config();

async function checkSiddhant() {
  try {
    await connectDB();
    const users = await User.findAll({ where: { name: { [Op.or]: [{ [Op.like]: '%Siddhant%' }, { [Op.like]: '%Raunak%' }] } } });
    
    for (const user of users) {
      console.log('--- Checking User:', user.name, 'ID:', user.id, '---');

      const attendances = await Attendance.findAll({ 
        where: { 
          userId: user.id, 
          date: { [Op.between]: ['2026-04-01', '2026-04-30'] } 
        } 
      });
      console.log('April Attendance Records:', attendances.length);
      attendances.forEach(a => console.log(a.date, a.status));

      const payroll = await Payroll.findOne({ where: { userId: user.id, month: '2026-04' } });
      console.log('April Payroll:', payroll ? JSON.stringify(payroll, null, 2) : 'No Payroll Record');
    }
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit();
  }
}

checkSiddhant();
