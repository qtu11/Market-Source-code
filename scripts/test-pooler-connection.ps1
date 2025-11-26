# Test Supabase connection với Session Pooler (port 6543)
# Usage: .\scripts\test-pooler-connection.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST SUPABASE SESSION POOLER" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load .env.local
$rootDir = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $rootDir ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "[ERROR] File .env.local không tồn tại!" -ForegroundColor Red
    exit 1
}

Write-Host "[1/5] Đọc .env.local..." -ForegroundColor Cyan
$envContent = Get-Content $envFile -Raw

# Extract DATABASE_URL - improved regex
$databaseUrl = $null
$lines = $envContent -split "`r?`n"
foreach ($line in $lines) {
    if ($line -match "^DATABASE_URL\s*=\s*(.+)$") {
        $databaseUrl = $matches[1].Trim()
        # Remove quotes if present
        $databaseUrl = $databaseUrl -replace '^["'']|["'']$', ''
        break
    }
}

if (-not $databaseUrl) {
    Write-Host "  [ERROR] Không tìm thấy DATABASE_URL trong .env.local" -ForegroundColor Red
    exit 1
}

# Check if using pooler
$usingPooler = $databaseUrl -match ":6543" -or $databaseUrl -match "pgbouncer=true"
Write-Host "  [OK] DATABASE_URL found" -ForegroundColor Green
Write-Host "  Using Pooler: $usingPooler" -ForegroundColor $(if ($usingPooler) { "Green" } else { "Yellow" })

# Extract hostname - improved regex
$hostname = $null
if ($databaseUrl -match "@([^:/@]+)(?::|/)") {
    $hostname = $matches[1]
}

Write-Host ""
Write-Host "[2/5] Test DNS Resolution..." -ForegroundColor Cyan
if ($hostname) {
    try {
        $dnsResult = [System.Net.Dns]::GetHostAddresses($hostname)
        Write-Host "  [OK] DNS Resolution thành công!" -ForegroundColor Green
        Write-Host "  Hostname: $hostname" -ForegroundColor Gray
        Write-Host "  IP: $($dnsResult[0].IPAddressToString)" -ForegroundColor Gray
    } catch {
        Write-Host "  [ERROR] DNS Resolution thất bại!" -ForegroundColor Red
        Write-Host "  Lỗi: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARNING] Không thể extract hostname" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/5] Test Supabase API..." -ForegroundColor Cyan
$apiUrl = "https://qrozeqsmqvkqxqenhike.supabase.co"
try {
    $response = Invoke-WebRequest -Uri $apiUrl -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  [OK] Supabase API đang hoạt động" -ForegroundColor Green
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "  [WARNING] Không thể kết nối Supabase API" -ForegroundColor Yellow
    Write-Host "  Lỗi: $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[4/5] Test PostgreSQL Connection (port 6543)..." -ForegroundColor Cyan

# Extract password từ DATABASE_URL - improved regex
$password = $null
if ($databaseUrl -match "://[^:]+:([^@]+)@") {
    $password = $matches[1]
    # Decode URL encoding if present
    $password = [System.Web.HttpUtility]::UrlDecode($password)
}

if ($password -and $hostname) {
    # Test với psql nếu có
    $psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
    if (Test-Path $psqlPath) {
        try {
            $env:PGPASSWORD = $password
            $testQuery = "SELECT version(), NOW();"
            $psqlArgs = @(
                "-h", $hostname,
                "-p", "6543",
                "-U", "postgres",
                "-d", "postgres",
                "-c", $testQuery,
                "-t"  # Tuples only
            )
            
            $result = & $psqlPath $psqlArgs 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] PostgreSQL connection thành công!" -ForegroundColor Green
                Write-Host "  Port: 6543 (Session Pooler)" -ForegroundColor Gray
                Write-Host "  Result:" -ForegroundColor Gray
                $result | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
            } else {
                Write-Host "  [ERROR] PostgreSQL connection thất bại!" -ForegroundColor Red
                Write-Host "  Error:" -ForegroundColor Yellow
                $result | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
            }
            Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
        } catch {
            Write-Host "  [ERROR] Lỗi khi test connection" -ForegroundColor Red
            Write-Host "  $_" -ForegroundColor Yellow
            Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "  [INFO] psql không tìm thấy, bỏ qua test trực tiếp" -ForegroundColor Yellow
        Write-Host "  Path: $psqlPath" -ForegroundColor Gray
    }
} else {
    Write-Host "  [WARNING] Không thể extract password hoặc hostname" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[5/5] Test Node.js Connection..." -ForegroundColor Cyan
Write-Host "  [INFO] Để test Node.js connection, chạy:" -ForegroundColor Yellow
Write-Host "    npm run dev" -ForegroundColor Cyan
Write-Host "  Và kiểm tra logs xem có lỗi connection không" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KẾT QUẢ" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
if ($usingPooler) {
    Write-Host "  ✅ Đã sử dụng Session Pooler (port 6543)" -ForegroundColor Green
    Write-Host "  ✅ IPv4 compatible" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Chưa sử dụng Session Pooler" -ForegroundColor Yellow
    Write-Host "  Chạy: .\scripts\fix-ipv4-pooler.ps1" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  Connection String (ẩn password):" -ForegroundColor Yellow
$safeUrl = $databaseUrl -replace "://([^:]+):([^@]+)@", "://`$1:***@"
Write-Host "    $safeUrl" -ForegroundColor Gray
Write-Host ""

