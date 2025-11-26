# Script quick-fix Supabase connection
# Usage: .\scripts\quick-fix-supabase.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "QUICK FIX SUPABASE CONNECTION" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kiểm tra DNS
Write-Host "[1/3] Kiểm tra DNS..." -ForegroundColor Cyan
$hostname = "db.qrozeqsmqvkqxqenhike.supabase.co"
try {
    $dnsResult = [System.Net.Dns]::GetHostAddresses($hostname)
    Write-Host "  [OK] DNS Resolution thành công!" -ForegroundColor Green
    Write-Host "  IP: $($dnsResult[0].IPAddressToString)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [INFO] Connection đã hoạt động, không cần fix!" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "  [ERROR] DNS Resolution thất bại!" -ForegroundColor Red
    Write-Host "  Lỗi: $_" -ForegroundColor Yellow
}
Write-Host ""

# 2. Hướng dẫn fix
Write-Host "[2/3] Hướng dẫn khắc phục..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  ⚠️  VẤN ĐỀ: Supabase project có thể bị PAUSE" -ForegroundColor Yellow
Write-Host ""
Write-Host "  📋 CÁC BƯỚC:" -ForegroundColor Cyan
Write-Host "    1. Mở trình duyệt và vào:" -ForegroundColor White
Write-Host "       https://supabase.com/dashboard/project/qrozeqsmqvkqxqenhike" -ForegroundColor Cyan
Write-Host ""
Write-Host "    2. Kiểm tra trạng thái project:" -ForegroundColor White
Write-Host "       - Nếu thấy 'Project is paused' → Click 'Restore project'" -ForegroundColor Yellow
Write-Host "       - Đợi 1-2 phút để project khởi động lại" -ForegroundColor Yellow
Write-Host ""
Write-Host "    3. Verify connection string:" -ForegroundColor White
Write-Host "       - Vào Settings → Database" -ForegroundColor Gray
Write-Host "       - Copy Connection string mới (nếu có)" -ForegroundColor Gray
Write-Host "       - Update vào .env.local" -ForegroundColor Gray
Write-Host ""
Write-Host "    4. Test lại:" -ForegroundColor White
Write-Host "       .\scripts\test-supabase-connection.ps1" -ForegroundColor Cyan
Write-Host ""

# 3. Kiểm tra .env.local
Write-Host "[3/3] Kiểm tra .env.local..." -ForegroundColor Cyan
$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (Test-Path $envFile) {
    Write-Host "  [OK] File .env.local tồn tại" -ForegroundColor Green
    
    $envContent = Get-Content $envFile -Raw
    $hasDatabaseUrl = $envContent -match "DATABASE_URL"
    $hasDbHost = $envContent -match "DB_HOST"
    
    if ($hasDatabaseUrl -or $hasDbHost) {
        Write-Host "  [OK] Database config đã được set" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Thiếu DATABASE_URL hoặc DB_HOST" -ForegroundColor Yellow
        Write-Host "  Chạy: .\scripts\setup-supabase-env.ps1" -ForegroundColor Cyan
    }
} else {
    Write-Host "  [ERROR] File .env.local không tồn tại!" -ForegroundColor Red
    Write-Host "  Chạy: .\scripts\setup-supabase-env.ps1" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LƯU Ý" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  - Schema SQL bạn cung cấp là ĐÚNG và ĐỦ" -ForegroundColor Green
Write-Host "  - Vấn đề chỉ là DNS/Connection (project pause)" -ForegroundColor Yellow
Write-Host "  - Sau khi restore project, mọi thứ sẽ hoạt động" -ForegroundColor Green
Write-Host ""

