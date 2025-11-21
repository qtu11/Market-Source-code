-- ============================================================
-- QUERY PERFORMANCE ANALYSIS
-- ============================================================
-- ✅ PERFORMANCE FIX: Analyze common queries để tối ưu
-- Chạy: psql -U <user> -d <database> -f scripts/analyze-queries.sql
-- ============================================================

-- Enable query statistics
SET enable_seqscan = ON;
SET enable_indexscan = ON;

-- ============================================================
-- 1. PURCHASES QUERIES
-- ============================================================

-- Query: getPurchases(userId)
EXPLAIN ANALYZE
SELECT p.*, pr.title as product_title, pr.price, u.email, u.username
FROM purchases p
LEFT JOIN products pr ON p.product_id = pr.id
LEFT JOIN users u ON p.user_id = u.id
WHERE p.user_id = 1
ORDER BY p.created_at DESC
LIMIT 50;

-- Query: Check duplicate purchase
EXPLAIN ANALYZE
SELECT id FROM purchases WHERE user_id = 1 AND product_id = 1;

-- ============================================================
-- 2. DEPOSITS QUERIES
-- ============================================================

-- Query: Get pending deposits (admin)
EXPLAIN ANALYZE
SELECT d.*, u.email, u.username
FROM deposits d
LEFT JOIN users u ON d.user_id = u.id
WHERE d.status = 'pending'
ORDER BY d.created_at DESC;

-- Query: Get user deposits
EXPLAIN ANALYZE
SELECT * FROM deposits WHERE user_id = 1 ORDER BY created_at DESC;

-- Query: Approve deposit (with lock)
EXPLAIN ANALYZE
SELECT id, user_id, amount, status FROM deposits WHERE id = 1 FOR UPDATE;

-- ============================================================
-- 3. WITHDRAWALS QUERIES
-- ============================================================

-- Query: Get pending withdrawals (admin)
EXPLAIN ANALYZE
SELECT w.*, u.email, u.username
FROM withdrawals w
LEFT JOIN users u ON w.user_id = u.id
WHERE w.status = 'pending'
ORDER BY w.created_at DESC;

-- Query: Get user withdrawals
EXPLAIN ANALYZE
SELECT * FROM withdrawals WHERE user_id = 1 ORDER BY created_at DESC;

-- ============================================================
-- 4. CHATS QUERIES
-- ============================================================

-- Query: getChats(userId)
EXPLAIN ANALYZE
SELECT c.*, 
       u.username as user_name,
       u.email as user_email,
       u.avatar_url as user_avatar,
       a.username as admin_name,
       a.email as admin_email
FROM chats c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN users a ON c.admin_id = a.id
WHERE c.user_id = 1
ORDER BY c.created_at DESC
LIMIT 50
OFFSET 0;

-- Query: Get admin chats
EXPLAIN ANALYZE
SELECT c.*, u.username as user_name, u.email as user_email
FROM chats c
LEFT JOIN users u ON c.user_id = u.id
WHERE c.admin_id = 1
ORDER BY c.created_at DESC;

-- ============================================================
-- 5. PRODUCTS QUERIES
-- ============================================================

-- Query: Get products with filters
EXPLAIN ANALYZE
SELECT * FROM products 
WHERE category = 'web' AND is_active = true
ORDER BY created_at DESC
LIMIT 20;

-- Query: Search products by title
EXPLAIN ANALYZE
SELECT * FROM products 
WHERE LOWER(title) LIKE LOWER('%react%')
ORDER BY created_at DESC;

-- ============================================================
-- 6. USERS QUERIES
-- ============================================================

-- Query: Get users by role
EXPLAIN ANALYZE
SELECT * FROM users WHERE role = 'admin' ORDER BY created_at DESC;

-- Query: Get user by email
EXPLAIN ANALYZE
SELECT id FROM users WHERE email = 'user@example.com';

-- ============================================================
-- 7. REVIEWS QUERIES
-- ============================================================

-- Query: Get product reviews
EXPLAIN ANALYZE
SELECT r.*, u.username, u.email, u.avatar_url, pr.title as product_title
FROM reviews r
JOIN users u ON r.user_id = u.id
LEFT JOIN products pr ON r.product_id = pr.id
WHERE r.product_id = 1
ORDER BY r.created_at DESC;

-- ============================================================
-- 8. NOTIFICATIONS QUERIES
-- ============================================================

-- Query: Get user notifications
EXPLAIN ANALYZE
SELECT * FROM notifications 
WHERE user_id = 1 
ORDER BY created_at DESC
LIMIT 20;

-- Query: Get unread notifications
EXPLAIN ANALYZE
SELECT * FROM notifications 
WHERE user_id = 1 AND is_read = false
ORDER BY created_at DESC;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. Check các queries có dùng index:
--    - "Index Scan" = tốt, dùng index
--    - "Seq Scan" = xấu, scan toàn bộ table
--    - "Index Only Scan" = tốt nhất, chỉ đọc index
--
-- 2. Nếu query dùng "Seq Scan", cần thêm index:
--    CREATE INDEX idx_table_column ON table(column);
--
-- 3. Check execution time:
--    - < 10ms = tốt
--    - 10-100ms = acceptable
--    - > 100ms = cần optimize
--
-- 4. Check rows examined:
--    - Nếu rows examined >> rows returned = inefficient
--    - Có thể cần thêm WHERE clause hoặc index
--
-- 5. Check JOIN performance:
--    - JOIN với small tables = OK
--    - JOIN với large tables = cần index on foreign keys
--
-- ============================================================

