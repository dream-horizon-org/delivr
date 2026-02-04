/**
 * Setup Script Constants
 * 
 * Shared constants for setup scripts (create-schema.ts, seed-data.ts)
 */

// ─────────────────────────────────────────────────────────────
// Console Colors
// ─────────────────────────────────────────────────────────────

export const CONSOLE_COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
} as const;

// ─────────────────────────────────────────────────────────────
// Logger Functions
// ─────────────────────────────────────────────────────────────

export const setupLogger = {
  info: (msg: string) => console.log(`${CONSOLE_COLORS.BLUE}ℹ${CONSOLE_COLORS.RESET} ${msg}`),
  success: (msg: string) => console.log(`${CONSOLE_COLORS.GREEN}✓${CONSOLE_COLORS.RESET} ${msg}`),
  warn: (msg: string) => console.log(`${CONSOLE_COLORS.YELLOW}⚠${CONSOLE_COLORS.RESET} ${msg}`),
  error: (msg: string) => console.log(`${CONSOLE_COLORS.RED}✗${CONSOLE_COLORS.RESET} ${msg}`),
};

export const seedLogger = {
  log: (msg: string) => console.log(`${CONSOLE_COLORS.GREEN}[seed]${CONSOLE_COLORS.RESET} ${msg}`),
  warn: (msg: string) => console.log(`${CONSOLE_COLORS.YELLOW}[seed]${CONSOLE_COLORS.RESET} ${msg}`),
  error: (msg: string) => console.log(`${CONSOLE_COLORS.RED}[seed]${CONSOLE_COLORS.RESET} ${msg}`),
};

// ─────────────────────────────────────────────────────────────
// Database Configuration Defaults
// ─────────────────────────────────────────────────────────────

export const DB_DEFAULTS = {
  HOST: 'localhost',
  USER: 'root',
  PASS: 'root',
  NAME: 'delivrdb',
} as const;

// ─────────────────────────────────────────────────────────────
// Query Result Types
// ─────────────────────────────────────────────────────────────

/**
 * Result type for table count query (used with Sequelize QueryTypes.SELECT)
 */
export type TableCountResult = {
  tableCount: number;
};

// ─────────────────────────────────────────────────────────────
// Seed Data Table Mappings
// ─────────────────────────────────────────────────────────────

/**
 * Maps JSON seed data keys to actual database table names
 */
export const SEED_TABLE_MAPPINGS: Record<string, string> = {
  accounts: 'accounts',
  tenants: 'tenants',
  apps: 'apps',
  collaborators: 'collaborators',
  deployments: 'deployments',
  accessKeys: 'accessKeys',
  platforms: 'platforms',
  targets: 'targets',
  platformStoreMappings: 'platform_store_type_mapping',
} as const;

/**
 * Primary key field for each seed data table (used for existence checks)
 */
export const SEED_PRIMARY_KEYS: Record<string, string> = {
  accounts: 'id',
  tenants: 'id',
  apps: 'id',
  collaborators: 'accountId', // Uses composite key, check by accountId
  deployments: 'id',
  accessKeys: 'id',
  platforms: 'id',
  targets: 'id',
  platformStoreMappings: 'id',
} as const;

/**
 * Order in which seed data should be inserted (respecting FK constraints)
 */
export const SEED_ORDER = [
  'accounts',
  'tenants',
  'apps',
  'collaborators',
  'deployments',
  'accessKeys',
  'platforms',
  'targets',
  'platformStoreMappings',
] as const;

