# 🚀 Hướng dẫn Setup Supabase - Tự động

## I. Vấn đề hiện tại

Password "20022007" không đúng với Supabase Database. Cần reset password trong Supabase Dashboard.

## II. Các bước thực hiện

### Bước 1: Reset Database Password trong Supabase

1. Vào Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/qrozeqsmqvkqxqenhike/settings/database
   ```

2. Tìm section **"Connection string"** hoặc **"Database password"**

3. Nếu chưa có password hoặc quên:
   - Click nút **"Reset database password"**
   - Copy password mới (lưu an toàn, chỉ hiện 1 lần)

4. Copy password vừa tạo

### Bước 2: Chạy script setup tự động

```powershell
.\scripts\setup-supabase-env.ps1
```

Script sẽ:
- ✅ Yêu cầu nhập password (an toàn, không hiện trên màn hình)
- ✅ Test connection đến Supabase
- ✅ Tạo file `.env.local` tự động với format đúng
- ✅ Hỏi có muốn chạy migration schema không

### Bước 3: Chạy migration schema (nếu chưa chạy)

Nếu script setup hỏi "Bạn có muốn chạy migration schema ngay bây giờ?" → chọn **Y**

Hoặc chạy thủ công:

```powershell
# Nhập password an toàn
$password = Read-Host "Enter Supabase DB Password" -AsSecureString
.\scripts\migrate-to-supabase.ps1 -DbPasswordSecure $password
```

## III. Kiểm tra kết nối thủ công

Nếu muốn test connection trước:

```powershell
# Nhập password
$env:PGPASSWORD = Read-Host "Enter password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:PGPASSWORD)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
$env:PGPASSWORD = $plainPassword

# Test connection
psql -h db.qrozeqsmqvkqxqenhike.supabase.co -p 5432 -U postgres -d postgres -c "SELECT version();"
```

## IV. File .env.local

Sau khi chạy script, file `.env.local` sẽ được tạo tự động với format:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://qrozeqsmqvkqxqenhike.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_V1EwyaylbTgQ8yGo0IpY7w_NRy6fzX9

# Supabase Database Connection (PostgreSQL)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.qrozeqsmqvkqxqenhike.supabase.co:5432/postgres

# Fallback individual variables
DB_HOST=db.qrozeqsmqvkqxqenhike.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=[PASSWORD]
DB_NAME=postgres

# Supabase Service Role Key
SUPABASE_SERVICE_ROLE_KEY=sb_secret_mFGSgU42XIFf5jcouj1T0A_6i188-XS

# Optional: Skip DB check during build
SKIP_DB_CHECK=true
```

## V. Troubleshooting

### Lỗi: "password authentication failed"

**Nguyên nhân:** Password không đúng

**Giải pháp:**
1. Reset password trong Supabase Dashboard (Bước 1)
2. Chạy lại script setup

### Lỗi: "psql not found"

**Nguyên nhân:** Chưa cài PostgreSQL client

**Giải pháp:**
1. Download PostgreSQL: https://www.postgresql.org/download/windows/
2. Cài đặt (chọn "Command Line Tools" khi cài)
3. Hoặc dùng Supabase SQL Editor để chạy migration thủ công

### Lỗi: "Connection timeout"

**Nguyên nhân:** Firewall hoặc network issue

**Giải pháp:**
1. Kiểm tra firewall Windows
2. Thử lại sau vài phút
3. Kiểm tra Supabase Dashboard xem project có đang active không

## VI. Sau khi setup xong

1. ✅ File `.env.local` đã được tạo
2. ✅ Schema đã được migrate
3. ✅ Kiểm tra dữ liệu Supabase:

```powershell
npm run verify:data
```

Script sẽ xác nhận:
- Đủ bảng bắt buộc (users, products, transactions, notifications…)
- Có ít nhất 1 user, 1 admin/superadmin, 1 sản phẩm
- Có user hoạt động trong 30 ngày gần nhất

Nếu thiếu, script sẽ báo lỗi chi tiết để seed/migrate lại.

4. ✅ Test ứng dụng:

```powershell
npm run dev
```

Ứng dụng sẽ tự động kết nối đến Supabase thay vì PostgreSQL local.

---

**Lưu ý:** 
- File `.env.local` đã có trong `.gitignore`, không commit lên Git
- Password và secret key là thông tin nhạy cảm, không share công khai

