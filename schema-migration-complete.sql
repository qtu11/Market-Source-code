-- ============================================================
-- MIGRATION HOÀN CHỈNH: Cập nhật schema theo ERD yêu cầu
-- ============================================================
-- Chạy: psql $DATABASE_URL -f schema-migration-complete.sql
-- Hoặc: node scripts/run-migration.js schema-migration-complete.sql
-- ============================================================

-- ============================================================
-- 1. CẬP NHẬT BẢNG USERS
-- ============================================================

-- Thêm cột name nếu chưa có
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'name'
  ) THEN
    ALTER TABLE users ADD COLUMN name VARCHAR(100);
    -- Copy từ username nếu có
    UPDATE users SET name = username WHERE name IS NULL AND username IS NOT NULL;
  END IF;
END $$;

-- Thêm cột avatar_url nếu chưa có
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Thêm cột ip_address nếu chưa có
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE users ADD COLUMN ip_address VARCHAR(45);
    CREATE INDEX IF NOT EXISTS idx_users_ip_address ON users(ip_address);
  END IF;
END $$;

-- Thêm cột role nếu chưa có (dùng ENUM)
DO $$ 
BEGIN
  -- Tạo ENUM type nếu chưa có
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
    CREATE TYPE user_role_enum AS ENUM ('user', 'admin');
  END IF;
  
  -- Thêm cột role nếu chưa có
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role user_role_enum DEFAULT 'user';
    -- Set role = 'admin' cho users có trong bảng admin
    UPDATE users SET role = 'admin' 
    WHERE id IN (SELECT user_id FROM admin);
    
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  END IF;
END $$;

-- ============================================================
-- 2. CẬP NHẬT BẢNG PRODUCTS
-- ============================================================

-- Thêm user_id (FK) nếu chưa có (người đăng bán)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'user_id'
  ) THEN
    -- Thêm cột nullable trước
    ALTER TABLE products ADD COLUMN user_id INT;
    
    -- Set default user_id = 1 (hoặc admin user) nếu có
    -- Nếu không có admin, để NULL tạm thời
    UPDATE products SET user_id = (
      SELECT user_id FROM admin LIMIT 1
    ) WHERE user_id IS NULL;
    
    -- Thêm FK constraint
    ALTER TABLE products 
    ADD CONSTRAINT fk_products_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
  END IF;
END $$;

-- Thêm thumbnail nếu chưa có (đổi từ image_url nếu cần)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'thumbnail'
  ) THEN
    ALTER TABLE products ADD COLUMN thumbnail TEXT;
    -- Copy từ image_url nếu có
    UPDATE products SET thumbnail = image_url WHERE thumbnail IS NULL AND image_url IS NOT NULL;
  END IF;
END $$;

-- Đổi download_url thành file_url nếu cần
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE products ADD COLUMN file_url TEXT;
    -- Copy từ download_url nếu có
    UPDATE products SET file_url = download_url WHERE file_url IS NULL AND download_url IS NOT NULL;
  END IF;
END $$;

-- ============================================================
-- 3. CẬP NHẬT BẢNG TRANSACTIONS (hoặc dùng deposits/withdrawals)
-- ============================================================

-- Đảm bảo deposits có status enum
DO $$ 
BEGIN
  -- Tạo ENUM nếu chưa có
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status_enum') THEN
    CREATE TYPE transaction_status_enum AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- Đảm bảo withdrawals có status enum tương tự
-- (Đã dùng VARCHAR(50) với DEFAULT 'pending', có thể giữ nguyên hoặc đổi sang ENUM)

-- ============================================================
-- 4. TẠO BẢNG REVIEWS (nếu chưa có)
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE (user_id, product_id) -- Mỗi user chỉ đánh giá 1 lần cho 1 sản phẩm
);

-- Indexes cho reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);

-- View để tính average rating cho mỗi product
CREATE OR REPLACE VIEW product_ratings AS
SELECT 
  product_id,
  COUNT(*) as review_count,
  AVG(rating)::DECIMAL(3,2) as average_rating,
  MIN(rating) as min_rating,
  MAX(rating) as max_rating
FROM reviews
GROUP BY product_id;

-- ============================================================
-- 5. TẠO BẢNG CHATS (theo ERD yêu cầu)
-- ============================================================

CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  admin_id INT,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes cho chats
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_admin_id ON chats(admin_id);
CREATE INDEX IF NOT EXISTS idx_chats_is_admin ON chats(is_admin);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);

-- Migration: Copy dữ liệu từ user_messages sang chats (nếu có)
DO $$ 
BEGIN
  -- Chỉ migrate nếu user_messages tồn tại và chats còn trống
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_messages')
     AND NOT EXISTS (SELECT 1 FROM chats LIMIT 1)
     AND EXISTS (SELECT 1 FROM user_messages LIMIT 1)
  THEN
    INSERT INTO chats (user_id, admin_id, message, is_admin, created_at)
    SELECT 
      CASE 
        WHEN EXISTS (SELECT 1 FROM admin WHERE user_id = um.sender_id) 
        THEN um.receiver_id  -- Nếu sender là admin, user_id = receiver
        ELSE um.sender_id    -- Nếu sender là user, user_id = sender
      END as user_id,
      CASE 
        WHEN EXISTS (SELECT 1 FROM admin WHERE user_id = um.sender_id) 
        THEN um.sender_id    -- Nếu sender là admin, admin_id = sender
        ELSE (SELECT user_id FROM admin LIMIT 1) -- Tìm admin user
      END as admin_id,
      um.content as message,
      EXISTS (SELECT 1 FROM admin WHERE user_id = um.sender_id) as is_admin,
      um.created_at
    FROM user_messages um
    WHERE NOT EXISTS (
      SELECT 1 FROM chats c 
      WHERE c.user_id = CASE 
        WHEN EXISTS (SELECT 1 FROM admin WHERE user_id = um.sender_id) 
        THEN um.receiver_id 
        ELSE um.sender_id 
      END
      AND c.message = um.content
      AND c.created_at = um.created_at
    );
  END IF;
END $$;

-- ============================================================
-- 6. CẬP NHẬT BẢNG NOTIFICATIONS
-- ============================================================

-- Tạo ENUM cho notification type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN
    CREATE TYPE notification_type_enum AS ENUM ('system', 'deposit', 'withdraw', 'chat');
  END IF;
END $$;

-- Cập nhật bảng notifications nếu chưa có cột type hoặc title
DO $$ 
BEGIN
  -- Thêm cột title nếu chưa có
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'title'
  ) THEN
    ALTER TABLE notifications ADD COLUMN title VARCHAR(255);
  END IF;
  
  -- Cập nhật type nếu đang là VARCHAR và chưa có constraint
  -- (Giữ nguyên VARCHAR(50) vì có thể đã có dữ liệu, hoặc đổi sang ENUM sau)
END $$;

-- ============================================================
-- 7. TRIGGER & FUNCTIONS
-- ============================================================

-- Trigger function để update updated_at cho reviews
CREATE OR REPLACE FUNCTION update_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động update updated_at cho reviews
DROP TRIGGER IF EXISTS trigger_update_review_timestamp ON reviews;
CREATE TRIGGER trigger_update_review_timestamp
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_review_timestamp();

-- ============================================================
-- 8. HOÀN TẤT MIGRATION
-- ============================================================

SELECT 'Schema migration completed successfully!' as status;

-- Hiển thị summary
SELECT 
  'Users table columns' as check_type,
  string_agg(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_name = 'users'
UNION ALL
SELECT 
  'Products table columns' as check_type,
  string_agg(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_name = 'products'
UNION ALL
SELECT 
  'Chats table exists' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chats') 
       THEN 'YES' 
       ELSE 'NO' 
  END as columns
UNION ALL
SELECT 
  'Reviews table exists' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') 
       THEN 'YES' 
       ELSE 'NO' 
  END as columns;

