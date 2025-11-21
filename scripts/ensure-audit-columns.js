#!/usr/bin/env node

/**
 * Ensure every public table has created_at, updated_at, deleted_at
 * columns plus auto updated_at triggers.
 */

const fs = require('fs');
const path = require('path');
const envPath =
  process.env.ENV_FILE ||
  (fs.existsSync(path.resolve('.env.local')) ? '.env.local' : '.env');
require('dotenv').config({ path: envPath });
const { Pool } = require('pg');

function buildPoolConfig() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(process.env.DB_PORT || url.port || '5433', 10),
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
      };
    } catch (error) {
      console.warn('⚠️  Failed to parse DATABASE_URL, falling back to discrete env vars.');
    }
  }

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error(
      'Missing database environment variables. Please set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME.'
    );
  }

  return {
    host: DB_HOST,
    port: parseInt(DB_PORT || '5433', 10),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  };
}

const AUDIT_COLUMNS = [
  { name: 'created_at', definition: 'TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP' },
  { name: 'updated_at', definition: 'TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP' },
  { name: 'deleted_at', definition: 'TIMESTAMPTZ' },
];

function quoteIdent(value = '') {
  return `"${value.replace(/"/g, '""')}"`;
}

async function ensureAuditColumns() {
  const pool = new Pool(buildPoolConfig());

  try {
    console.log('\n🛠️  Ensuring audit columns (created_at, updated_at, deleted_at)...\n');

    await pool.query(`
      CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$;
    `);

    const tables = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
      ORDER BY tablename
    `);

    for (const row of tables.rows) {
      const table = row.tablename;
      const tableIdent = quoteIdent(table);
      console.log(`➡️  ${table}`);

      for (const column of AUDIT_COLUMNS) {
        const alterSql = `ALTER TABLE ${tableIdent} ADD COLUMN IF NOT EXISTS ${column.name} ${column.definition};`;
        await pool.query(alterSql);
      }

      const hasUpdatedAt = await pool.query(
        `
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
            AND column_name = 'updated_at'
          LIMIT 1
        `,
        [table],
      );

      if (hasUpdatedAt.rowCount > 0) {
        const triggerName = quoteIdent(`set_updated_at_${table}`);
        await pool.query(`DROP TRIGGER IF EXISTS ${triggerName} ON ${tableIdent};`);
        await pool.query(`
          CREATE TRIGGER ${triggerName}
          BEFORE UPDATE ON ${tableIdent}
          FOR EACH ROW
          EXECUTE FUNCTION public.set_updated_at_timestamp();
        `);
      }
    }

    console.log('\n✅ Audit columns ensured for all public tables.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to ensure audit columns');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

ensureAuditColumns();

