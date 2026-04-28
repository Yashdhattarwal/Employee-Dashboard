import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use PostgreSQL for production (Supabase) and SQLite for local development
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

let sequelize;

if (isProduction && process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Required for Supabase
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
    console.log(isProduction ? 'Cloud Database (PostgreSQL) Connected.' : 'Local Database (SQLite) Connected.');
    await sequelize.sync({ alter: true }); 
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

export default sequelize;
