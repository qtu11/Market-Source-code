# Script monitor hệ thống liên tục
# Kiểm tra website và database health

param(
    [string]$WebsiteUrl = "",
    [int]$Interval = 60,  # Kiểm tra mỗi 60 giây
    [switch]$RunOnce = $false
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "System Monitor" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Monitoring interval: $Interval seconds" -ForegroundColor Cyan
if ($WebsiteUrl) {
    Write-Host "Website URL: $WebsiteUrl" -ForegroundColor Cyan
}
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

$checkCount = 0

while ($true) {
    $checkCount++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    Write-Host "[$timestamp] Check #$checkCount" -ForegroundColor Cyan
    
    # 1. Kiểm tra tunnel
    $listening = Get-NetTCPConnection -LocalPort 6543 -State Listen -ErrorAction SilentlyContinue
    if ($listening) {
        Write-Host "  [OK] Tunnel: Running" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Tunnel: Not running!" -ForegroundColor Red
        Write-Host "  [INFO] Attempting to restart..." -ForegroundColor Yellow
        $tunnelScript = Join-Path $PSScriptRoot "ensure-postgresql-tunnel.ps1"
        & powershell.exe -ExecutionPolicy Bypass -File $tunnelScript | Out-Null
    }
    
    # 2. Kiểm tra database
    $dbScript = Join-Path $PSScriptRoot "test-postgresql-connection.ps1"
    if (Test-Path $dbScript) {
        & powershell.exe -ExecutionPolicy Bypass -File $dbScript | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Database: Connected" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Database: Connection failed!" -ForegroundColor Red
        }
    }
    
    # 3. Kiểm tra website (nếu có URL)
    if ($WebsiteUrl) {
        try {
            $response = Invoke-WebRequest -Uri "$WebsiteUrl/api/health" -TimeoutSec 10 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "  [OK] Website: Healthy" -ForegroundColor Green
            } else {
                Write-Host "  [WARNING] Website: Status $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  [ERROR] Website: Unreachable" -ForegroundColor Red
        }
        
        # Kiểm tra database health endpoint
        try {
            $response = Invoke-WebRequest -Uri "$WebsiteUrl/api/health/database" -TimeoutSec 10 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $healthData = $response.Content | ConvertFrom-Json
                if ($healthData.status -eq "healthy") {
                    Write-Host "  [OK] Database API: Healthy" -ForegroundColor Green
                } else {
                    Write-Host "  [WARNING] Database API: $($healthData.status)" -ForegroundColor Yellow
                }
            }
        } catch {
            Write-Host "  [ERROR] Database API: Unreachable" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    
    if ($RunOnce) {
        break
    }
    
    Start-Sleep -Seconds $Interval
}

