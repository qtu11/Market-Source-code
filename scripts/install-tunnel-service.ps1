# Script cài đặt tunnel tự động chạy khi khởi động Windows
# Tạo scheduled task để tự động khởi động tunnel

param(
    [switch]$Uninstall = $false
)

$ScriptPath = Join-Path $PSScriptRoot "ensure-postgresql-tunnel.ps1"
$TaskName = "PostgreSQL-Cloudflare-Tunnel"

Write-Host "========================================" -ForegroundColor Green
Write-Host "PostgreSQL Tunnel Service Installer" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

if ($Uninstall) {
    Write-Host "[*] Uninstalling scheduled task..." -ForegroundColor Cyan
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
        Write-Host "[OK] Scheduled task removed" -ForegroundColor Green
    } catch {
        Write-Host "[WARNING] Task not found or already removed" -ForegroundColor Yellow
    }
    exit 0
}

# Kiểm tra quyền admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator" -ForegroundColor Yellow
    exit 1
}

# Kiểm tra script tồn tại
if (-not (Test-Path $ScriptPath)) {
    Write-Host "[ERROR] Script not found: $ScriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "[*] Installing scheduled task..." -ForegroundColor Cyan

# Xóa task cũ nếu có
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "  [*] Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
}

# Tạo action
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""

# Tạo trigger: Khi đăng nhập
$trigger = New-ScheduledTaskTrigger -AtLogOn

# Tạo trigger: Khi khởi động (delay 30 giây)
$trigger2 = New-ScheduledTaskTrigger -AtStartup
$trigger2.Delay = "PT30S"

# Cài đặt task
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

try {
    Register-ScheduledTask -TaskName $TaskName `
        -Action $action `
        -Trigger @($trigger, $trigger2) `
        -Principal $principal `
        -Settings $settings `
        -Description "Auto-start PostgreSQL Cloudflare Tunnel" | Out-Null
    
    Write-Host "[OK] Scheduled task installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task will run:" -ForegroundColor Cyan
    Write-Host "  - At user logon" -ForegroundColor White
    Write-Host "  - At system startup (30s delay)" -ForegroundColor White
    Write-Host ""
    Write-Host "To uninstall: .\scripts\install-tunnel-service.ps1 -Uninstall" -ForegroundColor Yellow
    Write-Host ""
    
    # Chạy ngay để test
    Write-Host "[*] Running tunnel now to test..." -ForegroundColor Cyan
    & powershell.exe -ExecutionPolicy Bypass -File $ScriptPath
    
} catch {
    Write-Host "[ERROR] Failed to install task: $_" -ForegroundColor Red
    exit 1
}

