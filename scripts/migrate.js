/**
 * Database migration script for ClypherBot.
 *
 * Creates the exact same tables, indexes, and triggers that
 * src/utils/postgresDatabase.js expects at runtime.
 *
 * Usage:
 *   npm run migrate       — apply (create tables, indexes, triggers)
 *   npm run migrate:check — verify schema version matches
 *   npm run migrate:status— print current migration state
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../src/utils/logger.js';
import { EXPECTED_SCHEMA_LABEL, EXPECTED_SCHEMA_VERSION } from '../src/config/schemaVersion.js';
import { pgConfig, resolvePostgresPoolConfig } from '../src/config/postgres.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const T = pgConfig.tables; // shorthand for validated table names

const { Pool } = pg;

const pool = new Pool(resolvePostgresPoolConfig());

// ---------------------------------------------------------------------------
// Migration ledger
// ---------------------------------------------------------------------------

const ensureMigrationLedger = async (client) => {
  const table = pgConfig.migration.table;
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      version INTEGER PRIMARY KEY,
      label VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const recordSchemaVersion = async (client) => {
  await ensureMigrationLedger(client);
  await client.query(
    `INSERT INTO ${pgConfig.migration.table} (version, label)
     VALUES ($1, $2)
     ON CONFLICT (version)
     DO UPDATE SET label = EXCLUDED.label, applied_at = CURRENT_TIMESTAMP`,
    [EXPECTED_SCHEMA_VERSION, EXPECTED_SCHEMA_LABEL],
  );
};

const getCurrentSchemaVersion = async (client) => {
  await ensureMigrationLedger(client);
  const result = await client.query(
    `SELECT version, label, applied_at FROM ${pgConfig.migration.table} ORDER BY version DESC LIMIT 1`,
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

// ---------------------------------------------------------------------------
// Tables — must match createTables() in postgresDatabase.js exactly
// ---------------------------------------------------------------------------

const createTables = async (client) => {
  logger.info('Creating database tables...');

  const tables = [
    // Guilds — primary guild config + counters (JSONB)
    `CREATE TABLE IF NOT EXISTS ${T.guilds} (
      id VARCHAR(20) PRIMARY KEY,
      config JSONB DEFAULT '{}',
      counters JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Users — user metadata (referenced by FK)
    `CREATE TABLE IF NOT EXISTS ${T.users} (
      id VARCHAR(20) PRIMARY KEY,
      username VARCHAR(100),
      discriminator VARCHAR(10),
      avatar VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Guild-User junction
    `CREATE TABLE IF NOT EXISTS ${T.guild_users} (
      guild_id VARCHAR(20),
      user_id VARCHAR(20),
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, user_id),
      FOREIGN KEY (guild_id) REFERENCES ${T.guilds}(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES ${T.users}(id) ON DELETE CASCADE
    )`,

    // Birthdays
    `CREATE TABLE IF NOT EXISTS ${T.birthdays} (
      guild_id VARCHAR(20),
      user_id VARCHAR(20),
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, user_id),
      FOREIGN KEY (guild_id) REFERENCES ${T.guilds}(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES ${T.users}(id) ON DELETE CASCADE
    )`,

    // Giveaways
    `CREATE TABLE IF NOT EXISTS ${T.giveaways} (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(20),
      message_id VARCHAR(20) NOT NULL,
      data JSONB NOT NULL,
      ends_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guild_id) REFERENCES ${T.guilds}(id) ON DELETE CASCADE,
      UNIQUE(guild_id, message_id)
    )`,

    // Tickets (stored as ticked_data in the DB)
    `CREATE TABLE IF NOT EXISTS ${T.tickets} (
      guild_id VARCHAR(20),
      channel_id VARCHAR(20) PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      FOREIGN KEY (guild_id) REFERENCES ${T.guilds}(id) ON DELETE CASCADE
    )`,

    // AFK status
    `CREATE TABLE IF NOT EXISTS ${T.afk_status} (
      guild_id VARCHAR(20),
      user_id VARCHAR(20),
      reason TEXT,
      status_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      PRIMARY KEY (guild_id, user_id),
      FOREIGN KEY (guild_id) REFERENCES ${T.guilds}(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES ${T.users}(id) ON DELETE CASCADE
    )`,

    // Welcome configs (JSONB)
    `CREATE TABLE IF NOT EXISTS ${T.welcome_configs} (
      guild_id VARCHAR(20) PRIMARY KEY,
      config JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guild_id) REFERENCES ${T.guilds}(id) ON DELETE CASCADE
    )`,

    // Leveling configs (JSONB)
    `CREATE TABLE IF NOT EXISTS ${T.leveling_configs} (
      guild_id VARCHAR(20) PRIMARY KEY,
      config JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guild_id) REFERENCES ${T.guilds}(id) ON DELETE CASCADE
    )`,

    // User levels
    `CREATE TABLE IF NOT EXISTS ${T.user_levels} (
      guild_id VARCHAR(20),
      user_id VARCHAR(20),
      xp BIGINT DEFAULT 0,
      level INTEGER DEFAULT 0,
      total_xp BIGINT DEFAULT 0,
      last_message TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      rank INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, user_id),
      FOREIGN KEY (guild_id) REFERENCES ${T.guilds}(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES ${T.users}(id) ON DELETE CASCADE
    )`,

    // Economy
    `CREATE TABLE IF NOT EXISTS ${T.economy} (
      guild_id VARCHAR(20),
      user_id VARCHAR(20),
      balance BIGINT DEFAULT 0,
      bank BIGINT DEFAULT 0,
      data JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, user_id),
      FOREIGN KEY (guild_id) REFERENCES ${T.guilds}(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES ${T.users}(id) ON DELETE CASCADE
    )`,

    // Verification audit log
    `CREATE TABLE IF NOT EXISTS ${T.verification_audit} (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(20) NOT NULL,
      user_id VARCHAR(20) NOT NULL,
      action VARCHAR(50) NOT NULL,
      source VARCHAR(50),
      moderator_id VARCHAR(20),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Invite tracking
    `CREATE TABLE IF NOT EXISTS ${T.invite_tracking} (
      guild_id VARCHAR(20),
      inviter_id VARCHAR(20),
      invite_code VARCHAR(20),
      uses INTEGER DEFAULT 0,
      data JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, invite_code),
      FOREIGN KEY (guild_id) REFERENCES ${T.guilds}(id) ON DELETE CASCADE
    )`,

    // Application roles config
    `CREATE TABLE IF NOT EXISTS ${T.application_roles} (
      guild_id VARCHAR(20),
      role_id VARCHAR(20),
      data JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, role_id),
      FOREIGN KEY (guild_id) REFERENCES ${T.guilds}(id) ON DELETE CASCADE
    )`,

    // Temp data (KV with TTL)
    `CREATE TABLE IF NOT EXISTS ${T.temp_data} (
      key VARCHAR(255) PRIMARY KEY,
      value JSONB NOT NULL,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Cache data (KV with TTL)
    `CREATE TABLE IF NOT EXISTS ${T.cache_data} (
      key VARCHAR(255) PRIMARY KEY,
      value JSONB NOT NULL,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const ddl of tables) {
    try {
      await client.query(ddl);
    } catch (error) {
      logger.error('Error creating table:', error);
      throw error;
    }
  }

  // Warn about orphaned tables from the old migration schema (pre-v2.1.0)
  const orphanedTables = ['guild_configs', 'user_economy', 'audit_logs', 'giveaway_entries', 'reaction_roles', 'welcome_system', 'counters'];
  for (const table of orphanedTables) {
    try {
      const result = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) AS exists`, [table]);
      if (result.rows[0]?.exists) {
        logger.warn(`Orphaned table "${table}" found from old schema. This table is no longer used and can be safely dropped with: DROP TABLE IF EXISTS ${table};`);
      }
    } catch {
      // ignore check errors
    }
  }

  logger.info('All tables created successfully');
};

// ---------------------------------------------------------------------------
// Indexes — must match createIndexes() in postgresDatabase.js
// ---------------------------------------------------------------------------

const createIndexes = async (client) => {
  logger.info('Creating indexes...');

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_guild_users_guild_id ON ${T.guild_users}(guild_id)`,
    `CREATE INDEX IF NOT EXISTS idx_guild_users_user_id ON ${T.guild_users}(user_id)`,

    `CREATE INDEX IF NOT EXISTS idx_birthdays_guild_id ON ${T.birthdays}(guild_id)`,
    `CREATE INDEX IF NOT EXISTS idx_birthdays_month_day ON ${T.birthdays}(month, day)`,

    `CREATE INDEX IF NOT EXISTS idx_giveaways_guild_id ON ${T.giveaways}(guild_id)`,
    `CREATE INDEX IF NOT EXISTS idx_giveaways_ends_at ON ${T.giveaways}(ends_at)`,

    `CREATE INDEX IF NOT EXISTS idx_tickets_guild_id ON ${T.tickets}(guild_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tickets_expires_at ON ${T.tickets}(expires_at)`,

    `CREATE INDEX IF NOT EXISTS idx_afk_status_guild_id ON ${T.afk_status}(guild_id)`,
    `CREATE INDEX IF NOT EXISTS idx_afk_status_expires_at ON ${T.afk_status}(expires_at)`,

    `CREATE INDEX IF NOT EXISTS idx_user_levels_guild_id ON ${T.user_levels}(guild_id)`,
    `CREATE INDEX IF NOT EXISTS idx_user_levels_xp ON ${T.user_levels}(xp)`,

    `CREATE INDEX IF NOT EXISTS idx_economy_guild_id ON ${T.economy}(guild_id)`,

    `CREATE INDEX IF NOT EXISTS idx_verification_audit_guild_id ON ${T.verification_audit}(guild_id)`,
    `CREATE INDEX IF NOT EXISTS idx_verification_audit_user_id ON ${T.verification_audit}(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_verification_audit_created_at ON ${T.verification_audit}(created_at)`,

    `CREATE INDEX IF NOT EXISTS idx_temp_data_expires_at ON ${T.temp_data}(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_cache_data_expires_at ON ${T.cache_data}(expires_at)`,
  ];

  for (const ddl of indexes) {
    try {
      await client.query(ddl);
    } catch (error) {
      logger.warn('Error creating index:', error.message);
    }
  }

  logger.info('Indexes created successfully');
};

// ---------------------------------------------------------------------------
// Triggers — must match createAuditTriggers() in postgresDatabase.js
// ---------------------------------------------------------------------------

const createTriggers = async (client) => {
  logger.info('Creating update-at triggers...');

  // Shared helper function
  await client.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  const triggers = [
    { name: 'update_guilds_updated_at',             table: T.guilds },
    { name: 'update_users_updated_at',              table: T.users },
    { name: 'update_welcome_configs_updated_at',    table: T.welcome_configs },
    { name: 'update_leveling_configs_updated_at',   table: T.leveling_configs },
    { name: 'update_user_levels_updated_at',        table: T.user_levels },
    { name: 'update_economy_updated_at',            table: T.economy },
    { name: 'update_application_roles_updated_at',  table: T.application_roles },
    { name: 'update_invite_tracking_updated_at',    table: T.invite_tracking },
    { name: 'update_guild_users_updated_at',        table: T.guild_users },
    { name: 'update_birthdays_updated_at',          table: T.birthdays },
    { name: 'update_giveaways_updated_at',          table: T.giveaways },
    { name: 'update_tickets_updated_at',            table: T.tickets },
    { name: 'update_afk_status_updated_at',         table: T.afk_status },
  ];

  for (const { name, table } of triggers) {
    try {
      await client.query(`DROP TRIGGER IF EXISTS ${name} ON ${table}`);
      await client.query(`
        CREATE TRIGGER ${name}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    } catch (error) {
      logger.warn(`Error creating trigger ${name} on ${table}: ${error.message}`);
    }
  }

  logger.info('Triggers created successfully');
};

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const migrate = async () => {
  const client = await pool.connect();
  try {
    logger.info('Starting database migration...');
    await createTables(client);
    await createIndexes(client);
    await createTriggers(client);
    await recordSchemaVersion(client);
    logger.info('Migration completed successfully!');
    logger.info(`Schema version recorded: v${EXPECTED_SCHEMA_VERSION} (${EXPECTED_SCHEMA_LABEL})`);
    logger.info('Database is now ready for ClypherBot.');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

const checkMigrationVersion = async () => {
  const client = await pool.connect();
  try {
    const current = await getCurrentSchemaVersion(client);
    if (!current) {
      logger.error(`No schema version found. Expected v${EXPECTED_SCHEMA_VERSION}.`);
      process.exit(1);
    }
    const currentVersion = Number(current.version);
    if (currentVersion !== EXPECTED_SCHEMA_VERSION) {
      logger.error(`Schema drift detected. Expected v${EXPECTED_SCHEMA_VERSION}, found v${currentVersion}.`);
      process.exit(1);
    }
    logger.info(`Schema version check passed (v${currentVersion}, label: ${current.label}).`);
  } catch (error) {
    logger.error('Migration check failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

const printMigrationStatus = async () => {
  const client = await pool.connect();
  try {
    const current = await getCurrentSchemaVersion(client);
    if (!current) {
      logger.info(`No schema version recorded yet. Expected v${EXPECTED_SCHEMA_VERSION}.`);
      return;
    }
    logger.info(`Current schema version: v${current.version}`);
    logger.info(`Label: ${current.label}`);
    logger.info(`Applied at: ${current.applied_at}`);
    logger.info(`Expected: v${EXPECTED_SCHEMA_VERSION} (${EXPECTED_SCHEMA_LABEL})`);
  } catch (error) {
    logger.error('Migration status failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

const command = process.argv[2] || 'apply';

if (command === 'apply') {
  migrate();
} else if (command === 'check') {
  checkMigrationVersion();
} else if (command === 'status') {
  printMigrationStatus();
} else {
  logger.error(`Unknown command: ${command}. Use one of: apply, check, status`);
  process.exit(1);
}
