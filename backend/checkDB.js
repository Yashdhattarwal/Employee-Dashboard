import User from './models/User.js';
import Attendance from './models/Attendance.js';
import { Ticket } from './models/Ticket.js';
import Leave from './models/Leave.js';
import sequelize from './config/db.js';

async function checkDB() {
  try {
    const users = await User.findAll();
    console.log(`Total Users: ${users.length}`);
    users.forEach(u => console.log(`- ${u.name} (${u.role})`));
    
    const attendances = await Attendance.findAll();
    console.log(`Total Attendance Records: ${attendances.length}`);
    
    const tickets = await Ticket.findAll();
    console.log(`Total Tickets: ${tickets.length}`);
    
    const leaves = await Leave.findAll();
    console.log(`Total Leaves: ${leaves.length}`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkDB();
