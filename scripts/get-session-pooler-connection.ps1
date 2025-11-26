# Hướng dẫn lấy Session Pooler connection string từ Supabase Dashboard
# Usage: .\scripts\get-session-pooler-connection.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HUONG DAN LAY SESSION POOLER" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[BUOC 1] Mo Supabase Dashboard" -ForegroundColor Yellow
Write-Host "  URL: https://supabase.com/dashboard/project/qrozeqsmqvkqxqenhike" -ForegroundColor Cyan
Write-Host ""

Write-Host "[BUOC 2] Vao Connection Settings" -ForegroundColor Yellow
Write-Host "  1. Click nut 'Connect' hoac 'Project Settings'" -ForegroundColor Gray
Write-Host "  2. Chon tab 'Connection String'" -ForegroundColor Gray
Write-Host ""

Write-Host "[BUOC 3] Chuyen sang Session Pooler" -ForegroundColor Yellow
Write-Host "  1. Trong dropdown 'Method', chon 'Session Pooler'" -ForegroundColor Gray
Write-Host "     (Thay vi 'Direct connection')" -ForegroundColor Gray
Write-Host "  2. Connection string se thay doi:" -ForegroundColor Gray
Write-Host "     - Port: 5432 -> 6543" -ForegroundColor Green
Write-Host "     - Co them ?pgbouncer=true" -ForegroundColor Green
Write-Host ""

Write-Host "[BUOC 4] Copy Connection String" -ForegroundColor Yellow
Write-Host "  Format se la:" -ForegroundColor Gray
Write-Host "  postgresql://postgres:[YOUR_PASSWORD]@db.qrozeqsmqvkqxqenhike.supabase.co:6543/postgres?pgbouncer=true" -ForegroundColor Cyan
Write-Host ""

Write-Host "[BUOC 5] Update .env.local" -ForegroundColor Yellow
Write-Host "  Option 1: Chay script auto-fix" -ForegroundColor Cyan
Write-Host "    .\scripts\fix-ipv4-pooler.ps1" -ForegroundColor White
Write-Host ""
Write-Host "  Option 2: Update thủ công" -ForegroundColor Cyan
Write-Host "    1. Mo file .env.local" -ForegroundColor Gray
Write-Host "    2. Tim dong DATABASE_URL" -ForegroundColor Gray
Write-Host "    3. Thay the bang connection string vua copy" -ForegroundColor Gray
Write-Host "    4. Luu file" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LUU Y" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ✅ Session Pooler (port 6543) ho tro IPv4" -ForegroundColor Green
Write-Host "  ✅ Code da tu dong fallback sang port 6543" -ForegroundColor Green
Write-Host "  ✅ Chi can update .env.local la xong" -ForegroundColor Green
Write-Host ""
Write-Host "  Neu da co port 6543 trong .env.local:" -ForegroundColor Cyan
Write-Host "    -> Khong can lam gi them!" -ForegroundColor Green
Write-Host ""

