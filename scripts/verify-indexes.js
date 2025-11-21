/**
 * Verify Database Indexes
 * ✅ PERFORMANCE FIX: Script để verify indexes đã được tạo
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'qtusdevmarket',
    user: process.env.DB_USER || 'qtusdev',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5433'),
  },
});

const REQUIRED_INDEXES = {
  users: [
    'idx_users_email',
    'idx_users_username',
    'idx_users_email_role',
    'idx_users_role_status',
    'idx_users_created_at_desc',
  ],
  products: [
    'idx_products_category_active',
    'idx_products_price',
    'idx_products_title_lower',
    'idx_products_created_at_desc',
  ],
  purchases: [
    'idx_purchases_user_product',
    'idx_purchases_user_product_unique', // UNIQUE
    'idx_purchases_user_created',
    'idx_purchases_product_created',
  ],
  deposits: [
    'idx_deposits_user_status',
    'idx_deposits_user_created',
    'idx_deposits_status_created',
  ],
  withdrawals: [
    'idx_withdrawals_user_status',
    'idx_withdrawals_user_created',
    'idx_withdrawals_status_created',
  ],
  chats: [
    'idx_chats_user_created',
    'idx_chats_admin_created',
    'idx_chats_user_admin_created',
  ],
  reviews: [
    'idx_reviews_product_created',
    'idx_reviews_user_created',
    'idx_reviews_product_rating',
  ],
  notifications: [
    'idx_notifications_user_read',
    'idx_notifications_user_unread',
  ],
};

async function verifyIndexes() {
  try {
    console.log('🔍 Verifying database indexes...\n');

    // Get all indexes
    const result = await pool.query(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN (${Object.keys(REQUIRED_INDEXES).map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY tablename, indexname
    `, Object.keys(REQUIRED_INDEXES));

    const indexes = result.rows;
    const indexesByTable = {};

    // Group by table
    indexes.forEach(index => {
      if (!indexesByTable[index.tablename]) {
        indexesByTable[index.tablename] = [];
      }
      indexesByTable[index.tablename].push(index.indexname);
    });

    let allGood = true;
    const missing = [];
    const found = [];

    // Check each table
    for (const [table, requiredIndexes] of Object.entries(REQUIRED_INDEXES)) {
      const existingIndexes = indexesByTable[table] || [];
      
      console.log(`\n📊 Table: ${table}`);
      console.log(`   Required: ${requiredIndexes.length} indexes`);
      console.log(`   Found: ${existingIndexes.length} indexes`);

      // Check each required index
      for (const requiredIndex of requiredIndexes) {
        if (existingIndexes.includes(requiredIndex)) {
          console.log(`   ✅ ${requiredIndex}`);
          found.push({ table, index: requiredIndex });
        } else {
          console.log(`   ❌ ${requiredIndex} - MISSING`);
          missing.push({ table, index: requiredIndex });
          allGood = false;
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Found: ${found.length} indexes`);
    console.log(`❌ Missing: ${missing.length} indexes`);

    if (missing.length > 0) {
      console.log('\n⚠️  Missing indexes:');
      missing.forEach(({ table, index }) => {
        console.log(`   - ${table}.${index}`);
      });
      console.log('\n💡 Run: psql -U <user> -d <database> -f database/add-missing-indexes-postgres.sql');
    }

    if (allGood) {
      console.log('\n✅ All required indexes are present!');
    }

    return { allGood, missing, found };
  } catch (error) {
    console.error('❌ Error verifying indexes:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  verifyIndexes()
    .then(({ allGood }) => {
      process.exit(allGood ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { verifyIndexes };

