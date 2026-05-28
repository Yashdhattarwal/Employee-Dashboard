import { connectDB } from './config/db.js';
import User from './models/User.js';

const run = async () => {
  await connectDB();
  const users = await User.findAll();
  console.log('USERS:', users.map(u => ({ id: u.id, name: u.name, role: u.role })));
  process.exit(0);
};

run().catch(console.error);
