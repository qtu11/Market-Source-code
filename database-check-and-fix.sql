-- ============================================================
-- DATABASE CHECK & FIX SCRIPT (PostgreSQL)
-- Mục tiêu:
--  - Kiểm tra nhanh schema core dùng trong hệ thống hiện tại
--  - Đảm bảo các bảng / cột / index quan trọng tồn tại
--  - Không phá dữ liệu hiện có (chỉ CREATE IF NOT EXISTS / ALTER IF NOT EXISTS)
--
-- Cách chạy (local):
--  psql "$DATABASE_URL" -f database-check-and-fix.sql
--  hoặc:
--  psql -h localhost -p 5433 -U qtusdev -d qtusdevmarket -f database-check-and-fix.sql
-- ============================================================

-- 1. CHECK SCHEMA VERSION / ENGINE
SELECT
  current_database()           AS db_name,
  current_user                 AS db_user,
  version()                    AS postgres_version,
  NOW()                        AS checked_at;

-- 2. ĐẢM BẢO BẢNG CORE TỒN TẠI (users, products, deposits, withdrawals, purchases, chats, notifications)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'Bảng users không tồn tại. Hãy chạy create-tables.sql trước.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    RAISE EXCEPTION 'Bảng products không tồn tại. Hãy chạy create-tables.sql trước.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'deposits'
  ) THEN
    RAISE EXCEPTION 'Bảng deposits không tồn tại. Hãy chạy create-tables.sql trước.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'withdrawals'
  ) THEN
    RAISE EXCEPTION 'Bảng withdrawals không tồn tại. Hãy chạy create-tables.sql trước.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'purchases'
  ) THEN
    RAISE EXCEPTION 'Bảng purchases không tồn tại. Hãy chạy create-tables.sql trước.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chats'
  ) THEN
    RAISE EXCEPTION 'Bảng chats không tồn tại. Hãy chạy create-tables.sql trước.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    RAISE EXCEPTION 'Bảng notifications không tồn tại. Hãy chạy create-tables.sql trước.';
  END IF;
END $$;

-- 3. ĐẢM BẢO CÁC CỘT QUAN TRỌNG CHO AUTH & AUDIT TỒN TẠI TRONG users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ip_address    VARCHAR(45),
  ADD COLUMN IF NOT EXISTS device_info   JSONB,
  ADD COLUMN IF NOT EXISTS login_count   INT        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP,
  ADD COLUMN IF NOT EXISTS name          VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_ip_address      ON users(ip_address);
CREATE INDEX IF NOT EXISTS idx_users_last_activity   ON users(last_activity);
CREATE INDEX IF NOT EXISTS idx_users_login_count     ON users(login_count);

-- 4. ĐẢM BẢO CỘT download_count & search_vector TRONG products (phục vụ analytics & tối ưu performance)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS download_count BIGINT      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_vector  tsvector;

-- Trigger cập nhật search_vector (nếu chưa tồn tại)
CREATE OR REPLACE FUNCTION update_product_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_search_vector ON products;
CREATE TRIGGER trigger_update_product_search_vector
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_search_vector();

-- GIN index cho full-text search
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN(search_vector);

-- 5. ĐẢM BẢO BẢNG downloads TỒN TẠI (phục vụ trackDownload + analytics)
CREATE TABLE IF NOT EXISTS downloads (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL,
  product_id    INT NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Index quan trọng cho kiểm tra 1 lần tải/ngày + thống kê
CREATE INDEX IF NOT EXISTS idx_downloads_user_product_date
  ON downloads (user_id, product_id, DATE(downloaded_at));
CREATE INDEX IF NOT EXISTS idx_downloads_user_created
  ON downloads (user_id, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_product_created
  ON downloads (product_id, downloaded_at DESC);

-- 6. ĐẢM BẢO BẢNG reviews & product_ratings PHÙ HỢP VỚI CODE HIỆN TẠI
CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL,
  product_id INT NOT NULL,
  rating     INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id      ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id   ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating       ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at   ON reviews(created_at);

CREATE TABLE IF NOT EXISTS product_ratings (
  product_id     INT PRIMARY KEY,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_ratings  INT           DEFAULT 0,
  updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 7. ĐẢM BẢO WISHLIST (đã dùng trong API / UI)
CREATE TABLE IF NOT EXISTS wishlists (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_product
  ON wishlists(user_id, product_id);

-- 8b. USER PROFILES (extended attributes + 2FA)
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(120),
  country VARCHAR(120),
  postal_code VARCHAR(32),
  social_links JSONB,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  two_factor_backup_codes TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- 8. KIỂM TRA NHANH CÁC BẢNG CHÍNH ĐANG CHỨA BAO NHIÊU DỮ LIỆU
SELECT
  'users'        AS table,
  COUNT(*)       AS total
FROM users
UNION ALL
SELECT 'products',      COUNT(*) FROM products
UNION ALL
SELECT 'deposits',      COUNT(*) FROM deposits
UNION ALL
SELECT 'withdrawals',   COUNT(*) FROM withdrawals
UNION ALL
SELECT 'purchases',     COUNT(*) FROM purchases
UNION ALL
SELECT 'chats',         COUNT(*) FROM chats
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;

-- 9. KẾT LUẬN
SELECT '✅ database-check-and-fix.sql completed successfully' AS status;

-- ============================================================
-- DATABASE CHECK & FIX SCRIPT
-- Kiểm tra và sửa các vấn đề database
-- ============================================================

-- ============================================================
-- 1. KIỂM TRA VÀ THÊM CÁC CỘT THIẾU TRONG USERS
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
    RAISE NOTICE 'Added column: users.name';
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
    RAISE NOTICE 'Added column: users.avatar_url';
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
    RAISE NOTICE 'Added column: users.ip_address';
  END IF;
END $$;

-- Thêm cột role nếu chưa có
DO $$ 
BEGIN
  -- Tạo ENUM type nếu chưa có
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
    CREATE TYPE user_role_enum AS ENUM ('user', 'admin');
    RAISE NOTICE 'Created ENUM: user_role_enum';
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
    RAISE NOTICE 'Added column: users.role';
  END IF;
END $$;

-- ============================================================
-- 2. KIỂM TRA VÀ THÊM CÁC CỘT THIẾU TRONG PRODUCTS
-- ============================================================

-- Thêm user_id nếu chưa có
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE products ADD COLUMN user_id INT;
    
    -- Set default user_id từ admin nếu có
    UPDATE products SET user_id = (
      SELECT user_id FROM admin LIMIT 1
    ) WHERE user_id IS NULL;
    
    -- Thêm FK constraint
    ALTER TABLE products 
    ADD CONSTRAINT fk_products_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
    RAISE NOTICE 'Added column: products.user_id';
  END IF;
END $$;

-- Thêm thumbnail nếu chưa có
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'thumbnail'
  ) THEN
    ALTER TABLE products ADD COLUMN thumbnail TEXT;
    -- Copy từ image_url nếu có
    UPDATE products SET thumbnail = image_url WHERE thumbnail IS NULL AND image_url IS NOT NULL;
    RAISE NOTICE 'Added column: products.thumbnail';
  END IF;
END $$;

-- Thêm file_url nếu chưa có
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE products ADD COLUMN file_url TEXT;
    -- Copy từ download_url nếu có
    UPDATE products SET file_url = download_url WHERE file_url IS NULL AND download_url IS NOT NULL;
    RAISE NOTICE 'Added column: products.file_url';
  END IF;
END $$;

-- ============================================================
-- 3. KIỂM TRA VÀ TẠO BẢNG REVIEWS
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

-- ============================================================
-- 4. KIỂM TRA VÀ TẠO BẢNG CHATS
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

-- Composite index cho query performance
CREATE INDEX IF NOT EXISTS idx_chats_user_admin_created ON chats(user_id, admin_id, created_at DESC);

-- ============================================================
-- 5. KIỂM TRA VÀ CẬP NHẬT BẢNG NOTIFICATIONS
-- ============================================================

-- Thêm cột title nếu chưa có
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'title'
  ) THEN
    ALTER TABLE notifications ADD COLUMN title VARCHAR(255);
    RAISE NOTICE 'Added column: notifications.title';
  END IF;
END $$;

-- ============================================================
-- 6. THÊM CÁC CONSTRAINTS BẢO VỆ DỮ LIỆU
-- ============================================================

-- Check constraint: balance không được âm
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_balance_non_negative' AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT check_balance_non_negative CHECK (balance >= 0);
    RAISE NOTICE 'Added constraint: check_balance_non_negative';
  END IF;
END $$;

-- Check constraint: deposit amount phải > 0
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_deposit_amount_positive' AND table_name = 'deposits'
  ) THEN
    ALTER TABLE deposits ADD CONSTRAINT check_deposit_amount_positive CHECK (amount > 0);
    RAISE NOTICE 'Added constraint: check_deposit_amount_positive';
  END IF;
END $$;

-- Check constraint: withdrawal amount phải > 0
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_withdrawal_amount_positive' AND table_name = 'withdrawals'
  ) THEN
    ALTER TABLE withdrawals ADD CONSTRAINT check_withdrawal_amount_positive CHECK (amount > 0);
    RAISE NOTICE 'Added constraint: check_withdrawal_amount_positive';
  END IF;
END $$;

-- Check constraint: purchase amount phải > 0
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_purchase_amount_positive' AND table_name = 'purchases'
  ) THEN
    ALTER TABLE purchases ADD CONSTRAINT check_purchase_amount_positive CHECK (amount > 0);
    RAISE NOTICE 'Added constraint: check_purchase_amount_positive';
  END IF;
END $$;

-- Check constraint: product price phải > 0
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_product_price_positive' AND table_name = 'products'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT check_product_price_positive CHECK (price > 0);
    RAISE NOTICE 'Added constraint: check_product_price_positive';
  END IF;
END $$;

-- ============================================================
-- 7. THÊM CÁC INDEXES THIẾU CHO PERFORMANCE
-- ============================================================

-- Composite indexes cho deposits
CREATE INDEX IF NOT EXISTS idx_deposits_user_status ON deposits(user_id, status);
CREATE INDEX IF NOT EXISTS idx_deposits_status_timestamp ON deposits(status, timestamp DESC);

-- Composite indexes cho withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status ON withdrawals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created ON withdrawals(status, created_at DESC);

-- Composite indexes cho purchases
CREATE INDEX IF NOT EXISTS idx_purchases_user_product ON purchases(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_created ON purchases(user_id, created_at DESC);

-- Index cho products (active products)
CREATE INDEX IF NOT EXISTS idx_products_active_price ON products(is_active, price) WHERE is_active = true;

-- Index cho notifications (unread)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;

-- ============================================================
-- 8. KIỂM TRA BẢNG PRODUCT_RATINGS
-- ============================================================
-- ✅ FIX: Không tạo VIEW vì đã có bảng product_ratings với trigger tự động update
-- VIEW sẽ conflict với bảng và làm trigger INSERT không hoạt động
-- Nếu cần query aggregated data, dùng bảng product_ratings hoặc query trực tiếp từ reviews

-- Kiểm tra bảng product_ratings có tồn tại không
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_ratings') THEN
    -- Tạo bảng product_ratings nếu chưa có
    CREATE TABLE product_ratings (
      product_id INT PRIMARY KEY,
      average_rating DECIMAL(3, 2) DEFAULT 0,
      total_ratings INT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_product_ratings_average_rating ON product_ratings(average_rating);
    RAISE NOTICE 'Created table: product_ratings';
  END IF;
END $$;

-- ============================================================
-- 9. TẠO TRIGGER UPDATE TIMESTAMP
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
-- 10. KIỂM TRA VÀ SỬA CÁC VẤN ĐỀ DỮ LIỆU
-- ============================================================

-- Sửa balance âm thành 0
UPDATE users SET balance = 0 WHERE balance < 0;

-- Sửa amount <= 0 trong deposits
UPDATE deposits SET amount = ABS(amount) WHERE amount <= 0;

-- Sửa amount <= 0 trong withdrawals
UPDATE withdrawals SET amount = ABS(amount) WHERE amount <= 0;

-- Sửa amount <= 0 trong purchases
UPDATE purchases SET amount = ABS(amount) WHERE amount <= 0;

-- Sửa price <= 0 trong products
UPDATE products SET price = ABS(price) WHERE price <= 0;

-- ============================================================
-- 11. BÁO CÁO TỔNG KẾT
-- ============================================================

SELECT 'Database check and fix completed!' as status;

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
  'Reviews table exists' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') 
       THEN 'YES' 
       ELSE 'NO' 
  END as columns
UNION ALL
SELECT 
  'Chats table exists' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chats') 
       THEN 'YES' 
       ELSE 'NO' 
  END as columns
UNION ALL
SELECT 
  'Total indexes' as check_type,
  COUNT(*)::text as columns
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Total constraints' as check_type,
  COUNT(*)::text as columns
FROM information_schema.table_constraints
WHERE table_schema = 'public';

