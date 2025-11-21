#!/usr/bin/env node

/**
 * Verify Supabase data completeness/health.
 *
 * Usage:
 *   node scripts/verify-supabase-data.js
 *
 * The script will:
 *  - Load DATABASE_URL / DB_* vars from .env.local (fallback .env / process.env)
 *  - Run a set of sanity queries (table existence, row counts, admin availability)
 *  - Exit with code 0 when everything looks good, otherwise 1 with detailed logs
 */

const fs = require("fs")
const path = require("path")
const { Pool } = require("pg")
const dotenv = require("dotenv")

const projectRoot = path.resolve(__dirname, "..")
const envLocalPath = path.join(projectRoot, ".env.local")
const envPath = path.join(projectRoot, ".env")

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
}

function loadEnvFile() {
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath })
    log.info("Loaded environment variables from .env.local")
    return
  }
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    log.info("Loaded environment variables from .env")
    return
  }
  log.warn("No .env.local or .env found. Relying on existing process.env values")
}

function resolveConnectionString() {
  const direct = process.env.DATABASE_URL
  if (direct) return direct

  const host = process.env.DB_HOST
  const port = process.env.DB_PORT || "5432"
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD
  const db = process.env.DB_NAME || "postgres"

  if (host && user && password) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`
  }
  return null
}

async function main() {
  loadEnvFile()

  const connectionString = resolveConnectionString()
  if (!connectionString) {
    log.error("DATABASE_URL or DB_* variables are missing. Please run scripts/setup-supabase-env.ps1 first.")
    process.exit(1)
  }

  log.info(`Connecting to Supabase using ${connectionString.replace(/:[^:]*@/, ":[REDACTED]@")}`)

  const pool = new Pool({
    connectionString,
    max: process.env.NETLIFY === "true" ? 1 : 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  const checks = [
    {
      name: "users table",
      sql: "SELECT COUNT(*)::int AS count FROM users",
      min: 1,
      message: "At least 1 user must exist",
    },
    {
      name: "admin users",
      sql: "SELECT COUNT(*)::int AS count FROM users WHERE role IN ('admin','superadmin')",
      min: 1,
      message: "At least 1 admin/superadmin required",
    },
    {
      name: "products table",
      sql: "SELECT COUNT(*)::int AS count FROM products",
      min: 1,
      message: "At least 1 product required",
    },
    {
      name: "transactions table",
      sql: "SELECT COUNT(*)::int AS count FROM transactions",
      min: 0,
    },
    {
      name: "notifications table",
      sql: "SELECT COUNT(*)::int AS count FROM notifications",
      min: 0,
    },
    {
      name: "recent user activity (30d)",
      sql: "SELECT COUNT(*)::int AS count FROM users WHERE COALESCE(updated_at, created_at) >= NOW() - INTERVAL '30 days'",
      min: 1,
      message: "Need at least 1 active user in last 30 days",
    },
  ]

  const missingTables = []
  const tableListResult = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  )
  const tableSet = new Set(tableListResult.rows.map((row) => row.table_name))
  const requiredTables = ["users", "products", "transactions", "notifications", "withdrawals", "deposits", "reviews"]
  requiredTables.forEach((tbl) => {
    if (!tableSet.has(tbl)) {
      missingTables.push(tbl)
    }
  })

  if (missingTables.length > 0) {
    missingTables.forEach((tbl) => log.error(`Table missing: ${tbl}`))
    log.error("Schema incomplete. Run scripts/migrate-to-supabase.ps1")
    await pool.end()
    process.exit(1)
  }
  log.success("All required tables exist")

  let hasFailures = false
  for (const check of checks) {
    try {
      const { rows } = await pool.query(check.sql)
      const count = rows[0]?.count ?? 0
      const status =
        typeof check.min === "number"
          ? count >= check.min
            ? "pass"
            : "fail"
          : "pass"
      if (status === "pass") {
        log.success(`${check.name}: ${count}`)
      } else {
        hasFailures = true
        log.error(`${check.name}: ${count} (expected >= ${check.min})${check.message ? ` – ${check.message}` : ""}`)
      }
    } catch (error) {
      hasFailures = true
      log.error(`${check.name}: query failed – ${error.message}`)
    }
  }

  await pool.end()

  if (hasFailures) {
    log.error("Supabase data verification failed.")
    process.exit(1)
  }

  log.success("Supabase data looks healthy.")
  process.exit(0)
}

main().catch((error) => {
  log.error(error.message)
  process.exit(1)
})

