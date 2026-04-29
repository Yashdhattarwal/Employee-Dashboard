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
    console.log(isProduction ? `Cloud Database (${sequelize.getDialect().toUpperCase()}) Connected.` : 'Local Database (SQLite) Connected.');
    try {
      await sequelize.sync({ alter: true }); 
    } catch (syncError) {
      console.warn('Sync alter failed, running standard sync:', syncError.message);
      await sequelize.sync(); 
    }  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

export default sequelize;
