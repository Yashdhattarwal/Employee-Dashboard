import { Sequelize } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User.js';
import Attendance from './models/Attendance.js';
import Leave from './models/Leave.js';
import { Ticket, Comment } from './models/Ticket.js';
import Notification from './models/Notification.js';
import Payroll from './models/Payroll.js';
import AttendanceCorrection from './models/AttendanceCorrection.js';
import { connectDB } from './config/db.js';

const migrate = async () => {
  const dbPath = path.resolve('database.sqlite');
  const sqliteSeq = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false,
  });

  await connectDB();

  try {
    const users = await sqliteSeq.query("SELECT * FROM Users", { type: Sequelize.QueryTypes.SELECT });
    console.log(`Found ${users.length} users in SQLite.`);
    for (const u of users) {
      if (u.email === 'admin@employeeportal.com') continue;
      
      const existing = await User.findOne({ where: { email: u.email } });
      if (!existing) {
        await User.create({
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role,
          managerId: u.managerId,
          teamId: u.teamId,
          shiftTime: u.shiftTime || '09:00 AM',
          employeeId: u.employeeId || `EMP-${Math.floor(Math.random() * 10000)}`,
          salaryINR: u.salaryINR,
          salaryUSD: u.salaryUSD,
          salaryCurrency: u.salaryCurrency,
          bankName: u.bankName,
          accountHolderName: u.accountHolderName,
          accountNumber: u.accountNumber,
          ifscCode: u.ifscCode,
          branchName: u.branchName,
          activeStatus: u.activeStatus === 1 || u.activeStatus === true,
          firstTimeLogin: u.firstTimeLogin === 1 || u.firstTimeLogin === true,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt
        });
        console.log(`Migrated user: ${u.name}`);
      }
    }

    const attendanceRecords = await sqliteSeq.query("SELECT * FROM Attendances", { type: Sequelize.QueryTypes.SELECT });
    console.log(`Found ${attendanceRecords.length} Attendance records in SQLite.`);
    for (const a of attendanceRecords) {
      const existing = await Attendance.findOne({ where: { userId: a.userId, date: a.date } });
      if (!existing) {
        await Attendance.create({
          userId: a.userId,
          date: a.date,
          status: a.status,
          checkIn: a.checkIn,
          checkOut: a.checkOut,
          breakIn: a.breakIn,
          breakOut: a.breakOut,
          remarks: a.remarks,
          markedBy: a.markedBy,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt
        });
      }
    }

    const leaves = await sqliteSeq.query("SELECT * FROM Leaves", { type: Sequelize.QueryTypes.SELECT });
    console.log(`Found ${leaves.length} leaves in SQLite.`);
    for (const l of leaves) {
      const existing = await Leave.findOne({ where: { userId: l.userId, fromDate: l.fromDate } });
      if (!existing) {
        await Leave.create({
          userId: l.userId,
          managerId: l.managerId,
          type: l.type,
          fromDate: l.fromDate,
          toDate: l.toDate,
          reason: l.reason,
          status: l.status,
          comment: l.comment,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt
        });
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
  }
  process.exit(0);
};

migrate();
