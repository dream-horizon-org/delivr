/**
 * Seed Data Script
 * 
 * Injects development seed data into the database.
 * Only run when volumes are recreated (fresh/clear-data commands).
 * 
 * Usage: ts-node -r dotenv/config setup/seed-data.ts
 */

import 'dotenv/config';
import { Sequelize } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import {
  seedLogger,
  DB_DEFAULTS,
  SEED_TABLE_MAPPINGS,
  SEED_PRIMARY_KEYS,
  SEED_ORDER,
} from './setup.constants';

const { log, warn, error } = seedLogger;

// Get current timestamp in MySQL format (YYYY-MM-DD HH:MM:SS)
const getMySQLTimestamp = (): string => {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace('T', ' ');
};

// Get current time as epoch milliseconds
const getEpochMillis = (): number => Date.now();

// Add timestamps to a record
const addTimestamps = (record: Record<string, unknown>): Record<string, unknown> => {
  const mysqlTimestamp = getMySQLTimestamp();
  const epochMillis = getEpochMillis();
  
  return {
    ...record,
    // MySQL datetime fields
    createdAt: mysqlTimestamp,
    updatedAt: mysqlTimestamp,
    // Epoch millisecond fields (if applicable - will be overwritten if already set)
    ...(record.createdTime !== undefined ? { createdTime: epochMillis } : {}),
  };
};

async function seedData(): Promise<void> {
  const dbHost = process.env.DB_HOST ?? DB_DEFAULTS.HOST;
  const dbUser = process.env.DB_USER ?? DB_DEFAULTS.USER;
  const dbPass = process.env.DB_PASS ?? DB_DEFAULTS.PASS;
  const dbName = process.env.DB_NAME ?? DB_DEFAULTS.NAME;

  log(`Connecting to database ${dbName}@${dbHost}...`);

  const sequelize = new Sequelize(dbName, dbUser, dbPass, {
    host: dbHost,
    dialect: 'mysql',
    logging: false,
  });

  try {
    await sequelize.authenticate();
    log('Database connection established');

    // Load seed data
    const seedDataPath = path.join(__dirname, 'seed-data.json');
    
    if (!fs.existsSync(seedDataPath)) {
      error(`Seed data file not found: ${seedDataPath}`);
      process.exit(1);
    }
    
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

    // Seed in order (respecting FK constraints)
    for (const key of SEED_ORDER) {
      const data = seedData[key];
      const tableName = SEED_TABLE_MAPPINGS[key];
      const primaryKey = SEED_PRIMARY_KEYS[key];
      
      if (!data || data.length === 0) {
        warn(`No seed data for ${key}, skipping`);
        continue;
      }

      if (!tableName) {
        warn(`No table mapping for ${key}, skipping`);
        continue;
      }

      // Check if data already exists (by primary key of first record)
      const firstRecord = data[0];
      const checkValue = firstRecord[primaryKey];
      
      try {
        const [existing] = await sequelize.query(
          `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE \`${primaryKey}\` = ?`,
          { 
            replacements: [checkValue], 
            type: 'SELECT' 
          }
        ) as [{ count: number }[], unknown];

        if (existing && (existing as any).count > 0) {
          warn(`${tableName} already has data, skipping`);
          continue;
        }
      } catch (err) {
        // Table might not exist yet, will fail on insert anyway
        warn(`Could not check ${tableName}: ${err instanceof Error ? err.message : err}`);
      }

      // Insert data
      let insertedCount = 0;
      for (const rawRecord of data) {
        // Add current timestamps to each record
        const record = addTimestamps(rawRecord);
        
        const columns = Object.keys(record);
        const values = Object.values(record).map(v => 
          v === null ? null : 
          Array.isArray(v) ? JSON.stringify(v) : v
        );
        const placeholders = columns.map(() => '?').join(', ');
        
        try {
          await sequelize.query(
            `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
            { replacements: values }
          );
          insertedCount++;
        } catch (err) {
          error(`Failed to insert into ${tableName}: ${err instanceof Error ? err.message : err}`);
        }
      }
      
      if (insertedCount > 0) {
        log(`✓ Seeded ${insertedCount} record(s) into ${tableName}`);
      }
    }

    log('Seed data injection complete!');
    
  } catch (err) {
    error(`Seed failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedData();

