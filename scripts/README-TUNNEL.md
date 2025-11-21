# PostgreSQL Cloudflare Tunnel - Hướng dẫn đầy đủ

## 🎯 Mục đích

Vì bạn đang dùng **domain từ Tenten** và **Netlify (không có VPS)**, cần **Cloudflare Tunnel** để kết nối PostgreSQL từ xa về localhost.

## ✅ Setup nhanh (Khuyến nghị)

Chạy một lệnh duy nhất để setup toàn bộ:

```powershell
.\scripts\setup-postgresql-tunnel.ps1
```

Script này sẽ:
1. ✅ Kiểm tra và khởi động tunnel
2. ✅ Test kết nối TCP
3. ✅ Test kết nối PostgreSQL (nếu có psql)
4. ✅ Lưu thông tin tunnel

## 🚀 Các script chính

### 1. `setup-postgresql-tunnel.ps1` - **SCRIPT CHÍNH** (KHUYẾN NGHỊ)

Script tổng hợp để setup và quản lý tunnel:

```powershell
# Setup cơ bản
.\scripts\setup-postgresql-tunnel.ps1

# Setup + cài auto-start khi khởi động máy
.\scripts\setup-postgresql-tunnel.ps1 -InstallService

# Setup + chạy monitor tự động restart
.\scripts\setup-postgresql-tunnel.ps1 -StartMonitor

# Chỉ test kết nối
.\scripts\setup-postgresql-tunnel.ps1 -TestOnly
```

### 2. `ensure-postgresql-tunnel.ps1` - Đảm bảo tunnel luôn chạy

Tự động kiểm tra và khởi động tunnel nếu chưa chạy:

```powershell
.\scripts\ensure-postgresql-tunnel.ps1
```

**Tính năng:**
- ✅ Kiểm tra tunnel đang chạy
- ✅ Tự động khởi động nếu chưa chạy
- ✅ Test TCP connection
- ✅ Test PostgreSQL connection (nếu có psql)
- ✅ Lưu thông tin vào `tunnel-info.json`

### 3. `test-postgresql-connection.ps1` - Test kết nối PostgreSQL

Kiểm tra kết nối PostgreSQL qua tunnel:

```powershell
# Test cơ bản
.\scripts\test-postgresql-connection.ps1

# Test với password
.\scripts\test-postgresql-connection.ps1 -Password "your_password"
```

**Kiểm tra:**
- ✅ Tunnel đang chạy
- ✅ TCP connection
- ✅ PostgreSQL connection
- ✅ Database access
- ✅ List tables

### 4. `install-tunnel-service.ps1` - Cài đặt auto-start

Tạo Windows Scheduled Task để tunnel tự động chạy khi:
- Đăng nhập vào Windows
- Khởi động máy (delay 30s)

```powershell
# Cài đặt (cần quyền Administrator)
.\scripts\install-tunnel-service.ps1

# Gỡ cài đặt
.\scripts\install-tunnel-service.ps1 -Uninstall
```

**Lưu ý:** Cần chạy PowerShell với quyền Administrator.

### 5. `monitor-tunnel.ps1` - Monitor và tự động restart

Giám sát tunnel và tự động restart nếu bị ngắt:

```powershell
# Chạy monitor (giữ cửa sổ mở)
.\scripts\monitor-tunnel.ps1

# Monitor với interval tùy chỉnh (mặc định 30s)
.\scripts\monitor-tunnel.ps1 -CheckInterval 60
```

**Tính năng:**
- ✅ Kiểm tra tunnel mỗi 30 giây
- ✅ Tự động restart nếu bị ngắt
- ✅ Test TCP connection
- ✅ Log trạng thái

### 6. `auto-start-tunnel.ps1` - Tự động thử 4 cách

Script tự động thử nhiều cách để khởi động tunnel:

```powershell
.\scripts\auto-start-tunnel.ps1
```

**4 cách tự động:**
1. Kill process cũ và dùng port 6543
2. Dùng port PostgreSQL mặc định (5432)
3. Tìm port trống trong danh sách alternative
4. Kill tất cả cloudflared và thử lại

## 📝 Kết nối PostgreSQL

### Connection Info

- **Hostname (Cloudflare)**: `qtusdev-psql.qtusdev.website`
- **Local Host**: `localhost`
- **Port**: `6543`
- **Database**: `qtusdevmarket`
- **User**: `qtusdev`

### Kết nối với psql

```bash
psql -h localhost -p 6543 -U qtusdev qtusdevmarket
```

### Connection String (cho code)

```
postgresql://qtusdev@localhost:6543/qtusdevmarket
```

**Ví dụ với Node.js (pg):**
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 6543,
  database: 'qtusdevmarket',
  user: 'qtusdev',
  password: 'your_password'
});
```

**Ví dụ với Python (psycopg2):**
```python
import psycopg2
conn = psycopg2.connect(
    host='localhost',
    port=6543,
    database='qtusdevmarket',
    user='qtusdev',
    password='your_password'
)
```

## 🔄 Quy trình sử dụng hàng ngày

### Lần đầu setup

```powershell
# 1. Setup tunnel và cài auto-start
.\scripts\setup-postgresql-tunnel.ps1 -InstallService
```

Sau lần đầu, tunnel sẽ tự động chạy khi khởi động máy.

### Mỗi khi cần dùng

```powershell
# Kiểm tra tunnel đang chạy
.\scripts\ensure-postgresql-tunnel.ps1

# Test kết nối
.\scripts\test-postgresql-connection.ps1
```

### Nếu tunnel bị ngắt

```powershell
# Tự động restart
.\scripts\ensure-postgresql-tunnel.ps1

# Hoặc chạy monitor để tự động giữ tunnel chạy
.\scripts\monitor-tunnel.ps1
```

## 🛑 Dừng tunnel

```powershell
# Dừng tất cả cloudflared
Get-Process -Name cloudflared | Stop-Process -Force

# Hoặc dừng process cụ thể (xem PID trong tunnel-info.json)
Stop-Process -Id <PID> -Force
```

## 🔍 Kiểm tra trạng thái

### Kiểm tra nhanh

```powershell
# Kiểm tra port đang listen
Get-NetTCPConnection -LocalPort 6543 -State Listen

# Kiểm tra process
Get-Process -Name cloudflared

# Test TCP connection
Test-NetConnection -ComputerName localhost -Port 6543
```

### Xem thông tin tunnel

```powershell
# Đọc file thông tin
Get-Content .\scripts\tunnel-info.json | ConvertFrom-Json
```

## ⚙️ Cấu hình nâng cao

### Thay đổi port

Sửa trong các script:
- `$Port = 6543` → `$Port = 5432` (hoặc port khác)

### Thay đổi hostname

Sửa trong các script:
- `$Hostname = "qtusdev-psql.qtusdev.website"` → hostname mới

### Monitor với interval khác

```powershell
.\scripts\monitor-tunnel.ps1 -CheckInterval 60  # Kiểm tra mỗi 60 giây
```

## ⚠️ Troubleshooting

### Lỗi: Port đã được sử dụng

```powershell
# Tự động xử lý
.\scripts\auto-start-tunnel.ps1

# Hoặc fix thủ công
.\scripts\fix-tunnel-port.ps1 -KillExisting
```

### Lỗi: Permission denied

Chạy PowerShell với quyền **Administrator**.

### Lỗi: Tunnel không kết nối được

1. **Kiểm tra DNS:**
   ```powershell
   nslookup qtusdev-psql.qtusdev.website
   ```

2. **Kiểm tra Cloudflare Dashboard:**
   - Đăng nhập Cloudflare
   - Kiểm tra tunnel status
   - Kiểm tra DNS records

3. **Kiểm tra firewall:**
   - Windows Firewall có thể chặn cloudflared
   - Thêm exception cho cloudflared

4. **Kiểm tra cloudflared:**
   ```powershell
   cloudflared --version
   cloudflared access tcp --hostname qtusdev-psql.qtusdev.website --url localhost:6543
   ```

### Lỗi: PostgreSQL connection refused

1. **Đợi thêm thời gian:**
   - Tunnel cần vài giây để kết nối hoàn toàn
   - Chạy lại test sau 10-20 giây

2. **Kiểm tra password:**
   ```powershell
   .\scripts\test-postgresql-connection.ps1 -Password "your_password"
   ```

3. **Kiểm tra database tồn tại:**
   - Đảm bảo database `qtusdevmarket` đã được tạo
   - Đảm bảo user `qtusdev` có quyền truy cập

### Lỗi: Tunnel bị ngắt thường xuyên

1. **Chạy monitor:**
   ```powershell
   .\scripts\monitor-tunnel.ps1
   ```

2. **Cài auto-start service:**
   ```powershell
   .\scripts\install-tunnel-service.ps1
   ```

3. **Kiểm tra kết nối internet:**
   - Cloudflare Tunnel cần internet ổn định

## 📌 Lưu ý quan trọng

1. **Tunnel cần internet:**
   - Cloudflare Tunnel cần kết nối internet để hoạt động
   - Nếu mất internet, tunnel sẽ ngắt

2. **Giữ tunnel chạy:**
   - Nếu chạy thủ công, giữ cửa sổ PowerShell mở
   - Nếu dùng service, tunnel tự động chạy background
   - Nếu dùng monitor, giữ cửa sổ monitor mở

3. **Bảo mật:**
   - Không share tunnel hostname công khai
   - Sử dụng password mạnh cho PostgreSQL
   - Chỉ cho phép kết nối từ localhost

4. **Performance:**
   - Tunnel có thể có độ trễ nhỏ
   - Phù hợp cho development, không khuyến nghị cho production high-load

## 📚 Tài liệu tham khảo

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 🎯 Tóm tắt nhanh

```powershell
# Setup một lần (cần Admin)
.\scripts\setup-postgresql-tunnel.ps1 -InstallService

# Mỗi khi cần dùng
.\scripts\ensure-postgresql-tunnel.ps1
.\scripts\test-postgresql-connection.ps1

# Kết nối
psql -h localhost -p 6543 -U qtusdev qtusdevmarket
```

---

**Chúc bạn code vui vẻ! 🚀**
