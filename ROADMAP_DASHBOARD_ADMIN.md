# 🚀 ROADMAP TRIỂN KHAI DASHBOARD KHÁCH HÀNG & ADMIN PANEL

**Ngày tạo:** 2025-01-27  
**Phiên bản:** 1.0  
**Tác giả:** AI Assistant

---

## 📋 **MỤC LỤC**

1. [Phân tích cấu trúc hiện tại](#1-phân-tích-cấu-trúc-hiện-tại)
2. [Roadmap triển khai theo giai đoạn](#2-roadmap-triển-khai-theo-giai-đoạn)
3. [Cấu trúc Database Schema](#3-cấu-trúc-database-schema)
4. [API Endpoints cần phát triển](#4-api-endpoints-cần-phát-triển)
5. [Components Frontend](#5-components-frontend)
6. [Ưu tiên triển khai](#6-ưu-tiên-triển-khai)

---

## 1. PHÂN TÍCH CẤU TRÚC HIỆN TẠI

### ✅ **Đã có sẵn:**

#### **Dashboard Khách hàng (`app/dashboard/page.tsx`):**
- ✅ Tổng quan số dư, chi tiêu, nạp/rút
- ✅ Tab: Sản phẩm đã mua, Lịch sử nạp/rút, Thông báo, Profile
- ✅ Hiển thị thông tin cá nhân cơ bản
- ✅ Kết nối API: `/api/purchases`, `/api/deposits`, `/api/withdrawals`
- ✅ Real-time updates (30s interval)
- ✅ NotificationCenter component

#### **Admin Panel (`app/admin/page.tsx`):**
- ✅ Tabs: Overview, Products, Users, Deposits, Withdrawals, Chat, Notifications, Settings
- ✅ Quản lý sản phẩm (CRUD)
- ✅ Quản lý người dùng (khóa/mở, cập nhật số dư)
- ✅ Duyệt nạp/rút tiền
- ✅ Chat với user (ChatAdmin component)
- ✅ Analytics component
- ✅ NotificationManagement component
- ✅ Settings component

### ❌ **Chưa có (cần phát triển):**

#### **Dashboard Khách hàng:**
- ❌ Biểu đồ chi tiêu (Line Chart)
- ❌ Top 5 sản phẩm đã mua
- ❌ Timeline hoạt động
- ❌ Wishlist/Favorites
- ❌ Review system chi tiết
- ❌ Download management (lịch sử, giới hạn)
- ❌ 2FA authentication
- ❌ Quản lý thiết bị đăng nhập
- ❌ Lịch sử đăng nhập chi tiết
- ❌ Personal analytics
- ❌ Referral program
- ❌ Coupons/Vouchers
- ❌ Support ticket system
- ❌ FAQ system

#### **Admin Panel:**
- ❌ Advanced analytics với charts (Line, Bar, Pie, Heatmap)
- ❌ User analytics (LTV, retention, churn)
- ❌ Bulk actions (khóa/xóa nhiều user)
- ❌ Export data (Excel, CSV, PDF)
- ❌ Product analytics (views, conversion, revenue)
- ❌ Advanced transaction filtering
- ❌ Review management
- ❌ Announcement system
- ❌ FAQ management
- ❌ Financial reports
- ❌ Audit logs viewer
- ❌ Backup/Restore system

---

## 2. ROADMAP TRIỂN KHAI THEO GIAI ĐOẠN

### 🎯 **GIAI ĐOẠN 1: Nền tảng & Cải thiện cơ bản (Tuần 1-2)**

#### **Dashboard Khách hàng:**
1. ✅ **Biểu đồ chi tiêu** (Line Chart)
   - Component: `app/dashboard/components/SpendingChart.tsx`
   - Library: Recharts hoặc Chart.js
   - Data: Tổng hợp từ `purchases` theo tháng

2. ✅ **Top 5 sản phẩm đã mua**
   - Component: `app/dashboard/components/TopProducts.tsx`
   - Logic: Sort theo số lần mua hoặc giá trị

3. ✅ **Timeline hoạt động**
   - Component: `app/dashboard/components/ActivityTimeline.tsx`
   - Data: Merge purchases, deposits, withdrawals

4. ✅ **Wishlist cơ bản**
   - Component: `app/dashboard/components/Wishlist.tsx`
   - Database: Bảng `wishlists`
   - API: `/api/wishlist`

#### **Admin Panel:**
1. ✅ **Advanced Analytics với Charts**
   - Component: `app/admin/components/AnalyticsCharts.tsx`
   - Charts: Revenue (Line), Users (Area), Transactions (Bar), Categories (Pie)

2. ✅ **Bulk Actions cho Users**
   - Component: `app/admin/components/UserBulkActions.tsx`
   - Actions: Khóa, Xóa, Export

3. ✅ **Export Data (Excel/CSV)**
   - Utility: `lib/export-utils.ts`
   - Functions: `exportUsers()`, `exportTransactions()`, `exportProducts()`

---

### 🎯 **GIAI ĐOẠN 2: Tính năng nâng cao (Tuần 3-4)**

#### **Dashboard Khách hàng:**
1. ✅ **Review System chi tiết**
   - Component: `app/dashboard/components/ProductReview.tsx`
   - Database: Bảng `reviews` (đã có schema)
   - API: `/api/reviews`

2. ✅ **Download Management**
   - Component: `app/dashboard/components/DownloadHistory.tsx`
   - Database: Bảng `downloads`
   - Features: Lịch sử, giới hạn, link expiry

3. ✅ **Profile Settings nâng cao**
   - Component: `app/dashboard/components/ProfileSettings.tsx`
   - Features: Upload avatar, 2FA, liên kết OAuth

4. ✅ **Personal Analytics**
   - Component: `app/dashboard/components/PersonalAnalytics.tsx`
   - Charts: Chi tiêu theo thời gian, thói quen mua hàng

#### **Admin Panel:**
1. ✅ **User Analytics**
   - Component: `app/admin/components/UserAnalytics.tsx`
   - Metrics: LTV, Retention, Churn, Segmentation

2. ✅ **Product Analytics**
   - Component: `app/admin/components/ProductAnalytics.tsx`
   - Metrics: Views, Conversion, Revenue, Top keywords

3. ✅ **Review Management**
   - Component: `app/admin/components/ReviewManagement.tsx`
   - Features: Duyệt/xóa spam, phản hồi, thống kê

4. ✅ **Advanced Transaction Filtering**
   - Component: `app/admin/components/TransactionFilters.tsx`
   - Filters: Date range, amount, method, status

---

### 🎯 **GIAI ĐOẠN 3: Hệ thống hỗ trợ & Bảo mật (Tuần 5-6)**

#### **Dashboard Khách hàng:**
1. ✅ **Support Ticket System**
   - Component: `app/dashboard/components/SupportTickets.tsx`
   - Database: Bảng `support_tickets`
   - API: `/api/support`

2. ✅ **FAQ System**
   - Component: `app/dashboard/components/FAQ.tsx`
   - Database: Bảng `faqs`
   - API: `/api/faqs`

3. ✅ **2FA Authentication**
   - Component: `app/dashboard/components/TwoFactorAuth.tsx`
   - Library: `otplib` hoặc `speakeasy`
   - Database: Thêm `two_factor_secret` vào `users`

4. ✅ **Quản lý thiết bị đăng nhập**
   - Component: `app/dashboard/components/DeviceManagement.tsx`
   - Database: Bảng `user_sessions`
   - Features: Xem danh sách, đăng xuất từ xa

#### **Admin Panel:**
1. ✅ **Announcement System**
   - Component: `app/admin/components/AnnouncementManager.tsx`
   - Database: Bảng `announcements`
   - Features: Banner, thông báo khuyến mãi

2. ✅ **FAQ Management**
   - Component: `app/admin/components/FAQManager.tsx`
   - CRUD: Tạo/sửa/xóa FAQ

3. ✅ **Audit Logs Viewer**
   - Component: `app/admin/components/AuditLogs.tsx`
   - Database: Bảng `audit_logs`
   - Features: Tìm kiếm, export

---

### 🎯 **GIAI ĐOẠN 4: Tính năng thương mại (Tuần 7-8)**

#### **Dashboard Khách hàng:**
1. ✅ **Referral Program**
   - Component: `app/dashboard/components/ReferralProgram.tsx`
   - Database: Bảng `referrals`
   - API: `/api/referrals`

2. ✅ **Coupons & Vouchers**
   - Component: `app/dashboard/components/Coupons.tsx`
   - Database: Bảng `coupons`, `user_coupons`
   - API: `/api/coupons`

#### **Admin Panel:**
1. ✅ **Promotion Management**
   - Component: `app/admin/components/PromotionManager.tsx`
   - Features: Tạo mã giảm giá, flash sale, bundle deals

2. ✅ **Financial Reports**
   - Component: `app/admin/components/FinancialReports.tsx`
   - Reports: Doanh thu, lợi nhuận, thuế, export PDF

3. ✅ **Backup & Restore**
   - Component: `app/admin/components/BackupRestore.tsx`
   - API: `/api/admin/backup`, `/api/admin/restore`

---

## 3. CẤU TRÚC DATABASE SCHEMA

### 📊 **Bảng mới cần tạo:**

```sql
-- Wishlists
CREATE TABLE wishlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Reviews (nếu chưa có)
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Downloads
CREATE TABLE downloads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  download_url TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Sessions (thiết bị đăng nhập)
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  device_type VARCHAR(50),
  device_name VARCHAR(255),
  browser VARCHAR(100),
  os VARCHAR(100),
  ip_address VARCHAR(45),
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Support Tickets
CREATE TABLE support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50), -- Technical, Payment, Account, etc.
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  status VARCHAR(20) DEFAULT 'open', -- open, assigned, in_progress, resolved, closed
  attachments JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Support Ticket Messages
CREATE TABLE support_ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  attachments JSONB,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- FAQs
CREATE TABLE faqs (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Announcements
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50), -- system, promotion, maintenance
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high
  is_active BOOLEAN DEFAULT TRUE,
  show_on_homepage BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Referrals
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- Coupons
CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255),
  description TEXT,
  discount_type VARCHAR(20), -- percentage, fixed
  discount_value DECIMAL(10,2),
  min_purchase_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_amount DECIMAL(10,2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Coupons
CREATE TABLE user_coupons (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, coupon_id)
);

-- Audit Logs
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- create, update, delete, approve, reject
  entity_type VARCHAR(50), -- user, product, transaction, etc.
  entity_id INTEGER,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_downloads_user_id ON downloads(user_id);
CREATE INDEX idx_downloads_product_id ON downloads(product_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 🔄 **Bảng cần cập nhật:**

```sql
-- Thêm cột vào users
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_referral_earnings DECIMAL(10,2) DEFAULT 0;

-- Thêm cột vào products
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
```

---

## 4. API ENDPOINTS CẦN PHÁT TRIỂN

### 📡 **Dashboard Khách hàng APIs:**

```typescript
// Wishlist
GET    /api/wishlist              // Lấy danh sách wishlist
POST   /api/wishlist              // Thêm vào wishlist
DELETE /api/wishlist/:productId   // Xóa khỏi wishlist

// Reviews
GET    /api/reviews/:productId    // Lấy reviews của sản phẩm
POST   /api/reviews               // Tạo review
PUT    /api/reviews/:id           // Cập nhật review
DELETE /api/reviews/:id           // Xóa review
POST   /api/reviews/:id/helpful   // Đánh dấu helpful

// Downloads
GET    /api/downloads             // Lịch sử download
POST   /api/downloads/:productId // Tạo download link
GET    /api/downloads/:id         // Download file

// Profile Settings
PUT    /api/profile               // Cập nhật profile
POST   /api/profile/avatar        // Upload avatar
POST   /api/profile/2fa/enable   // Bật 2FA
POST   /api/profile/2fa/disable  // Tắt 2FA
POST   /api/profile/2fa/verify   // Verify 2FA

// Device Management
GET    /api/sessions              // Lấy danh sách sessions
DELETE /api/sessions/:id         // Đăng xuất session

// Support
GET    /api/support/tickets       // Lấy tickets
POST   /api/support/tickets       // Tạo ticket
GET    /api/support/tickets/:id  // Chi tiết ticket
POST   /api/support/tickets/:id/messages // Gửi message

// FAQs
GET    /api/faqs                 // Lấy FAQs
GET    /api/faqs/:id             // Chi tiết FAQ
POST   /api/faqs/:id/helpful    // Đánh dấu helpful

// Referrals
GET    /api/referrals            // Lấy thông tin referral
GET    /api/referrals/stats      // Thống kê referral

// Coupons
GET    /api/coupons              // Lấy coupons của user
POST   /api/coupons/apply       // Áp dụng coupon
```

### 📡 **Admin Panel APIs:**

```typescript
// Analytics
GET    /api/admin/analytics/overview      // Tổng quan
GET    /api/admin/analytics/revenue      // Doanh thu
GET    /api/admin/analytics/users        // Người dùng
GET    /api/admin/analytics/products     // Sản phẩm

// Users
POST   /api/admin/users/bulk              // Bulk actions
GET    /api/admin/users/export            // Export users
GET    /api/admin/users/:id/analytics    // User analytics
POST   /api/admin/users/:id/impersonate  // Impersonate user

// Products
GET    /api/admin/products/analytics     // Product analytics
GET    /api/admin/products/export        // Export products

// Transactions
GET    /api/admin/transactions           // Lấy transactions (với filters)
GET    /api/admin/transactions/export   // Export transactions
POST   /api/admin/transactions/:id/refund // Hoàn tiền

// Reviews
GET    /api/admin/reviews                // Lấy tất cả reviews
PUT    /api/admin/reviews/:id            // Cập nhật review
DELETE /api/admin/reviews/:id            // Xóa review
POST   /api/admin/reviews/:id/respond    // Phản hồi review

// Announcements
GET    /api/admin/announcements          // Lấy announcements
POST   /api/admin/announcements          // Tạo announcement
PUT    /api/admin/announcements/:id      // Cập nhật
DELETE /api/admin/announcements/:id     // Xóa

// FAQs
GET    /api/admin/faqs                  // Lấy FAQs
POST   /api/admin/faqs                  // Tạo FAQ
PUT    /api/admin/faqs/:id              // Cập nhật
DELETE /api/admin/faqs/:id              // Xóa

// Support
GET    /api/admin/support/tickets        // Lấy tickets
PUT    /api/admin/support/tickets/:id    // Cập nhật ticket
POST   /api/admin/support/tickets/:id/assign // Assign ticket

// Reports
GET    /api/admin/reports/financial      // Báo cáo tài chính
GET    /api/admin/reports/users          // Báo cáo users
GET    /api/admin/reports/products       // Báo cáo products
GET    /api/admin/reports/export/:type   // Export report

// Audit Logs
GET    /api/admin/audit-logs             // Lấy audit logs
GET    /api/admin/audit-logs/export       // Export logs

// Backup & Restore
POST   /api/admin/backup                 // Tạo backup
POST   /api/admin/restore                // Restore
GET    /api/admin/backups                // Lấy danh sách backups

// Promotions
GET    /api/admin/promotions             // Lấy promotions
POST   /api/admin/promotions             // Tạo promotion
PUT    /api/admin/promotions/:id         // Cập nhật
DELETE /api/admin/promotions/:id         // Xóa
```

---

## 5. COMPONENTS FRONTEND

### 📁 **Cấu trúc thư mục đề xuất:**

```
app/
├── dashboard/
│   ├── components/
│   │   ├── SpendingChart.tsx          ✅ Giai đoạn 1
│   │   ├── TopProducts.tsx             ✅ Giai đoạn 1
│   │   ├── ActivityTimeline.tsx        ✅ Giai đoạn 1
│   │   ├── Wishlist.tsx                ✅ Giai đoạn 1
│   │   ├── ProductReview.tsx          ✅ Giai đoạn 2
│   │   ├── DownloadHistory.tsx        ✅ Giai đoạn 2
│   │   ├── ProfileSettings.tsx         ✅ Giai đoạn 2
│   │   ├── PersonalAnalytics.tsx       ✅ Giai đoạn 2
│   │   ├── SupportTickets.tsx         ✅ Giai đoạn 3
│   │   ├── FAQ.tsx                     ✅ Giai đoạn 3
│   │   ├── TwoFactorAuth.tsx           ✅ Giai đoạn 3
│   │   ├── DeviceManagement.tsx        ✅ Giai đoạn 3
│   │   ├── ReferralProgram.tsx         ✅ Giai đoạn 4
│   │   └── Coupons.tsx                 ✅ Giai đoạn 4
│   └── page.tsx

app/
├── admin/
│   ├── components/
│   │   ├── AnalyticsCharts.tsx         ✅ Giai đoạn 1
│   │   ├── UserBulkActions.tsx         ✅ Giai đoạn 1
│   │   ├── UserAnalytics.tsx           ✅ Giai đoạn 2
│   │   ├── ProductAnalytics.tsx       ✅ Giai đoạn 2
│   │   ├── ReviewManagement.tsx        ✅ Giai đoạn 2
│   │   ├── TransactionFilters.tsx      ✅ Giai đoạn 2
│   │   ├── AnnouncementManager.tsx     ✅ Giai đoạn 3
│   │   ├── FAQManager.tsx              ✅ Giai đoạn 3
│   │   ├── AuditLogs.tsx               ✅ Giai đoạn 3
│   │   ├── PromotionManager.tsx        ✅ Giai đoạn 4
│   │   ├── FinancialReports.tsx        ✅ Giai đoạn 4
│   │   └── BackupRestore.tsx            ✅ Giai đoạn 4
│   └── page.tsx

lib/
├── export-utils.ts                     ✅ Giai đoạn 1
├── chart-utils.ts                      ✅ Giai đoạn 1
└── analytics-utils.ts                  ✅ Giai đoạn 2
```

---

## 6. ƯU TIÊN TRIỂN KHAI

### 🔥 **PRIORITY 1 (Tuần 1-2):**
1. ✅ Biểu đồ chi tiêu (Dashboard)
2. ✅ Top 5 sản phẩm (Dashboard)
3. ✅ Timeline hoạt động (Dashboard)
4. ✅ Advanced Analytics với Charts (Admin)
5. ✅ Bulk Actions cho Users (Admin)
6. ✅ Export Data (Admin)

### 🔥 **PRIORITY 2 (Tuần 3-4):**
1. ✅ Review System chi tiết (Dashboard)
2. ✅ Download Management (Dashboard)
3. ✅ Profile Settings nâng cao (Dashboard)
4. ✅ User Analytics (Admin)
5. ✅ Product Analytics (Admin)
6. ✅ Review Management (Admin)

### 🔥 **PRIORITY 3 (Tuần 5-6):**
1. ✅ Support Ticket System (Dashboard)
2. ✅ FAQ System (Dashboard + Admin)
3. ✅ 2FA Authentication (Dashboard)
4. ✅ Device Management (Dashboard)
5. ✅ Announcement System (Admin)
6. ✅ Audit Logs (Admin)

### 🔥 **PRIORITY 4 (Tuần 7-8):**
1. ✅ Referral Program (Dashboard)
2. ✅ Coupons & Vouchers (Dashboard)
3. ✅ Promotion Management (Admin)
4. ✅ Financial Reports (Admin)
5. ✅ Backup & Restore (Admin)

---

## 📝 **GHI CHÚ KỸ THUẬT**

### **Libraries đề xuất:**
- **Charts:** Recharts hoặc Chart.js
- **Export:** `xlsx` (Excel), `jspdf` (PDF), `papaparse` (CSV)
- **2FA:** `otplib` hoặc `speakeasy`
- **Date handling:** `date-fns` hoặc `dayjs`
- **Form validation:** `zod` hoặc `yup`

### **Performance:**
- Sử dụng React.memo cho components lớn
- Lazy load charts và heavy components
- Debounce cho search/filter
- Pagination cho danh sách dài
- Caching cho analytics data

### **Security:**
- Validate tất cả inputs
- Rate limiting cho APIs
- CSRF protection
- XSS prevention
- SQL injection prevention (dùng parameterized queries)

---

## ✅ **CHECKLIST TRIỂN KHAI**

### **Giai đoạn 1:**
- [ ] Tạo database schema mới
- [ ] Implement SpendingChart component
- [ ] Implement TopProducts component
- [ ] Implement ActivityTimeline component
- [ ] Implement Wishlist component
- [ ] Implement AnalyticsCharts component
- [ ] Implement UserBulkActions component
- [ ] Implement export-utils.ts
- [ ] Tạo API endpoints tương ứng
- [ ] Test và fix bugs

### **Giai đoạn 2:**
- [ ] Implement ProductReview component
- [ ] Implement DownloadHistory component
- [ ] Implement ProfileSettings component
- [ ] Implement PersonalAnalytics component
- [ ] Implement UserAnalytics component
- [ ] Implement ProductAnalytics component
- [ ] Implement ReviewManagement component
- [ ] Implement TransactionFilters component
- [ ] Tạo API endpoints tương ứng
- [ ] Test và fix bugs

### **Giai đoạn 3:**
- [ ] Implement SupportTickets component
- [ ] Implement FAQ component
- [ ] Implement TwoFactorAuth component
- [ ] Implement DeviceManagement component
- [ ] Implement AnnouncementManager component
- [ ] Implement FAQManager component
- [ ] Implement AuditLogs component
- [ ] Tạo API endpoints tương ứng
- [ ] Test và fix bugs

### **Giai đoạn 4:**
- [ ] Implement ReferralProgram component
- [ ] Implement Coupons component
- [ ] Implement PromotionManager component
- [ ] Implement FinancialReports component
- [ ] Implement BackupRestore component
- [ ] Tạo API endpoints tương ứng
- [ ] Test và fix bugs

---

**Kết thúc tài liệu.**  
**Cập nhật lần cuối:** 2025-01-27











