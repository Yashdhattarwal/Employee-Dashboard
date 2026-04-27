import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('SQLite Database Connected.');
    // Using force: false and sync() to avoid validation errors with alter
    await sequelize.sync(); 
  } catch (error) {
    console.error('Database connection error:', error.message);
    // Log the full error to see validation details
    console.error(error);
    process.exit(1);
  }
};

export default sequelize;
