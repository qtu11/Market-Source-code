-- ============================================================
-- MIGRATION: Thêm bảng Reviews cho đánh giá sản phẩm
-- ============================================================
-- Chạy: psql $DATABASE_URL -f database-migration.sql
-- Hoặc: node scripts/run-migration.js database-migration.sql
-- ============================================================

-- Tạo bảng reviews
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
  AVG(rating) as average_rating,
  MIN(rating) as min_rating,
  MAX(rating) as max_rating
FROM reviews
GROUP BY product_id;

-- Trigger function để update updated_at khi có review mới hoặc update
CREATE OR REPLACE FUNCTION update_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động update updated_at
DROP TRIGGER IF EXISTS trigger_update_review_timestamp ON reviews;
CREATE TRIGGER trigger_update_review_timestamp
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_review_timestamp();

-- ============================================================
-- Thêm cột ip_address vào bảng users nếu chưa có
-- ============================================================

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

-- ============================================================
-- Hoàn tất migration
-- ============================================================
SELECT 'Migration completed successfully!' as status;

