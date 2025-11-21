#!/usr/bin/env node

/**
 * Seed Supabase (PostgreSQL) with minimum data required to pass verification.
 *
 * Usage:
 *   node scripts/seed-supabase-data.js
 *
 * Steps:
 *  1. Ensure .env.local (or .env) contains DATABASE_URL or DB_* variables.
 *  2. Script will insert:
 *     - Admin user (email from ADMIN_EMAIL or default)
 *     - Sample product if none exists
 *     - Sample transaction/notification hooks when data absent
 */

const fs = require("fs")
const path = require("path")
const { Pool } = require("pg")
const bcrypt = require("bcryptjs")
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
  log.warn("No .env.local or .env found. Relying on current env values.")
}

function resolveConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
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

async function ensureAdmin(pool) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@qtus.dev"
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123"
  const adminName = process.env.ADMIN_NAME || "QTUS Admin"
  const adminUsername = process.env.ADMIN_USERNAME || "qtusadmin"

  const { rows } = await pool.query("SELECT id FROM users WHERE email = $1", [adminEmail])
  if (rows.length > 0) {
    log.success(`Admin user already exists (${adminEmail})`)
    return rows[0].id
  }

  const hash = await bcrypt.hash(adminPassword, 10)
  const insert = await pool.query(
    `INSERT INTO users (username, name, email, password_hash, role, balance, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'admin', 0, 'active', NOW(), NOW())
     RETURNING id`,
    [adminUsername, adminName, adminEmail, hash]
  )
  log.success(`Admin user created (${adminEmail}) with default password.`)
  return insert.rows[0].id
}

async function ensureProduct(pool, adminId) {
  const { rows } = await pool.query("SELECT id FROM products LIMIT 1")
  if (rows.length > 0) {
    log.success("At least one product already exists")
    return rows[0].id
  }

  const insert = await pool.query(
    `INSERT INTO products (title, description, price, category, demo_url, download_url, tags, image_url, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW(), NOW())
     RETURNING id`,
    [
      "Gói Starter QTUS",
      "Sản phẩm mẫu được seed tự động.",
      49.0,
      "starter",
      "https://qtus.dev/demo",
      "https://qtus.dev/download/starter.zip",
      ["starter", "demo"],
      "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4",
    ]
  )
  log.success("Sample product created")
  return insert.rows[0].id
}

async function ensureTransaction(pool, userId, productId) {
  const { rows } = await pool.query("SELECT id FROM transactions LIMIT 1")
  if (rows.length > 0) {
    log.success("Transactions table already has data")
    return
  }

  await pool.query(
    `INSERT INTO transactions (user_id, type, amount, payment_method, transaction_details, created_at)
     VALUES ($1, 'purchase', 49.0, 'balance', jsonb_build_object('product_id', $2::int, 'status', 'completed'), NOW())`,
    [userId, productId]
  )
  log.success("Sample transaction inserted")
}

async function ensureNotification(pool, userId) {
  const { rows } = await pool.query("SELECT id FROM notifications LIMIT 1")
  if (rows.length > 0) {
    log.success("Notifications table already has data")
    return
  }

  await pool.query(
    `INSERT INTO notifications (user_id, type, message, is_read, created_at)
     VALUES ($1, 'system', 'Chào mừng bạn đến QTUS Dev Market.', FALSE, NOW())`,
    [userId]
  )
  log.success("Sample notification inserted")
}

async function main() {
  loadEnvFile()

  const connectionString = resolveConnectionString()
  if (!connectionString) {
    log.error("Missing DATABASE_URL / DB_* env vars. Run scripts/setup-supabase-env.ps1 first.")
    process.exit(1)
  }

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    const adminId = await ensureAdmin(pool)
    const productId = await ensureProduct(pool, adminId)
    await ensureTransaction(pool, adminId, productId)
    await ensureNotification(pool, adminId)
    log.success("Seeding complete.")
  } catch (error) {
    log.error(error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

main()

