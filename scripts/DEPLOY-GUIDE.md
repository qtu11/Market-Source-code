# 🚀 Hướng dẫn Deploy - Đảm bảo Website & PostgreSQL hoạt động

## 📋 Tổng quan

Hệ thống tự động đảm bảo:
- ✅ Cloudflare Tunnel luôn chạy
- ✅ PostgreSQL kết nối được qua tunnel
- ✅ Website hoạt động bình thường sau deploy
- ✅ Health checks tự động

## 🔧 Setup trước khi deploy

### 1. Đảm bảo DATABASE_URL đúng

```powershell
.\scripts\ensure-database-url.ps1 -UpdateOnly
```

Script này sẽ:
- Tự động cập nhật `.env.local` với `DATABASE_URL` đúng format
- Đảm bảo các biến `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` có đầy đủ
- Format: `postgresql://qtusdev:password@localhost:6543/qtusdevmarket`

### 2. Đảm bảo tunnel chạy

```powershell
.\scripts\ensure-postgresql-tunnel.ps1
```

Hoặc cài auto-start:

```powershell
.\scripts\setup-postgresql-tunnel.ps1 -InstallService
```

## 🚀 Deploy với checks tự động

### Cách 1: Deploy script tự động (KHUYẾN NGHỊ)

```powershell
# Deploy với đầy đủ checks
.\scripts\deploy-with-checks.ps1 -WebsiteUrl "https://your-site.netlify.app"
```

Script sẽ tự động:
1. ✅ Pre-deploy checks (tunnel, database, schema)
2. ✅ Đảm bảo DATABASE_URL đúng
3. ✅ Đảm bảo tunnel chạy
4. ✅ Hướng dẫn deploy
5. ✅ Post-deploy health checks

### Cách 2: Deploy thủ công với checks

#### Bước 1: Pre-deploy check

```powershell
.\scripts\pre-deploy-check.ps1
```

Kiểm tra:
- ✅ Cloudflare Tunnel đang chạy
- ✅ Database connection
- ✅ Environment variables
- ✅ DATABASE_URL format
- ✅ Database schema

#### Bước 2: Deploy

```bash
# Netlify CLI
netlify deploy --prod

# Hoặc Git push
git push origin main
```

#### Bước 3: Post-deploy health check

```powershell
.\scripts\post-deploy-health-check.ps1 -WebsiteUrl "https://your-site.netlify.app"
```

Kiểm tra:
- ✅ Tunnel vẫn chạy
- ✅ Database connection
- ✅ Website health endpoint
- ✅ Database health endpoint

## 📊 Monitoring

### Monitor liên tục

```powershell
# Monitor mỗi 60 giây
.\scripts\monitor-system.ps1 -WebsiteUrl "https://your-site.netlify.app"

# Monitor với interval tùy chỉnh
.\scripts\monitor-system.ps1 -WebsiteUrl "https://your-site.netlify.app" -Interval 30
```

### Monitor một lần

```powershell
.\scripts\monitor-system.ps1 -WebsiteUrl "https://your-site.netlify.app" -RunOnce
```

## 🔍 Health Check Endpoints

Sau khi deploy, website có các health check endpoints:

### 1. Website Health
```
GET /api/health
GET /health (redirect)
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T...",
  "uptime": 12345,
  "environment": "production",
  "version": "1.0.0"
}
```

### 2. Database Health
```
GET /api/health/database
GET /health/database (redirect)
```

Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-19T...",
  "version": "PostgreSQL 15.x",
  "tableCount": 50,
  "responseTime": "15ms"
}
```

## ⚠️ Troubleshooting

### Lỗi: Tunnel không chạy sau deploy

```powershell
# Kiểm tra và restart
.\scripts\ensure-postgresql-tunnel.ps1

# Hoặc chạy monitor để tự động restart
.\scripts\monitor-tunnel.ps1
```

### Lỗi: Database connection failed

1. **Kiểm tra tunnel:**
   ```powershell
   Get-NetTCPConnection -LocalPort 6543 -State Listen
   ```

2. **Kiểm tra DATABASE_URL:**
   ```powershell
   .\scripts\ensure-database-url.ps1 -UpdateOnly
   ```

3. **Test connection:**
   ```powershell
   .\scripts\test-postgresql-connection.ps1
   ```

### Lỗi: Website health check failed

1. **Kiểm tra website đã deploy chưa:**
   - Truy cập URL trực tiếp
   - Kiểm tra Netlify dashboard

2. **Kiểm tra environment variables trên Netlify:**
   - Đăng nhập Netlify dashboard
   - Site settings → Environment variables
   - Đảm bảo `DATABASE_URL` đúng format

3. **Kiểm tra build logs:**
   - Netlify dashboard → Deploys → Build logs
   - Tìm lỗi liên quan đến database

## 📝 Checklist Deploy

Trước khi deploy:
- [ ] Tunnel đang chạy (`.\scripts\ensure-postgresql-tunnel.ps1`)
- [ ] DATABASE_URL đúng (`.\scripts\ensure-database-url.ps1`)
- [ ] Database connection OK (`.\scripts\test-postgresql-connection.ps1`)
- [ ] Pre-deploy checks pass (`.\scripts\pre-deploy-check.ps1`)

Sau khi deploy:
- [ ] Website accessible
- [ ] Health endpoint OK (`/api/health`)
- [ ] Database health OK (`/api/health/database`)
- [ ] Post-deploy checks pass (`.\scripts\post-deploy-health-check.ps1`)

## 🔄 Quy trình hàng ngày

### Mỗi khi deploy

```powershell
# 1. Quick check
.\scripts\deploy-with-checks.ps1 -WebsiteUrl "https://your-site.netlify.app"

# 2. Deploy (Netlify CLI hoặc git push)
netlify deploy --prod

# 3. Verify
.\scripts\post-deploy-health-check.ps1 -WebsiteUrl "https://your-site.netlify.app"
```

### Monitor liên tục (tùy chọn)

```powershell
# Chạy trong background hoặc terminal riêng
.\scripts\monitor-system.ps1 -WebsiteUrl "https://your-site.netlify.app" -Interval 60
```

## 🎯 Tóm tắt nhanh

```powershell
# Setup một lần
.\scripts\setup-postgresql-tunnel.ps1 -InstallService
.\scripts\ensure-database-url.ps1 -UpdateOnly

# Mỗi khi deploy
.\scripts\deploy-with-checks.ps1 -WebsiteUrl "https://your-site.netlify.app"
netlify deploy --prod

# Monitor (tùy chọn)
.\scripts\monitor-system.ps1 -WebsiteUrl "https://your-site.netlify.app"
```

---

**Chúc bạn deploy thành công! 🚀**

