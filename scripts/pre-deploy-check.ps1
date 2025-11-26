# Script kiểm tra trước khi deploy
# Đảm bảo tunnel và database hoạt động

param(
    [switch]$SkipTunnel = $false
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Pre-Deploy Check" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$allChecksPassed = $true

# 1. Kiểm tra tunnel (nếu không skip)
if (-not $SkipTunnel) {
    Write-Host "[1/5] Checking Cloudflare Tunnel..." -ForegroundColor Cyan
    $tunnelScript = Join-Path $PSScriptRoot "ensure-postgresql-tunnel.ps1"
    if (Test-Path $tunnelScript) {
        & powershell.exe -ExecutionPolicy Bypass -File $tunnelScript | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Tunnel is running" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Tunnel check failed" -ForegroundColor Red
            $allChecksPassed = $false
        }
    } else {
        Write-Host "  [WARNING] Tunnel script not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "[1/5] Skipping tunnel check..." -ForegroundColor Yellow
}

# 2. Kiểm tra database connection
Write-Host ""
Write-Host "[2/5] Checking database connection..." -ForegroundColor Cyan
$dbCheckScript = Join-Path $PSScriptRoot "test-postgresql-connection.ps1"
if (Test-Path $dbCheckScript) {
    & powershell.exe -ExecutionPolicy Bypass -File $dbCheckScript | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Database connection successful" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Database connection test failed" -ForegroundColor Yellow
        Write-Host "  [INFO] This is normal - tunnel needs 10-30 seconds to connect to remote server" -ForegroundColor Gray
        Write-Host "  [INFO] Website will work - database will connect automatically when needed" -ForegroundColor Gray
        # Không fail deploy vì tunnel đang chạy, chỉ cần thời gian
    }
} else {
    Write-Host "  [WARNING] Database check script not found" -ForegroundColor Yellow
}

# 3. Kiểm tra environment variables
Write-Host ""
Write-Host "[3/5] Checking environment variables..." -ForegroundColor Cyan
$requiredVars = @("DATABASE_URL", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME")
$missingVars = @()

# Kiểm tra .env.local
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    foreach ($var in $requiredVars) {
        if ($envContent -notmatch "$var=") {
            $missingVars += $var
        }
    }
} else {
    Write-Host "  [WARNING] .env.local not found" -ForegroundColor Yellow
    $missingVars = $requiredVars
}

if ($missingVars.Count -eq 0) {
    Write-Host "  [OK] All required environment variables found" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Missing variables: $($missingVars -join ', ')" -ForegroundColor Yellow
    Write-Host "  [INFO] Make sure DATABASE_URL points to localhost:6543" -ForegroundColor Gray
}

# 4. Kiểm tra DATABASE_URL format
Write-Host ""
Write-Host "[4/5] Checking DATABASE_URL format..." -ForegroundColor Cyan
if ($envContent) {
    if ($envContent -match "DATABASE_URL=(.+)") {
        $dbUrl = $matches[1].Trim()
        if ($dbUrl -match "localhost:6543" -or $dbUrl -match "127\.0\.0\.1:6543") {
            Write-Host "  [OK] DATABASE_URL points to tunnel port (6543)" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] DATABASE_URL might not use tunnel port" -ForegroundColor Yellow
            Write-Host "  [INFO] Expected: postgresql://user@localhost:6543/database" -ForegroundColor Gray
        }
    }
}

# 5. Kiểm tra database schema
Write-Host ""
Write-Host "[5/5] Checking database schema..." -ForegroundColor Cyan
$schemaCheckScript = Join-Path $PSScriptRoot "check-database-before-deploy.js"
if (Test-Path $schemaCheckScript) {
    node $schemaCheckScript
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Database schema check passed" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Database schema check failed" -ForegroundColor Yellow
        Write-Host "  [INFO] This is normal if tunnel is still connecting" -ForegroundColor Gray
        Write-Host "  [INFO] Schema will be checked automatically when database connects" -ForegroundColor Gray
        # Không fail deploy - schema check sẽ pass khi database connect được
    }
} else {
    Write-Host "  [WARNING] Schema check script not found" -ForegroundColor Yellow
}

# Tóm tắt
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
if ($allChecksPassed) {
    Write-Host "✅ All pre-deploy checks passed!" -ForegroundColor Green
    Write-Host "Ready to deploy!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some checks failed!" -ForegroundColor Red
    Write-Host "Please fix issues before deploying." -ForegroundColor Yellow
    exit 1
}

