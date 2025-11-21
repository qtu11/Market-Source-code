# Script kiểm tra nhanh trạng thái tunnel và database

Write-Host "========================================" -ForegroundColor Green
Write-Host "Quick Status Check" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 1. Tunnel process
Write-Host "[*] Cloudflared process..." -ForegroundColor Cyan
$processes = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "  [OK] Running (PID: $($processes[0].Id))" -ForegroundColor Green
    Write-Host "    Started: $($processes[0].StartTime)" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR] Not running!" -ForegroundColor Red
    exit 1
}

# 2. Port listening
Write-Host ""
Write-Host "[*] Port 6543..." -ForegroundColor Cyan
$listening = Get-NetTCPConnection -LocalPort 6543 -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    Write-Host "  [OK] Listening" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Not listening!" -ForegroundColor Red
    exit 1
}

# 3. TCP connection
Write-Host ""
Write-Host "[*] TCP connection..." -ForegroundColor Cyan
try {
    $tcpTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 6543 -WarningAction SilentlyContinue -ErrorAction Stop
    if ($tcpTest.TcpTestSucceeded) {
        Write-Host "  [OK] Connection successful" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Connection failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [ERROR] Test failed: $_" -ForegroundColor Red
    exit 1
}

# 4. PostgreSQL connection (nếu có psql)
Write-Host ""
Write-Host "[*] PostgreSQL connection..." -ForegroundColor Cyan
if (Get-Command psql -ErrorAction SilentlyContinue) {
    $env:PGPASSWORD = "20022007"
    $env:PGCONNECT_TIMEOUT = "10"
    
    try {
        $result = & psql -h 127.0.0.1 -p 6543 -U qtusdev -d qtusdevmarket -c "SELECT 1;" -t --no-psqlrc 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Connected successfully!" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] Connection test failed" -ForegroundColor Yellow
            Write-Host "    This is normal if tunnel is still connecting to remote server" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  [WARNING] Test error: $_" -ForegroundColor Yellow
    } finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
        Remove-Item Env:\PGCONNECT_TIMEOUT -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "  [INFO] psql not found, skipping" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Status: Tunnel is running and ready" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

