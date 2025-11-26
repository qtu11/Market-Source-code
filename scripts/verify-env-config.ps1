# Verify .env.local configuration
# Usage: .\scripts\verify-env-config.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFY .ENV.LOCAL CONFIGURATION" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $rootDir ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "[ERROR] File .env.local không tồn tại!" -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] Đọc file .env.local..." -ForegroundColor Cyan
$content = Get-Content $envFile

# Tìm DATABASE_URL
$databaseUrlLine = $content | Where-Object { $_ -match "^DATABASE_URL" }
if ($databaseUrlLine) {
    Write-Host "  [OK] Tìm thấy DATABASE_URL" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Raw line:" -ForegroundColor Yellow
    Write-Host "    $databaseUrlLine" -ForegroundColor Gray
    Write-Host ""
    
    # Extract value
    if ($databaseUrlLine -match "DATABASE_URL\s*=\s*(.+)") {
        $url = $matches[1].Trim()
        # Remove quotes
        $url = $url -replace '^["'']|["'']$', ''
        
        Write-Host "  Parsed URL:" -ForegroundColor Yellow
        Write-Host "    $url" -ForegroundColor Gray
        Write-Host ""
        
        # Check port
        if ($url -match ":6543") {
            Write-Host "  ✅ Đang sử dụng port 6543 (Session Pooler)" -ForegroundColor Green
        } elseif ($url -match ":5432") {
            Write-Host "  ⚠️  Đang sử dụng port 5432 (Direct - có thể lỗi IPv4)" -ForegroundColor Yellow
        } else {
            Write-Host "  ⚠️  Không xác định được port" -ForegroundColor Yellow
        }
        
        # Check pgbouncer
        if ($url -match "pgbouncer=true") {
            Write-Host "  ✅ Có pgbouncer=true" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Thiếu pgbouncer=true" -ForegroundColor Yellow
        }
        
        # Extract hostname
        if ($url -match "@([^:/@]+)") {
            $hostname = $matches[1]
            Write-Host ""
            Write-Host "  Hostname: $hostname" -ForegroundColor Cyan
            
            # Test DNS
            Write-Host ""
            Write-Host "[2/3] Test DNS Resolution..." -ForegroundColor Cyan
            try {
                $dnsResult = [System.Net.Dns]::GetHostAddresses($hostname)
                Write-Host "  [OK] DNS Resolution thành công!" -ForegroundColor Green
                Write-Host "  IP: $($dnsResult[0].IPAddressToString)" -ForegroundColor Gray
            } catch {
                Write-Host "  [ERROR] DNS Resolution thất bại!" -ForegroundColor Red
                Write-Host "  Lỗi: $_" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "  → Có thể Supabase project bị PAUSE" -ForegroundColor Yellow
                Write-Host "  → Vào Dashboard và Restore project" -ForegroundColor Cyan
            }
        }
    }
} else {
    Write-Host "  [ERROR] Không tìm thấy DATABASE_URL trong .env.local" -ForegroundColor Red
}

# Check DB_PORT
Write-Host ""
Write-Host "[3/3] Kiểm tra DB_PORT..." -ForegroundColor Cyan
$dbPortLine = $content | Where-Object { $_ -match "^DB_PORT" }
if ($dbPortLine) {
    Write-Host "  [OK] Tìm thấy DB_PORT" -ForegroundColor Green
    Write-Host "    $dbPortLine" -ForegroundColor Gray
    
    if ($dbPortLine -match "6543") {
        Write-Host "  ✅ Port 6543 (Session Pooler)" -ForegroundColor Green
    } elseif ($dbPortLine -match "5432") {
        Write-Host "  ⚠️  Port 5432 (Direct)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [INFO] Không tìm thấy DB_PORT (có thể dùng DATABASE_URL)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TÓM TẮT" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Summary
$needsFix = $false
if ($databaseUrlLine -and $databaseUrlLine -match ":5432" -and $databaseUrlLine -notmatch "pgbouncer=true") {
    Write-Host "  ⚠️  Cần fix: Chuyển sang Session Pooler" -ForegroundColor Yellow
    Write-Host "     Chạy: .\scripts\fix-ipv4-pooler.ps1" -ForegroundColor Cyan
    $needsFix = $true
} elseif ($databaseUrlLine -and ($databaseUrlLine -match ":6543" -or $databaseUrlLine -match "pgbouncer=true")) {
    Write-Host "  ✅ Đã sử dụng Session Pooler (IPv4 compatible)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Không xác định được cấu hình" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Code đã được update để tự động fallback sang port 6543" -ForegroundColor Green
Write-Host "  File: lib/database.ts" -ForegroundColor Gray
Write-Host ""

if (-not $needsFix) {
    Write-Host "  Test Node.js connection:" -ForegroundColor Yellow
    Write-Host "    npm run dev" -ForegroundColor Cyan
    Write-Host ""
}

