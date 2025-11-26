# Script tự động fix IPv4 - chuyển sang Session Pooler (port 6543)
# Usage: .\scripts\fix-ipv4-pooler.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIX IPv4 - SESSION POOLER" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $rootDir ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "[ERROR] File .env.local không tồn tại!" -ForegroundColor Red
    Write-Host "Chạy: .\scripts\setup-supabase-env.ps1" -ForegroundColor Cyan
    exit 1
}

Write-Host "[1/4] Đọc file .env.local..." -ForegroundColor Cyan
$content = Get-Content $envFile -Raw

# Kiểm tra xem đã dùng pooler chưa
if ($content -match ":6543" -or $content -match "pgbouncer=true") {
    Write-Host "  [OK] Đã sử dụng Session Pooler (port 6543)" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Connection string hiện tại:" -ForegroundColor Yellow
    if ($content -match "DATABASE_URL=(.+?)(?:\r?\n|$)") {
        $url = $matches[1]
        # Ẩn password
        $url = $url -replace "://([^:]+):([^@]+)@", "://`$1:***@"
        Write-Host "    $url" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "  [INFO] Không cần update, đã dùng pooler rồi!" -ForegroundColor Cyan
    exit 0
}

Write-Host "[2/4] Phát hiện connection string cũ (port 5432)..." -ForegroundColor Cyan

$updated = $false
$backupFile = "$envFile.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"

# Backup file cũ
Copy-Item $envFile $backupFile
Write-Host "  [OK] Đã backup: $backupFile" -ForegroundColor Gray

# Update DATABASE_URL - improved regex với line-by-line processing
$lines = $content -split "`r?`n"
$newLines = @()

foreach ($line in $lines) {
    if ($line -match "^DATABASE_URL\s*=\s*(.+)") {
        $url = $matches[1].Trim()
        # Remove quotes if present
        $url = $url -replace '^["'']|["'']$', ''
        
        # Check if already using pooler
        if ($url -match ":6543" -or $url -match "pgbouncer=true") {
            $newLines += $line
            continue
        }
        
        # Replace port 5432 with 6543
        if ($url -match ":5432/") {
            $url = $url -replace ":5432/", ":6543/"
            
            # Add pgbouncer=true if not present
            if ($url -notmatch "pgbouncer=true") {
                if ($url -match "\?") {
                    $url = $url + "&pgbouncer=true"
                } else {
                    $url = $url + "?pgbouncer=true"
                }
            }
            
            $newLine = "DATABASE_URL=$url"
            $newLines += $newLine
            Write-Host "  [OK] Đã update DATABASE_URL sang port 6543 với pgbouncer=true" -ForegroundColor Green
            $updated = $true
        } else {
            $newLines += $line
        }
    } else {
        $newLines += $line
    }
}

$content = $newLines -join "`n"

# Update DB_PORT nếu có
if ($content -match "DB_PORT\s*=\s*5432") {
    $content = $content -replace "DB_PORT\s*=\s*5432", "DB_PORT=6543"
    Write-Host "  [OK] Đã update DB_PORT từ 5432 → 6543" -ForegroundColor Green
    $updated = $true
}

if (-not $updated) {
    Write-Host "  [WARNING] Không tìm thấy connection string cần update" -ForegroundColor Yellow
    Write-Host "  Kiểm tra file .env.local có DATABASE_URL hoặc DB_PORT không?" -ForegroundColor Yellow
    Remove-Item $backupFile
    exit 1
}

# Thêm comment nếu chưa có
if (-not ($content -match "# Session Pooler|# IPv4")) {
    $lines = $content -split "`r?`n"
    $newLines = @()
    $commentAdded = $false
    
    foreach ($line in $lines) {
        if (-not $commentAdded -and ($line -match "DATABASE_URL|DB_PORT")) {
            $newLines += "# Session Pooler (IPv4 compatible) - Port 6543"
            $commentAdded = $true
        }
        $newLines += $line
    }
    $content = $newLines -join "`n"
}

Write-Host "[3/4] Lưu file .env.local..." -ForegroundColor Cyan
$content | Set-Content $envFile -NoNewline
Write-Host "  [OK] Đã lưu!" -ForegroundColor Green

Write-Host "[4/4] Test connection..." -ForegroundColor Cyan
Write-Host ""

# Test connection
$testScript = Join-Path $PSScriptRoot "test-supabase-connection.ps1"
if (Test-Path $testScript) {
    & $testScript
} else {
    Write-Host "  [INFO] Script test không tìm thấy, bỏ qua test" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HOÀN TẤT" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ✅ Đã chuyển sang Session Pooler (port 6543)" -ForegroundColor Green
Write-Host "  ✅ IPv4 compatible" -ForegroundColor Green
Write-Host "  ✅ Backup file: $backupFile" -ForegroundColor Gray
Write-Host ""
Write-Host "  Test lại connection:" -ForegroundColor Yellow
Write-Host "    .\scripts\test-supabase-connection.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Restart dev server:" -ForegroundColor Yellow
Write-Host "    npm run dev" -ForegroundColor Cyan
Write-Host ""

