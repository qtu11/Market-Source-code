# Script tự động thử các cách khởi động Cloudflare Tunnel
# Tự động kiểm tra và chọn cách hoạt động tốt nhất

param(
    [int]$Timeout = 5
)

$HOSTNAME = "qtusdev-psql.qtusdev.website"
$PREFERRED_PORT = 6543
$ALTERNATIVE_PORTS = @(5432, 5433, 5434, 6544, 6545, 54320, 54321)

Write-Host "========================================" -ForegroundColor Green
Write-Host "Auto Start Cloudflare Tunnel" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Kiểm tra cloudflared
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] cloudflared not found!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] cloudflared found" -ForegroundColor Green
Write-Host ""

# Function: Kiểm tra port có trống không
function Test-PortAvailable {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return (-not $conn)
}

# Function: Kill process đang dùng port
function Stop-PortProcess {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conn) {
        $processId = $conn.OwningProcess | Select-Object -First 1
        if ($processId) {
            Write-Host "  [*] Stopping process $processId..." -ForegroundColor Cyan
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            return $true
        }
    }
    return $false
}

# Function: Test tunnel connection
function Test-TunnelConnection {
    param([int]$Port)
    
    try {
        $result = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        return $result.TcpTestSucceeded
    } catch {
        return $false
    }
}

# Function: Start tunnel trong background và test
function Start-TunnelAndTest {
    param(
        [int]$Port,
        [string]$Method
    )
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Trying Method: $Method" -ForegroundColor Cyan
    Write-Host "Port: $Port" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Kiểm tra port trước
    if (-not (Test-PortAvailable -Port $Port)) {
        Write-Host "[SKIP] Port $Port is in use" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "[*] Starting tunnel..." -ForegroundColor Cyan
    
    # Start cloudflared trong background process (không dùng job vì job có thể bị kill)
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "cloudflared"
    $processInfo.Arguments = "access tcp --hostname $HOSTNAME --url localhost:$Port"
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.CreateNoWindow = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    
    try {
        $process.Start() | Out-Null
        Write-Host "  [*] Process started (PID: $($process.Id))" -ForegroundColor Gray
        
        # Đợi một chút để tunnel khởi động
        Start-Sleep -Seconds 4
        
        # Kiểm tra process còn chạy không
        if ($process.HasExited) {
            $errorOutput = $process.StandardError.ReadToEnd()
            Write-Host "[ERROR] Tunnel process exited!" -ForegroundColor Red
            if ($errorOutput) {
                Write-Host $errorOutput -ForegroundColor Red
            }
            return $false
        }
        
        # Kiểm tra port có listen không (phải là LISTENING, không phải TIME_WAIT)
        Start-Sleep -Seconds 2
        $portListening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    
    if ($portListening) {
            Write-Host "[OK] Tunnel is listening on port $Port" -ForegroundColor Green
        
        # Test connection
        Write-Host "[*] Testing connection..." -ForegroundColor Cyan
        Start-Sleep -Seconds 1
        
        if (Test-TunnelConnection -Port $Port) {
            Write-Host "[SUCCESS] Tunnel is working!" -ForegroundColor Green
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "Tunnel Started Successfully" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Hostname: $HOSTNAME" -ForegroundColor White
            Write-Host "Local Port: $Port" -ForegroundColor White
            Write-Host "Process ID: $($process.Id)" -ForegroundColor White
            Write-Host ""
            Write-Host "Connect with:" -ForegroundColor Cyan
            Write-Host "  psql -h localhost -p $Port -U qtusdev qtusdevmarket" -ForegroundColor White
            Write-Host ""
            Write-Host "To stop tunnel: Stop-Process -Id $($process.Id) -Force" -ForegroundColor Yellow
            Write-Host ""
            
            return @{
                Success = $true
                Port = $Port
                ProcessId = $process.Id
                Method = $Method
            }
        } else {
            Write-Host "[WARNING] Port is listening but connection test failed" -ForegroundColor Yellow
            Write-Host "[INFO] Tunnel might still be connecting. Wait a few seconds and try again." -ForegroundColor Cyan
            $process.Kill()
            return $false
        }
    } else {
        Write-Host "[ERROR] Tunnel started but port not listening" -ForegroundColor Red
        if (-not $process.HasExited) {
            $errorOutput = $process.StandardError.ReadToEnd()
            if ($errorOutput) {
                Write-Host "Error output:" -ForegroundColor Red
                Write-Host $errorOutput -ForegroundColor Red
            }
            $process.Kill()
        }
        return $false
    }
    } catch {
        Write-Host "[ERROR] Failed to start tunnel: $_" -ForegroundColor Red
        if (-not $process.HasExited) {
            $process.Kill()
        }
        return $false
    }
}

# ========================================
# CÁCH 1: Kill process cũ và dùng port 6543
# ========================================
Write-Host "[*] Method 1: Kill existing process and use port $PREFERRED_PORT" -ForegroundColor Cyan
$portInUse = Get-NetTCPConnection -LocalPort $PREFERRED_PORT -ErrorAction SilentlyContinue
if ($portInUse) {
    Stop-PortProcess -Port $PREFERRED_PORT
    Start-Sleep -Seconds 1
}

$result1 = Start-TunnelAndTest -Port $PREFERRED_PORT -Method "Kill existing and use preferred port"
if ($result1) {
    Write-Host "[SUCCESS] Using Method 1" -ForegroundColor Green
    return $result1
}

# ========================================
# CÁCH 2: Dùng port PostgreSQL mặc định (5432)
# ========================================
Write-Host ""
Write-Host "[*] Method 2: Try PostgreSQL default port 5432" -ForegroundColor Cyan
$result2 = Start-TunnelAndTest -Port 5432 -Method "PostgreSQL default port"
if ($result2) {
    Write-Host "[SUCCESS] Using Method 2" -ForegroundColor Green
    return $result2
}

# ========================================
# CÁCH 3: Tìm port trống trong danh sách alternative
# ========================================
Write-Host ""
Write-Host "[*] Method 3: Find available port from alternatives" -ForegroundColor Cyan
foreach ($port in $ALTERNATIVE_PORTS) {
    if (Test-PortAvailable -Port $port) {
        $result3 = Start-TunnelAndTest -Port $port -Method "Alternative port $port"
        if ($result3) {
            Write-Host "[SUCCESS] Using Method 3 (port $port)" -ForegroundColor Green
            return $result3
        }
    }
}

# ========================================
# CÁCH 4: Kill tất cả cloudflared và thử lại từ đầu
# ========================================
Write-Host ""
Write-Host "[*] Method 4: Kill all cloudflared processes and retry" -ForegroundColor Cyan
$cloudflaredProcesses = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($cloudflaredProcesses) {
    Write-Host "  [*] Found $($cloudflaredProcesses.Count) cloudflared process(es)" -ForegroundColor Yellow
    $cloudflaredProcesses | ForEach-Object {
        Write-Host "  [*] Stopping process $($_.Id)..." -ForegroundColor Cyan
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 3
}

# Thử lại với port 6543
if (Test-PortAvailable -Port $PREFERRED_PORT) {
    $result4 = Start-TunnelAndTest -Port $PREFERRED_PORT -Method "Kill all and retry preferred port"
    if ($result4) {
        Write-Host "[SUCCESS] Using Method 4" -ForegroundColor Green
        return $result4
    }
}

# Thử lại với port 5432
if (Test-PortAvailable -Port 5432) {
    $result4b = Start-TunnelAndTest -Port 5432 -Method "Kill all and retry port 5432"
    if ($result4b) {
        Write-Host "[SUCCESS] Using Method 4 (port 5432)" -ForegroundColor Green
        return $result4b
    }
}

# ========================================
# Tất cả đều thất bại
# ========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "All Methods Failed" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
Write-Host "1. Check if cloudflared is installed correctly" -ForegroundColor White
Write-Host "2. Check Windows Firewall settings" -ForegroundColor White
Write-Host "3. Try running PowerShell as Administrator" -ForegroundColor White
Write-Host "4. Check Cloudflare dashboard for tunnel configuration" -ForegroundColor White
Write-Host "5. Verify DNS resolution: nslookup $HOSTNAME" -ForegroundColor White
Write-Host ""

exit 1

