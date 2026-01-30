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

// Colors for console output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

const log = (msg: string) => console.log(`${GREEN}[seed]${RESET} ${msg}`);
const warn = (msg: string) => console.log(`${YELLOW}[seed]${RESET} ${msg}`);
const error = (msg: string) => console.log(`${RED}[seed]${RESET} ${msg}`);

// Table name mappings (JSON key -> actual table name)
const TABLE_MAPPINGS: Record<string, string> = {
  accounts: 'accounts',
  tenants: 'tenants',
  apps: 'apps',
  collaborators: 'collaborators',
  deployments: 'deployments',
  accessKeys: 'accessKeys',
  platforms: 'platforms',
  targets: 'targets',
  platformStoreMappings: 'platform_store_type_mapping',
};

// Primary key field for each table (for existence check)
const PRIMARY_KEYS: Record<string, string> = {
  accounts: 'id',
  tenants: 'id',
  apps: 'id',
  collaborators: 'accountId', // Uses composite key, check by accountId
  deployments: 'id',
  accessKeys: 'id',
  platforms: 'id',
  targets: 'id',
  platformStoreMappings: 'id',
};

async function seedData(): Promise<void> {
  const dbHost = process.env.DB_HOST ?? 'localhost';
  const dbUser = process.env.DB_USER ?? 'root';
  const dbPass = process.env.DB_PASS ?? 'root';
  const dbName = process.env.DB_NAME ?? 'delivrdb';

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
    const seedOrder = [
      'accounts',
      'tenants',
      'apps',
      'collaborators',
      'deployments',
      'accessKeys',
      'platforms',
      'targets',
      'platformStoreMappings',
    ];

    for (const key of seedOrder) {
      const data = seedData[key];
      const tableName = TABLE_MAPPINGS[key];
      const primaryKey = PRIMARY_KEYS[key];
      
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
      for (const record of data) {
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

