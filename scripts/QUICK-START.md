# 🚀 QUICK START - PostgreSQL Tunnel

## ⚡ Setup nhanh trong 3 bước

### Bước 1: Setup tunnel (chạy một lần)

```powershell
.\scripts\setup-postgresql-tunnel.ps1
```

### Bước 2: Cài auto-start (tùy chọn, cần Admin)

```powershell
.\scripts\setup-postgresql-tunnel.ps1 -InstallService
```

### Bước 3: Kết nối PostgreSQL

```bash
psql -h localhost -p 6543 -U qtusdev qtusdevmarket
```

## ✅ Kiểm tra nhanh

```powershell
# Kiểm tra tunnel
.\scripts\ensure-postgresql-tunnel.ps1

# Test kết nối
.\scripts\test-postgresql-connection.ps1
```

## 📋 Thông tin kết nối

- **Host**: `localhost`
- **Port**: `6543`
- **Database**: `qtusdevmarket`
- **User**: `qtusdev`
- **Connection String**: `postgresql://qtusdev@localhost:6543/qtusdevmarket`

## 🔧 Nếu có vấn đề

```powershell
# Tự động fix
.\scripts\auto-start-tunnel.ps1

# Hoặc restart
.\scripts\ensure-postgresql-tunnel.ps1
```

---

**Xem hướng dẫn đầy đủ:** `scripts\README-TUNNEL.md`

