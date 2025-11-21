# Script deploy với đầy đủ checks
# Đảm bảo website và PostgreSQL hoạt động sau deploy

param(
    [string]$WebsiteUrl = "",
    [switch]$SkipPreCheck = $false,
    [switch]$SkipPostCheck = $false
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "Deploy with Health Checks" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$ScriptDir = $PSScriptRoot
$PreCheckScript = Join-Path $ScriptDir "pre-deploy-check.ps1"
$PostCheckScript = Join-Path $ScriptDir "post-deploy-health-check.ps1"
$EnsureTunnelScript = Join-Path $ScriptDir "ensure-postgresql-tunnel.ps1"
$EnsureDbUrlScript = Join-Path $ScriptDir "ensure-database-url.ps1"

# 1. Pre-deploy checks
if (-not $SkipPreCheck) {
    Write-Host "[1/4] Running pre-deploy checks..." -ForegroundColor Cyan
    & powershell.exe -ExecutionPolicy Bypass -File $PreCheckScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Pre-deploy checks failed!" -ForegroundColor Red
        Write-Host "Please fix issues before deploying." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "[1/4] Skipping pre-deploy checks..." -ForegroundColor Yellow
}

# 2. Đảm bảo DATABASE_URL đúng
Write-Host ""
Write-Host "[2/4] Ensuring DATABASE_URL configuration..." -ForegroundColor Cyan
& powershell.exe -ExecutionPolicy Bypass -File $EnsureDbUrlScript -UpdateOnly
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] DATABASE_URL configuration had issues" -ForegroundColor Yellow
}

# 3. Đảm bảo tunnel chạy
Write-Host ""
Write-Host "[3/4] Ensuring tunnel is running..." -ForegroundColor Cyan
& powershell.exe -ExecutionPolicy Bypass -File $EnsureTunnelScript
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start tunnel!" -ForegroundColor Red
    exit 1
}

# 4. Deploy (Netlify CLI hoặc git push)
Write-Host ""
Write-Host "[4/4] Ready to deploy!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deploy options:" -ForegroundColor Yellow
Write-Host "  1. Netlify CLI: netlify deploy --prod" -ForegroundColor White
Write-Host "  2. Git push: git push origin main" -ForegroundColor White
Write-Host ""

# 5. Post-deploy health check (nếu có URL)
if ($WebsiteUrl -and -not $SkipPostCheck) {
    Write-Host "Waiting for deployment to complete..." -ForegroundColor Cyan
    Start-Sleep -Seconds 30  # Đợi deploy hoàn tất
    
    Write-Host ""
    Write-Host "Running post-deploy health checks..." -ForegroundColor Cyan
    & powershell.exe -ExecutionPolicy Bypass -File $PostCheckScript -WebsiteUrl $WebsiteUrl
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARNING] Post-deploy health checks had issues" -ForegroundColor Yellow
        Write-Host "Please check website manually: $WebsiteUrl" -ForegroundColor Yellow
    } else {
        Write-Host "[SUCCESS] All health checks passed!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "[SUCCESS] Deploy process complete!" -ForegroundColor Green
Write-Host ""

