# Script tim va fix unhandled promises
# Usage: .\scripts\fix-unhandled-promises.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIX UNHANDLED PROMISES" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[*] Tim cac file co unhandled promises..." -ForegroundColor Cyan
Write-Host ""

$promises = Select-String -Path "app\**\*.tsx", "app\**\*.ts", "components\**\*.tsx" -Pattern "\.then\s*\(" -ErrorAction SilentlyContinue

if ($promises.Count -eq 0) {
    Write-Host "  [OK] Khong tim thay .then()" -ForegroundColor Green
    exit 0
}

Write-Host "  [WARNING] Tim thay $($promises.Count) su dung .then()" -ForegroundColor Yellow
Write-Host ""

$filesToCheck = $promises | Group-Object Filename | ForEach-Object {
    Write-Host "  File: $($_.Name)" -ForegroundColor Cyan
    Write-Host "    So luong: $($_.Count)" -ForegroundColor Gray
    $_.Group | Select-Object -First 3 | ForEach-Object {
        Write-Host "    - Line $($_.LineNumber): $($_.Line.Trim().Substring(0, [Math]::Min(80, $_.Line.Trim().Length)))" -ForegroundColor DarkGray
    }
    if ($_.Count -gt 3) {
        Write-Host "    ... va $($_.Count - 3) dong khac" -ForegroundColor DarkGray
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HUONG DAN FIX" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Dynamic import voi .then():" -ForegroundColor Yellow
Write-Host "   ❌ TRUOC:" -ForegroundColor Red
Write-Host "   const Component = dynamic(() => import('./Component').then(mod => mod.Component))" -ForegroundColor Gray
Write-Host ""
Write-Host "   ✅ SAU:" -ForegroundColor Green
Write-Host "   const Component = dynamic(async () => {" -ForegroundColor Gray
Write-Host "     try {" -ForegroundColor Gray
Write-Host "       const mod = await import('./Component')" -ForegroundColor Gray
Write-Host "       return { default: mod.Component }" -ForegroundColor Gray
Write-Host "     } catch (error) {" -ForegroundColor Gray
Write-Host "       logger.error('Failed to load component', error)" -ForegroundColor Gray
Write-Host "       throw error" -ForegroundColor Gray
Write-Host "     }" -ForegroundColor Gray
Write-Host "   })" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Fetch voi .then():" -ForegroundColor Yellow
Write-Host "   ❌ TRUOC:" -ForegroundColor Red
Write-Host "   fetch('/api/data').then(res => res.json()).then(data => setData(data))" -ForegroundColor Gray
Write-Host ""
Write-Host "   ✅ SAU:" -ForegroundColor Green
Write-Host "   try {" -ForegroundColor Gray
Write-Host "     const res = await fetch('/api/data')" -ForegroundColor Gray
Write-Host "     const data = await res.json()" -ForegroundColor Gray
Write-Host "     setData(data)" -ForegroundColor Gray
Write-Host "   } catch (error) {" -ForegroundColor Gray
Write-Host "     logger.error('Failed to fetch data', error)" -ForegroundColor Gray
Write-Host "   }" -ForegroundColor Gray
Write-Host ""

