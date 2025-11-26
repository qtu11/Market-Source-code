-- Script thêm các cột thiếu vào bảng users
-- Chạy: psql -h localhost -p 5433 -U qtusdev -d qtusdevmarket -f scripts/add-missing-columns.sql

-- Thêm cột avatar_url
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Đã thêm cột avatar_url';
    ELSE
        RAISE NOTICE 'Cột avatar_url đã tồn tại';
    END IF;
END $$;

-- Thêm cột role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
        RAISE NOTICE 'Đã thêm cột role';
    ELSE
        RAISE NOTICE 'Cột role đã tồn tại';
    END IF;
END $$;

-- Tạo index cho role nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' 
        AND indexname = 'idx_users_role'
    ) THEN
        CREATE INDEX idx_users_role ON users(role);
        RAISE NOTICE 'Đã tạo index idx_users_role';
    ELSE
        RAISE NOTICE 'Index idx_users_role đã tồn tại';
    END IF;
END $$;

-- Kiểm tra kết quả
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('avatar_url', 'role')
ORDER BY column_name;

