#!/usr/bin/env node

/**
 * Script health check database - dùng cho production monitoring
 * Chạy: node scripts/database-health-check.js
 */

require('dotenv').config();
const { Pool } = require('pg');

async function healthCheck() {
  let pool;
  
  try {
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        connectionTimeoutMillis: 5000,
      });
    } else {
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'qtusdevmarket',
        user: process.env.DB_USER || 'qtusdev',
        password: process.env.DB_PASSWORD || '',
        port: parseInt(process.env.DB_PORT || '5433'),
        max: 5,
        connectionTimeoutMillis: 5000,
      });
    }

    // Test connection
    const result = await pool.query('SELECT NOW() as timestamp, version() as version');
    
    console.log(JSON.stringify({
      status: 'healthy',
      timestamp: result.rows[0].timestamp,
      database: 'connected',
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
    }));

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.log(JSON.stringify({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    }));
    
    if (pool) {
      await pool.end();
    }
    process.exit(1);
  }
}

healthCheck();

