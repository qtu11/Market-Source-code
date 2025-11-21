# Script kiem tra loi frontend tien an
# Usage: .\scripts\check-frontend-issues.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KIEM TRA LOI FRONTEND TIEN AN" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$issues = @()

# 1. Kiem tra console.log/error con sot lai
Write-Host "[1/6] Kiem tra console.log/error con sot lai..." -ForegroundColor Cyan
$consoleLogs = Select-String -Path "app\**\*.tsx", "app\**\*.ts", "components\**\*.tsx" -Pattern "console\.(log|error|warn|debug)" -ErrorAction SilentlyContinue
$consoleCount = ($consoleLogs | Measure-Object).Count
if ($consoleCount -gt 0) {
    Write-Host "  [WARNING] Tim thay $consoleCount console.log/error/warn" -ForegroundColor Yellow
    Write-Host "  Chi tiet:" -ForegroundColor Gray
    $consoleLogs | Select-Object -First 10 | ForEach-Object {
        Write-Host "    - $($_.Filename):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor DarkGray
    }
    if ($consoleCount -gt 10) {
        Write-Host "    ... va $($consoleCount - 10) dong khac" -ForegroundColor DarkGray
    }
    $issues += "console.log: $consoleCount"
} else {
    Write-Host "  [OK] Khong co console.log nao" -ForegroundColor Green
}
Write-Host ""

# 2. Kiem tra type 'any' qua nhieu
Write-Host "[2/6] Kiem tra su dung type 'any'..." -ForegroundColor Cyan
$anyUsage = Select-String -Path "app\**\*.tsx", "app\**\*.ts", "components\**\*.tsx" -Pattern ":\s*any\b|:\s*any\[\]|any\s*\||\s+any\s*[=<]" -ErrorAction SilentlyContinue
$anyCount = ($anyUsage | Measure-Object).Count
if ($anyCount -gt 0) {
    Write-Host "  [WARNING] Tim thay $anyCount su dung type 'any'" -ForegroundColor Yellow
    $filesWithAny = $anyUsage | Group-Object Filename | Sort-Object Count -Descending | Select-Object -First 5
    Write-Host "  Top 5 file co nhieu 'any' nhat:" -ForegroundColor Gray
    $filesWithAny | ForEach-Object {
        Write-Host "    - $($_.Name): $($_.Count) lan" -ForegroundColor DarkGray
    }
    $issues += "type any: $anyCount"
} else {
    Write-Host "  [OK] Khong co su dung 'any'" -ForegroundColor Green
}
Write-Host ""

# 3. Kiem tra useEffect khong co dependencies
Write-Host "[3/6] Kiem tra useEffect khong co dependencies..." -ForegroundColor Cyan
$useEffectEmpty = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "useEffect\s*\([^\)]*\)\s*=>[^\)]*\}\s*,\s*\[\s*\]" -ErrorAction SilentlyContinue
$emptyDepCount = ($useEffectEmpty | Measure-Object).Count
if ($emptyDepCount -gt 0) {
    Write-Host "  [INFO] Tim thay $emptyDepCount useEffect voi empty deps []" -ForegroundColor Cyan
    Write-Host "  (Co the dung neu can chay 1 lan khi mount)" -ForegroundColor Gray
} else {
    Write-Host "  [OK] Khong co useEffect voi empty deps (hoac khong tim thay)" -ForegroundColor Green
}
Write-Host ""

# 4. Kiem tra async function khong co try-catch
Write-Host "[4/6] Kiem tra async function khong co error handling..." -ForegroundColor Cyan
$asyncFunctions = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "const\s+\w+\s*=\s*async\s*\(|async\s+\(.*\)\s*=>" -ErrorAction SilentlyContinue
$asyncCount = ($asyncFunctions | Measure-Object).Count
$asyncWithoutCatch = 0
if ($asyncCount -gt 0) {
    Write-Host "  [INFO] Tim thay $asyncCount async functions" -ForegroundColor Cyan
    Write-Host "  (Can kiem tra thu cong xem co try-catch)" -ForegroundColor Gray
} else {
    Write-Host "  [OK] Khong tim thay async functions" -ForegroundColor Green
}
Write-Host ""

# 5. Kiem tra missing keys trong .map()
Write-Host "[5/6] Kiem tra .map() khong co key prop..." -ForegroundColor Cyan
$mapWithoutKey = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "\.map\s*\([^)]*\)\s*=>" -ErrorAction SilentlyContinue
$mapCount = ($mapWithoutKey | Measure-Object).Count
if ($mapCount -gt 0) {
    Write-Host "  [INFO] Tim thay $mapCount su dung .map()" -ForegroundColor Cyan
    Write-Host "  (Can kiem tra thu cong xem co key prop)" -ForegroundColor Gray
} else {
    Write-Host "  [OK] Khong tim thay .map()" -ForegroundColor Green
}
Write-Host ""

# 6. Kiem tra unhandled promises (.then() khong co .catch())
Write-Host "[6/6] Kiem tra unhandled promises..." -ForegroundColor Cyan
$promises = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "\.then\s*\(" -ErrorAction SilentlyContinue
$promiseCount = ($promises | Measure-Object).Count
if ($promiseCount -gt 0) {
    Write-Host "  [WARNING] Tim thay $promiseCount su dung .then()" -ForegroundColor Yellow
    Write-Host "  (Can kiem tra xem co .catch() khong)" -ForegroundColor Gray
    $issues += "promises: $promiseCount"
} else {
    Write-Host "  [OK] Khong tim thay .then()" -ForegroundColor Green
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TOM TAT" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

if ($issues.Count -eq 0) {
    Write-Host "  [OK] Khong phat hien loi tien an nao!" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Phat hien $($issues.Count) van de tien an:" -ForegroundColor Yellow
    $issues | ForEach-Object {
        Write-Host "    - $_" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Luu y:" -ForegroundColor Gray
Write-Host "  - console.log/error: Can xoa hoac thay bang logger service" -ForegroundColor Gray
Write-Host "  - type 'any': Can them type chinh xac" -ForegroundColor Gray
Write-Host "  - Unhandled promises: Can them .catch() hoac dung try-catch" -ForegroundColor Gray
Write-Host ""

