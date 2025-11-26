# Test IPv6 connection đến Supabase
# Usage: .\scripts\test-ipv6-connection.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST IPv6 CONNECTION TO SUPABASE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$hostname = "db.qrozeqsmqvkqxqenhike.supabase.co"

Write-Host "[1/3] DNS Resolution..." -ForegroundColor Cyan
try {
    $dnsResult = [System.Net.Dns]::GetHostAddresses($hostname)
    Write-Host "  [OK] DNS Resolution thành công!" -ForegroundColor Green
    
    $ipv4 = $dnsResult | Where-Object { $_.AddressFamily -eq 'InterNetwork' }
    $ipv6 = $dnsResult | Where-Object { $_.AddressFamily -eq 'InterNetworkV6' }
    
    if ($ipv4) {
        Write-Host "  IPv4 Address: $($ipv4.IPAddressToString)" -ForegroundColor Green
    } else {
        Write-Host "  IPv4 Address: Không có" -ForegroundColor Yellow
    }
    
    if ($ipv6) {
        Write-Host "  IPv6 Address: $($ipv6[0].IPAddressToString)" -ForegroundColor Cyan
    } else {
        Write-Host "  IPv6 Address: Không có" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "  Kết luận:" -ForegroundColor Yellow
    if ($ipv4) {
        Write-Host "    ✅ Có IPv4 - Direct connection (port 5432) sẽ hoạt động" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  Chỉ có IPv6 - Cần Session Pooler (port 6543)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] DNS Resolution thất bại!" -ForegroundColor Red
    Write-Host "  Lỗi: $_" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[2/3] Test Port 5432 (Direct Connection)..." -ForegroundColor Cyan
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connect = $tcpClient.BeginConnect($hostname, 5432, $null, $null)
    $wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)
    
    if ($wait) {
        $tcpClient.EndConnect($connect)
        Write-Host "  [OK] Port 5432 có thể kết nối!" -ForegroundColor Green
        $tcpClient.Close()
    } else {
        Write-Host "  [ERROR] Port 5432 timeout hoặc không thể kết nối" -ForegroundColor Red
        Write-Host "  → Cần dùng Session Pooler (port 6543)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Port 5432 không thể kết nối" -ForegroundColor Red
    Write-Host "  Lỗi: $_" -ForegroundColor Yellow
    Write-Host "  → Cần dùng Session Pooler (port 6543)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/3] Test Port 6543 (Session Pooler)..." -ForegroundColor Cyan
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connect = $tcpClient.BeginConnect($hostname, 6543, $null, $null)
    $wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)
    
    if ($wait) {
        $tcpClient.EndConnect($connect)
        Write-Host "  [OK] Port 6543 (Session Pooler) có thể kết nối!" -ForegroundColor Green
        $tcpClient.Close()
    } else {
        Write-Host "  [ERROR] Port 6543 timeout hoặc không thể kết nối" -ForegroundColor Red
    }
} catch {
    Write-Host "  [ERROR] Port 6543 không thể kết nối" -ForegroundColor Red
    Write-Host "  Lỗi: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KẾT LUẬN" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ✅ Code đã được fix để tự động fallback sang port 6543" -ForegroundColor Green
Write-Host "  ✅ .env.local đã được update với port 6543" -ForegroundColor Green
Write-Host ""
Write-Host "  Nếu port 6543 không kết nối được:" -ForegroundColor Yellow
Write-Host "    1. Kiểm tra Supabase project có đang active không" -ForegroundColor Cyan
Write-Host "    2. Kiểm tra Session Pooler có được enable trong Dashboard không" -ForegroundColor Cyan
Write-Host "    3. Thử restore project nếu bị pause" -ForegroundColor Cyan
Write-Host ""

