# Script monitor tunnel và tự động restart nếu bị ngắt
# Chạy script này trong background để giữ tunnel luôn hoạt động

param(
    [int]$Port = 6543,
    [int]$CheckInterval = 30,  # Kiểm tra mỗi 30 giây
    [switch]$RunOnce = $false
)

$ScriptPath = Join-Path $PSScriptRoot "ensure-postgresql-tunnel.ps1"

Write-Host "========================================" -ForegroundColor Green
Write-Host "PostgreSQL Tunnel Monitor" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Monitoring tunnel on port $Port" -ForegroundColor Cyan
Write-Host "Check interval: $CheckInterval seconds" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
Write-Host ""

$checkCount = 0

while ($true) {
    $checkCount++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    # Kiểm tra tunnel
    $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    $process = $null
    
    if ($listening) {
        $processId = $listening.OwningProcess | Select-Object -First 1
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        if ($process -and $process.ProcessName -eq "cloudflared") {
            # Test TCP connection
            $tcpTest = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
            
            if ($tcpTest.TcpTestSucceeded) {
                if ($checkCount % 10 -eq 0) {  # Chỉ log mỗi 10 lần kiểm tra
                    Write-Host "[$timestamp] [OK] Tunnel is healthy (PID: $processId)" -ForegroundColor Green
                }
            } else {
                Write-Host "[$timestamp] [WARNING] Tunnel process running but TCP test failed" -ForegroundColor Yellow
                Write-Host "  Restarting tunnel..." -ForegroundColor Cyan
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
                & powershell.exe -ExecutionPolicy Bypass -File $ScriptPath | Out-Null
            }
        } else {
            Write-Host "[$timestamp] [WARNING] Port $Port is used by non-cloudflared process" -ForegroundColor Yellow
            Write-Host "  Restarting tunnel..." -ForegroundColor Cyan
            & powershell.exe -ExecutionPolicy Bypass -File $ScriptPath | Out-Null
        }
    } else {
        Write-Host "[$timestamp] [ERROR] Tunnel is not running!" -ForegroundColor Red
        Write-Host "  Starting tunnel..." -ForegroundColor Cyan
        & powershell.exe -ExecutionPolicy Bypass -File $ScriptPath | Out-Null
    }
    
    if ($RunOnce) {
        break
    }
    
    Start-Sleep -Seconds $CheckInterval
}

