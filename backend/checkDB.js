import User from './models/User.js';
import { connectDB } from './config/db.js';

const check = async () => {
  await connectDB();
  const count = await User.count();
  console.log('Total Users found in Cloud DB:', count);
  const users = await User.findAll();
  console.log('All user names:', users.map(u => u.name));
  process.exit(0);
};

check();
