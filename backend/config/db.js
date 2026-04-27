import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('SQLite Database Connected at:', dbPath);
    // Using force: false and sync() to avoid validation errors with alter
    await sequelize.sync(); 
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

export default sequelize;
