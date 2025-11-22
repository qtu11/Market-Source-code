/**
 * Script kiểm tra cấu hình database và kết nối
 * Chạy: node scripts/check-database-config.js
 */

const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 KIỂM TRA CẤU HÌNH DATABASE\n');
console.log('='.repeat(60));

// 1. Kiểm tra các biến môi trường
console.log('\n📋 1. KIỂM TRA BIẾN MÔI TRƯỜNG:');
console.log('-'.repeat(60));

const envVars = {
  'DATABASE_URL': process.env.DATABASE_URL,
  'DB_HOST': process.env.DB_HOST,
  'DB_NAME': process.env.DB_NAME,
  'DB_USER': process.env.DB_USER,
  'DB_PASSWORD': process.env.DB_PASSWORD,
  'DB_PORT': process.env.DB_PORT || '5432',
};

let hasConfig = false;
let configType = '';

// Kiểm tra DATABASE_URL
if (envVars.DATABASE_URL) {
  console.log('✅ DATABASE_URL: ĐÃ CẤU HÌNH');
  // Ẩn password trong URL
  const maskedUrl = envVars.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
  console.log(`   URL: ${maskedUrl.substring(0, 50)}...`);
  hasConfig = true;
  configType = 'DATABASE_URL';
} else {
  console.log('❌ DATABASE_URL: CHƯA CẤU HÌNH');
}

console.log('');

// Kiểm tra các biến riêng lẻ
if (envVars.DB_HOST) {
  console.log(`✅ DB_HOST: ${envVars.DB_HOST}`);
  hasConfig = true;
  if (!configType) configType = 'DB_*';
} else {
  console.log('❌ DB_HOST: CHƯA CẤU HÌNH');
}

if (envVars.DB_NAME) {
  console.log(`✅ DB_NAME: ${envVars.DB_NAME}`);
} else {
  console.log('❌ DB_NAME: CHƯA CẤU HÌNH (mặc định: postgres)');
}

if (envVars.DB_USER) {
  console.log(`✅ DB_USER: ${envVars.DB_USER}`);
} else {
  console.log('❌ DB_USER: CHƯA CẤU HÌNH (mặc định: qtusdev)');
}

if (envVars.DB_PASSWORD) {
  console.log(`✅ DB_PASSWORD: ĐÃ CẤU HÌNH (${'*'.repeat(envVars.DB_PASSWORD.length)})`);
} else {
  console.log('❌ DB_PASSWORD: CHƯA CẤU HÌNH ⚠️ BẮT BUỘC');
}

console.log(`✅ DB_PORT: ${envVars.DB_PORT}`);

// 2. Tóm tắt cấu hình
console.log('\n📊 2. TÓM TẮT CẤU HÌNH:');
console.log('-'.repeat(60));

if (!hasConfig || !envVars.DB_PASSWORD) {
  console.log('❌ THIẾU CẤU HÌNH DATABASE!');
  console.log('\n💡 CẦN CẤU HÌNH MỘT TRONG HAI CÁCH:');
  console.log('\n   CÁCH 1: Sử dụng DATABASE_URL (khuyến nghị)');
  console.log('   DATABASE_URL=postgresql://user:password@host:port/database');
  console.log('\n   CÁCH 2: Sử dụng các biến riêng lẻ');
  console.log('   DB_HOST=your-db-host');
  console.log('   DB_NAME=your-db-name');
  console.log('   DB_USER=your-db-user');
  console.log('   DB_PASSWORD=your-db-password (BẮT BUỘC)');
  console.log('   DB_PORT=5432 (tùy chọn)');
  process.exit(1);
}

console.log(`✅ Loại cấu hình: ${configType}`);
console.log(`✅ Đã có đủ thông tin để kết nối database`);

// 3. Kiểm tra kết nối database
console.log('\n🔌 3. KIỂM TRA KẾT NỐI DATABASE:');
console.log('-'.repeat(60));

async function testConnection() {
  let pool;
  
  try {
    // Tạo pool dựa trên cấu hình
    if (envVars.DATABASE_URL) {
      pool = new Pool({
        connectionString: envVars.DATABASE_URL,
        connectionTimeoutMillis: 5000,
      });
    } else {
      pool = new Pool({
        host: envVars.DB_HOST || 'db.qrozeqsmqvkqxqenhike.supabase.co',
        database: envVars.DB_NAME || 'postgres',
        user: envVars.DB_USER || 'qtusdev',
        password: envVars.DB_PASSWORD,
        port: parseInt(envVars.DB_PORT),
        connectionTimeoutMillis: 5000,
      });
    }

    console.log('⏳ Đang thử kết nối...');
    
    // Test connection
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    
    console.log('✅ KẾT NỐI THÀNH CÔNG!');
    console.log(`   Thời gian server: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    
    // Kiểm tra bảng products
    try {
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('products', 'users', 'product_ratings')
        ORDER BY table_name
      `);
      
      console.log('\n📊 4. KIỂM TRA BẢNG:');
      console.log('-'.repeat(60));
      
      const existingTables = tablesResult.rows.map(r => r.table_name);
      const requiredTables = ['products', 'users', 'product_ratings'];
      
      requiredTables.forEach(table => {
        if (existingTables.includes(table)) {
          console.log(`✅ Bảng "${table}": TỒN TẠI`);
        } else {
          console.log(`❌ Bảng "${table}": CHƯA TỒN TẠI`);
        }
      });
      
      // Kiểm tra số lượng products
      if (existingTables.includes('products')) {
        try {
          const countResult = await pool.query('SELECT COUNT(*) as count FROM products');
          console.log(`\n📦 Số lượng products: ${countResult.rows[0].count}`);
        } catch (err) {
          console.log(`\n⚠️  Không thể đếm products: ${err.message}`);
        }
      }
      
    } catch (err) {
      console.log(`\n⚠️  Lỗi khi kiểm tra bảng: ${err.message}`);
    }
    
    await pool.end();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TẤT CẢ KIỂM TRA HOÀN TẤT!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log('❌ KẾT NỐI THẤT BẠI!');
    console.log(`\n📝 Chi tiết lỗi:`);
    console.log(`   Code: ${error.code || 'N/A'}`);
    console.log(`   Message: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Lỗi: Không tìm thấy host database');
      console.log('   → Kiểm tra lại DB_HOST hoặc DATABASE_URL');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Lỗi: Kết nối bị từ chối');
      console.log('   → Kiểm tra lại DB_PORT và firewall');
    } else if (error.code === '28P01' || error.message?.includes('password')) {
      console.log('\n💡 Lỗi: Sai username hoặc password');
      console.log('   → Kiểm tra lại DB_USER và DB_PASSWORD');
    } else if (error.code === '3D000' || error.message?.includes('database')) {
      console.log('\n💡 Lỗi: Database không tồn tại');
      console.log('   → Kiểm tra lại DB_NAME');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 Lỗi: Timeout khi kết nối');
      console.log('   → Kiểm tra network và firewall');
    }
    
    if (pool) {
      await pool.end();
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('❌ KIỂM TRA THẤT BẠI!');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Chạy kiểm tra
testConnection().catch(err => {
  console.error('Lỗi không mong đợi:', err);
  process.exit(1);
});

