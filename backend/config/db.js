import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use PostgreSQL for production (Supabase) and SQLite for local development
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

let sequelize;

if (isProduction && process.env.DATABASE_URL) {
  const isMysql = process.env.DATABASE_URL.startsWith('mysql');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: isMysql ? 'mysql' : 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  });
} else {
  const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false,
  });
}

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected...');
    
    // Sync models - using alter: true to ensure new tables like 'Breaks' are created
    await sequelize.sync({ alter: true });
    
    // Manual check/add columns for EOD report to be safe in production
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Attendances' AND COLUMN_NAME IN ('eodWork', 'pendingTasks', 'eodAttachment')
    `);

    const existingColumns = results.map(r => r.COLUMN_NAME || r.column_name); // Handle case sensitivity
    
    if (!existingColumns.includes('eodWork')) {
      await sequelize.query('ALTER TABLE Attendances ADD COLUMN eodWork TEXT');
      console.log('Added eodWork column');
    }
    if (!existingColumns.includes('pendingTasks')) {
      await sequelize.query('ALTER TABLE Attendances ADD COLUMN pendingTasks TEXT');
      console.log('Added pendingTasks column');
    }
    if (!existingColumns.includes('eodAttachment')) {
      await sequelize.query('ALTER TABLE Attendances ADD COLUMN eodAttachment VARCHAR(255)');
      console.log('Added eodAttachment column');
    }

    console.log('Database synchronized and columns verified');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

export default sequelize;
