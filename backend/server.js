import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import User from './models/User.js';
import Attendance from './models/Attendance.js';
import Leave from './models/Leave.js';
import { Ticket, Comment } from './models/Ticket.js';
import Notification from './models/Notification.js';
import Acknowledgement from './models/Acknowledgement.js';
import bcrypt from 'bcryptjs';

dotenv.config();
// Fallback secret to ensure sessions persist across restarts if env var is missing
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'rtn_employee_portal_secure_secret_2026';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ 
  origin: [
    'http://localhost:5173', 
    'http://127.0.0.1:5173', 
    'http://192.168.18.5:5173'
  ], 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve Frontend
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (!req.url.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

// Auto-seed admin user
const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ where: { email: 'admin@employeeportal.com' } });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await User.create({
        name: 'Admin User',
        email: 'admin@employeeportal.com',
        employeeId: 'EMP-0001',
        password: hashedPassword,
        role: 'admin',
        firstTimeLogin: false,
      });
      console.log('Admin user seeded automatically.');
    }
  } catch (error) {
    console.error('Failed to seed admin:', error.message);
  }
};

const startServer = async () => {
  await connectDB();
  
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await seedAdmin();
  });
};

startServer();
