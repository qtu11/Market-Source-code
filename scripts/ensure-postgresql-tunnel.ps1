# Script đảm bảo PostgreSQL Tunnel luôn hoạt động
# Tự động khởi động, kiểm tra và giữ tunnel chạy ổn định

param(
    [int]$Port = 6543,
    [string]$Hostname = "qtusdev-psql.qtusdev.website",
    [string]$Database = "qtusdevmarket",
    [string]$User = "qtusdev",
    [switch]$RunAsService = $false
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Green
Write-Host "PostgreSQL Tunnel Manager" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Function: Kiểm tra tunnel đang chạy
function Test-TunnelRunning {
    param([int]$Port)
    
    $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($listening) {
        $processId = $listening.OwningProcess | Select-Object -First 1
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process -and $process.ProcessName -eq "cloudflared") {
            return @{
                Running = $true
                ProcessId = $processId
                Process = $process
            }
        }
    }
    return @{ Running = $false }
}

# Function: Khởi động tunnel
function Start-Tunnel {
    param([int]$Port, [string]$Hostname)
    
    Write-Host "[*] Starting tunnel..." -ForegroundColor Cyan
    
    # Kill process cũ nếu có
    $oldProcesses = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
    if ($oldProcesses) {
        Write-Host "  [*] Stopping old cloudflared processes..." -ForegroundColor Yellow
        $oldProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    
    # Kiểm tra port có trống không
    $portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($portInUse) {
        $processId = $portInUse.OwningProcess | Select-Object -First 1
        Write-Host "  [*] Port $Port is in use by process $processId, stopping..." -ForegroundColor Yellow
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    
    # Khởi động cloudflared
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "cloudflared"
    $processInfo.Arguments = "access tcp --hostname $Hostname --url localhost:$Port"
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.CreateNoWindow = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    
    try {
        $process.Start() | Out-Null
        Write-Host "  [OK] Process started (PID: $($process.Id))" -ForegroundColor Green
        
        # Đợi tunnel khởi động
        Start-Sleep -Seconds 5
        
        # Kiểm tra process còn chạy không
        if ($process.HasExited) {
            $errorOutput = $process.StandardError.ReadToEnd()
            Write-Host "[ERROR] Tunnel process exited!" -ForegroundColor Red
            if ($errorOutput) {
                Write-Host $errorOutput -ForegroundColor Red
            }
            return $null
        }
        
        # Kiểm tra port có listen không
        Start-Sleep -Seconds 2
        $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        
        if ($listening) {
            Write-Host "  [OK] Tunnel is listening on port $Port" -ForegroundColor Green
            return $process
        } else {
            Write-Host "[WARNING] Tunnel started but port not listening yet..." -ForegroundColor Yellow
            Write-Host "  Waiting a bit more..." -ForegroundColor Gray
            Start-Sleep -Seconds 3
            
            $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
            if ($listening) {
                Write-Host "  [OK] Tunnel is now listening!" -ForegroundColor Green
                return $process
            } else {
                Write-Host "[ERROR] Port still not listening" -ForegroundColor Red
                $process.Kill()
                return $null
            }
        }
    } catch {
        Write-Host "[ERROR] Failed to start tunnel: $_" -ForegroundColor Red
        return $null
    }
}

# Function: Test PostgreSQL connection
function Test-PostgreSQLConnection {
    param([int]$Port, [string]$Database, [string]$User)
    
    Write-Host "[*] Testing PostgreSQL connection..." -ForegroundColor Cyan
    
    # Kiểm tra psql có sẵn không
    if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
        Write-Host "  [WARNING] psql not found, skipping connection test" -ForegroundColor Yellow
        Write-Host "  [INFO] Install PostgreSQL client to test connection" -ForegroundColor Gray
        return $true  # Không có psql nhưng vẫn coi là OK
    }
    
    # Test connection với timeout
    try {
        $env:PGPASSWORD = "your_password_here"  # User cần set password
        $result = & psql -h localhost -p $Port -U $User -d $Database -c "SELECT version();" -t 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] PostgreSQL connection successful!" -ForegroundColor Green
            Write-Host "  [INFO] PostgreSQL version: $($result.Trim())" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "  [WARNING] Connection test failed (might need password)" -ForegroundColor Yellow
            Write-Host "  [INFO] Run manually: psql -h localhost -p $Port -U $User -d $Database" -ForegroundColor Gray
            return $false
        }
    } catch {
        Write-Host "  [WARNING] Connection test error: $_" -ForegroundColor Yellow
        return $false
    }
}

# Function: Test TCP connection
function Test-TCPConnection {
    param([int]$Port)
    
    try {
        $result = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        return $result.TcpTestSucceeded
    } catch {
        return $false
    }
}

# ========================================
# MAIN LOGIC
# ========================================

# 1. Kiểm tra cloudflared
Write-Host "[*] Checking cloudflared..." -ForegroundColor Cyan
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] cloudflared not found!" -ForegroundColor Red
    Write-Host "Please install from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation#windows" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] cloudflared found" -ForegroundColor Green

# 2. Kiểm tra tunnel hiện tại
Write-Host ""
Write-Host "[*] Checking tunnel status..." -ForegroundColor Cyan
$tunnelStatus = Test-TunnelRunning -Port $Port

if ($tunnelStatus.Running) {
    Write-Host "[OK] Tunnel is already running" -ForegroundColor Green
    Write-Host "  Process ID: $($tunnelStatus.ProcessId)" -ForegroundColor Gray
    Write-Host "  Started: $($tunnelStatus.Process.StartTime)" -ForegroundColor Gray
    
    # Test connection
    Write-Host ""
    if (Test-TCPConnection -Port $Port) {
        Write-Host "[OK] TCP connection test passed" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] TCP connection test failed" -ForegroundColor Yellow
        Write-Host "  Restarting tunnel..." -ForegroundColor Cyan
        Stop-Process -Id $tunnelStatus.ProcessId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        $process = Start-Tunnel -Port $Port -Hostname $Hostname
        if (-not $process) {
            Write-Host "[ERROR] Failed to restart tunnel" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "[INFO] Tunnel is not running, starting..." -ForegroundColor Yellow
    $process = Start-Tunnel -Port $Port -Hostname $Hostname
    
    if (-not $process) {
        Write-Host "[ERROR] Failed to start tunnel" -ForegroundColor Red
        exit 1
    }
}

# 3. Test connections
Write-Host ""
Write-Host "[*] Running connection tests..." -ForegroundColor Cyan

# Test TCP
if (Test-TCPConnection -Port $Port) {
    Write-Host "[OK] TCP connection: OK" -ForegroundColor Green
} else {
    Write-Host "[WARNING] TCP connection: Failed" -ForegroundColor Yellow
}

# Test PostgreSQL (nếu có psql)
Test-PostgreSQLConnection -Port $Port -Database $Database -User $User | Out-Null

# 4. Thông tin kết nối
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "PostgreSQL Tunnel Ready" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Connection Info:" -ForegroundColor Cyan
Write-Host "  Hostname: $Hostname" -ForegroundColor White
Write-Host "  Local Host: localhost" -ForegroundColor White
Write-Host "  Port: $Port" -ForegroundColor White
Write-Host "  Database: $Database" -ForegroundColor White
Write-Host "  User: $User" -ForegroundColor White
Write-Host ""
Write-Host "Connection String:" -ForegroundColor Cyan
Write-Host "  psql -h localhost -p $Port -U $User -d $Database" -ForegroundColor White
Write-Host ""
Write-Host "  Or in code:" -ForegroundColor Cyan
Write-Host "  postgresql://$User@localhost:$Port/$Database" -ForegroundColor White
Write-Host ""

# 5. Lưu thông tin process
$processId = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
if ($processId) {
    Write-Host "Process ID: $processId" -ForegroundColor Gray
    Write-Host "To stop: Stop-Process -Id $processId -Force" -ForegroundColor Yellow
    Write-Host ""
    
    # Lưu vào file để dễ quản lý
    $infoFile = Join-Path $PSScriptRoot "tunnel-info.json"
    @{
        ProcessId = $processId
        Port = $Port
        Hostname = $Hostname
        Database = $Database
        User = $User
        StartedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json | Out-File -FilePath $infoFile -Encoding UTF8
    
    Write-Host "[INFO] Tunnel info saved to: $infoFile" -ForegroundColor Gray
}

Write-Host "[SUCCESS] PostgreSQL tunnel is ready to use!" -ForegroundColor Green
Write-Host ""

