import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

// Use the exact link you provided
const DATABASE_URL = 'postgresql://postgres:Employeedb%403012@db.pahalqddgfhevjaznbfb.supabase.co:5432/postgres';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
});

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('--- CONNECTED TO SUPABASE CLOUD ---');
    
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'employeeId']
    });

    if (users.length === 0) {
      console.log('No users found in the cloud database.');
    } else {
      console.log(`Found ${users.length} users:`);
      users.forEach(u => {
        console.log(`- [${u.role.toUpperCase()}] ${u.name} (${u.email}) ID: ${u.employeeId}`);
      });
    }

  } catch (error) {
    console.error('Error checking cloud users:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkUsers();
