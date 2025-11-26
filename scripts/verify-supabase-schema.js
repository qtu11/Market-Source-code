/**
 * Script kiểm tra và verify schema Supabase với code
 * Chạy: node scripts/verify-supabase-schema.js
 */

const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 KIỂM TRA SCHEMA SUPABASE\n');
console.log('='.repeat(60));

async function verifySchema() {
  let pool;
  
  try {
    // Tạo pool connection
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000,
      });
    } else {
      pool = new Pool({
        host: process.env.DB_HOST || 'db.qrozeqsmqvkqxqenhike.supabase.co',
        database: process.env.DB_NAME || 'postgres',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
        connectionTimeoutMillis: 5000,
      });
    }

    console.log('⏳ Đang kết nối và kiểm tra schema...\n');

    // 1. Kiểm tra bảng products
    console.log('📊 1. KIỂM TRA BẢNG PRODUCTS:');
    console.log('-'.repeat(60));
    
    const productsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'products' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    const expectedProductsColumns = [
      'id', 'title', 'description', 'price', 'category', 
      'demo_url', 'download_url', 'tags', 'image_url', 
      'is_active', 'created_at', 'updated_at'
    ];
    
    const actualColumns = productsColumns.rows.map(r => r.column_name);
    
    console.log('✅ Các cột hiện có:');
    productsColumns.rows.forEach(col => {
      const isExpected = expectedProductsColumns.includes(col.column_name);
      const status = isExpected ? '✅' : '⚠️';
      console.log(`   ${status} ${col.column_name} (${col.data_type})`);
    });
    
    const missingColumns = expectedProductsColumns.filter(col => !actualColumns.includes(col));
    if (missingColumns.length > 0) {
      console.log('\n❌ Các cột thiếu:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
    } else {
      console.log('\n✅ Tất cả cột cần thiết đều có!');
    }
    
    // Kiểm tra download_count (optional)
    const hasDownloadCount = actualColumns.includes('download_count');
    if (hasDownloadCount) {
      console.log('ℹ️  Cột download_count có tồn tại (optional)');
    } else {
      console.log('ℹ️  Cột download_count không tồn tại (code sẽ tự động handle)');
    }

    // 2. Kiểm tra bảng product_ratings
    console.log('\n📊 2. KIỂM TRA BẢNG PRODUCT_RATINGS:');
    console.log('-'.repeat(60));
    
    const ratingsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'product_ratings' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    const expectedRatingsColumns = ['product_id', 'average_rating', 'total_ratings', 'updated_at'];
    const actualRatingsColumns = ratingsColumns.rows.map(r => r.column_name);
    
    console.log('✅ Các cột hiện có:');
    ratingsColumns.rows.forEach(col => {
      const isExpected = expectedRatingsColumns.includes(col.column_name);
      const status = isExpected ? '✅' : '⚠️';
      console.log(`   ${status} ${col.column_name} (${col.data_type})`);
    });
    
    const missingRatingsColumns = expectedRatingsColumns.filter(col => !actualRatingsColumns.includes(col));
    if (missingRatingsColumns.length > 0) {
      console.log('\n❌ Các cột thiếu:');
      missingRatingsColumns.forEach(col => console.log(`   - ${col}`));
    } else {
      console.log('\n✅ Tất cả cột cần thiết đều có!');
    }

    // 3. Kiểm tra bảng users
    console.log('\n📊 3. KIỂM TRA BẢNG USERS:');
    console.log('-'.repeat(60));
    
    const usersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    const expectedUsersColumns = [
      'id', 'username', 'name', 'email', 'password_hash', 
      'avatar_url', 'ip_address', 'role', 'balance', 
      'created_at', 'updated_at', 'status'
    ];
    
    const actualUsersColumns = usersColumns.rows.map(r => r.column_name);
    
    console.log('✅ Các cột hiện có:');
    usersColumns.rows.forEach(col => {
      const isExpected = expectedUsersColumns.includes(col.column_name);
      const status = isExpected ? '✅' : '⚠️';
      console.log(`   ${status} ${col.column_name} (${col.data_type})`);
    });
    
    const missingUsersColumns = expectedUsersColumns.filter(col => !actualUsersColumns.includes(col));
    if (missingUsersColumns.length > 0) {
      console.log('\n❌ Các cột thiếu:');
      missingUsersColumns.forEach(col => console.log(`   - ${col}`));
    } else {
      console.log('\n✅ Tất cả cột cần thiết đều có!');
    }

    // 4. Kiểm tra các bảng quan trọng khác
    console.log('\n📊 4. KIỂM TRA CÁC BẢNG KHÁC:');
    console.log('-'.repeat(60));
    
    const importantTables = [
      'admin', 'deposits', 'withdrawals', 'purchases', 
      'reviews', 'notifications', 'sessions', 'chats'
    ];
    
    const allTables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const existingTables = allTables.rows.map(r => r.table_name);
    
    importantTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`✅ Bảng "${table}": TỒN TẠI`);
      } else {
        console.log(`❌ Bảng "${table}": CHƯA TỒN TẠI`);
      }
    });

    // 5. Kiểm tra indexes
    console.log('\n📊 5. KIỂM TRA INDEXES:');
    console.log('-'.repeat(60));
    
    const indexes = await pool.query(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('products', 'users', 'product_ratings')
      ORDER BY tablename, indexname
    `);
    
    if (indexes.rows.length > 0) {
      console.log('✅ Các indexes hiện có:');
      indexes.rows.forEach(idx => {
        console.log(`   - ${idx.tablename}.${idx.indexname}`);
      });
    } else {
      console.log('⚠️  Không tìm thấy indexes (có thể ảnh hưởng performance)');
    }

    // 6. Kiểm tra foreign keys
    console.log('\n📊 6. KIỂM TRA FOREIGN KEYS:');
    console.log('-'.repeat(60));
    
    const foreignKeys = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name IN ('products', 'product_ratings', 'users')
      ORDER BY tc.table_name
    `);
    
    if (foreignKeys.rows.length > 0) {
      console.log('✅ Các foreign keys:');
      foreignKeys.rows.forEach(fk => {
        console.log(`   - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }

    // 7. Test query
    console.log('\n📊 7. TEST QUERY:');
    console.log('-'.repeat(60));
    
    try {
      const testQuery = await pool.query(`
        SELECT p.*, 
               pr.average_rating, 
               pr.total_ratings,
               0 as download_count
        FROM products p
        LEFT JOIN product_ratings pr ON p.id = pr.product_id
        LIMIT 1
      `);
      
      console.log('✅ Query test thành công!');
      if (testQuery.rows.length > 0) {
        console.log(`   Số lượng products: ${testQuery.rows.length}`);
        console.log(`   Sample product ID: ${testQuery.rows[0].id}`);
      } else {
        console.log('   ⚠️  Chưa có products nào trong database');
      }
    } catch (error) {
      console.log('❌ Query test thất bại:');
      console.log(`   ${error.message}`);
    }

    await pool.end();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ KIỂM TRA HOÀN TẤT!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log('❌ LỖI KHI KIỂM TRA:');
    console.log(`   ${error.message}`);
    if (error.code) {
      console.log(`   Code: ${error.code}`);
    }
    if (pool) {
      await pool.end();
    }
    process.exit(1);
  }
}

verifySchema();

