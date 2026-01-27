/**
 * create-schema.ts - Database Schema Creation Script
 * 
 * Creates all required database tables using Sequelize models.
 * Run this after infrastructure is set up and before starting the app.
 * 
 * Usage: npx ts-node -r dotenv/config -r module-alias/register setup/create-schema.ts
 */

import 'module-alias/register';
import { Sequelize } from 'sequelize';
import { createModelss } from '../script/storage/aws-storage';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
};

async function createSchema(): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Delivr Server OTA - Database Schema Creation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Database configuration from environment
  // Use DB_HOST as-is (will be 'db' in Docker, 'localhost' when overridden on host)
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASS || 'root';
  const dbName = process.env.DB_NAME || 'delivrdb';

  log.info(`Creating database if not exists: ${dbName}@${dbHost}`);

  // First connect without database to create it
  const adminSequelize = new Sequelize('', dbUser, dbPass, {
    host: dbHost,
    dialect: 'mysql',
    logging: false,
  });

  try {
    // Create database if not exists
    await adminSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    log.success(`Database '${dbName}' ready`);
  } finally {
    await adminSequelize.close();
  }

  log.info(`Connecting to database: ${dbName}@${dbHost}`);

  // Create Sequelize instance for the actual database
  const sequelize = new Sequelize(dbName, dbUser, dbPass, {
    host: dbHost,
    dialect: 'mysql',
    logging: false,
  });

  try {
    // Test connection
    await sequelize.authenticate();
    log.success('Database connection established');

    // Initialize models
    log.info('Initializing models...');
    createModelss(sequelize);
    log.success('Models initialized');

    // Sync all models to create tables
    log.info('Creating database tables...');
    await sequelize.sync({ alter: false });
    log.success('Database tables created successfully');

    // Verify tables were created
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as tableCount 
      FROM information_schema.tables 
      WHERE table_schema = '${dbName}'
    `);
    
    const tableCount = (results as Array<{ tableCount: number }>)[0]?.tableCount ?? 0;
    log.success(`Verified: ${tableCount} tables exist in database`);

  } catch (error) {
    log.error('Failed to create database schema');
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
    log.info('Database connection closed');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Schema creation complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run if executed directly
createSchema().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

