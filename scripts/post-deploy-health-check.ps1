# Script kiểm tra health sau khi deploy
# Test website và database connection

param(
    [string]$WebsiteUrl = "",
    [int]$Timeout = 30
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "Post-Deploy Health Check" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$allChecksPassed = $true

# 1. Kiểm tra tunnel
Write-Host "[1/4] Checking Cloudflare Tunnel..." -ForegroundColor Cyan
$listening = Get-NetTCPConnection -LocalPort 6543 -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    Write-Host "  [OK] Tunnel is listening on port 6543" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Tunnel is not running!" -ForegroundColor Red
    Write-Host "  [INFO] Run: .\scripts\ensure-postgresql-tunnel.ps1" -ForegroundColor Yellow
    $allChecksPassed = $false
}

# 2. Kiểm tra database connection
Write-Host ""
Write-Host "[2/4] Checking database connection..." -ForegroundColor Cyan
$dbCheckScript = Join-Path $PSScriptRoot "test-postgresql-connection.ps1"
if (Test-Path $dbCheckScript) {
    & powershell.exe -ExecutionPolicy Bypass -File $dbCheckScript | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Database connection successful" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Database connection failed" -ForegroundColor Red
        $allChecksPassed = $false
    }
} else {
    Write-Host "  [WARNING] Database check script not found" -ForegroundColor Yellow
}

# 3. Kiểm tra website (nếu có URL)
if ($WebsiteUrl) {
    Write-Host ""
    Write-Host "[3/4] Checking website health..." -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "$WebsiteUrl/api/health" -TimeoutSec $Timeout -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  [OK] Website health endpoint responded" -ForegroundColor Green
            $healthData = $response.Content | ConvertFrom-Json
            if ($healthData.status -eq "ok") {
                Write-Host "  [OK] Website status: OK" -ForegroundColor Green
            } else {
                Write-Host "  [WARNING] Website status: $($healthData.status)" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  [ERROR] Website health check failed: $_" -ForegroundColor Red
        $allChecksPassed = $false
    }
} else {
    Write-Host ""
    Write-Host "[3/4] Skipping website check (no URL provided)" -ForegroundColor Yellow
}

# 4. Kiểm tra database health endpoint
Write-Host ""
Write-Host "[4/4] Checking database health endpoint..." -ForegroundColor Cyan
if ($WebsiteUrl) {
    try {
        $response = Invoke-WebRequest -Uri "$WebsiteUrl/api/health/database" -TimeoutSec $Timeout -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "  [OK] Database health endpoint responded" -ForegroundColor Green
            $healthData = $response.Content | ConvertFrom-Json
            if ($healthData.status -eq "ok") {
                Write-Host "  [OK] Database status: OK" -ForegroundColor Green
            } else {
                Write-Host "  [WARNING] Database status: $($healthData.status)" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  [ERROR] Database health endpoint failed: $_" -ForegroundColor Red
        $allChecksPassed = $false
    }
} else {
    Write-Host "  [INFO] Skipping (no URL provided)" -ForegroundColor Gray
}

# Tóm tắt
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
if ($allChecksPassed) {
    Write-Host "✅ All health checks passed!" -ForegroundColor Green
    Write-Host "Website and database are healthy!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some health checks failed!" -ForegroundColor Red
    Write-Host "Please investigate issues." -ForegroundColor Yellow
    exit 1
}

