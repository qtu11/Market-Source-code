# Script kiem tra loi tien an sau khi fix
# Usage: .\scripts\check-hidden-errors.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KIEM TRA LOI TIEN AN SAU KHI FIX" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$issues = @()
$warnings = @()

# 1. Kiem tra missing error handling trong async functions
Write-Host "[1/10] Kiem tra missing error handling..." -ForegroundColor Cyan
$asyncFunctions = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "const\s+\w+\s*=\s*(async|await)\s*\(|async\s+\(.*\)\s*=>" -ErrorAction SilentlyContinue
$asyncWithoutTryCatch = 0
if ($asyncFunctions) {
    Write-Host "  [INFO] Tim thay $($asyncFunctions.Count) async functions" -ForegroundColor Cyan
    Write-Host "  (Can kiem tra thu cong xem co try-catch)" -ForegroundColor Gray
}
Write-Host ""

# 2. Kiem tra memory leaks (useEffect khong cleanup)
Write-Host "[2/10] Kiem tra memory leaks (useEffect cleanup)..." -ForegroundColor Cyan
$useEffects = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "useEffect\s*\(" -ErrorAction SilentlyContinue
$useEffectsWithCleanup = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "useEffect\s*\([^\)]*\)\s*=>[^}]*return\s*\(\)\s*=>" -ErrorAction SilentlyContinue
if ($useEffects) {
    $cleanupCount = if ($useEffectsWithCleanup) { ($useEffectsWithCleanup | Measure-Object).Count } else { 0 }
    $totalCount = ($useEffects | Measure-Object).Count
    $missingCleanup = $totalCount - $cleanupCount
    if ($missingCleanup -gt 0) {
        Write-Host "  [WARNING] Co the co $missingCleanup useEffect chua co cleanup" -ForegroundColor Yellow
        Write-Host "  (useEffect voi subscription/listeners can cleanup)" -ForegroundColor Gray
        $warnings += "useEffect cleanup: $missingCleanup"
    } else {
        Write-Host "  [OK] Khong phat hien vấn đề" -ForegroundColor Green
    }
}
Write-Host ""

# 3. Kiem tra localStorage/sessionStorage khong co error handling
Write-Host "[3/10] Kiem tra localStorage/sessionStorage..." -ForegroundColor Cyan
$storageUsage = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "(localStorage|sessionStorage)\.(getItem|setItem|removeItem)" -ErrorAction SilentlyContinue
$storageCount = if ($storageUsage) { ($storageUsage | Measure-Object).Count } else { 0 }
if ($storageCount -gt 0) {
    Write-Host "  [INFO] Tim thay $storageCount su dung localStorage/sessionStorage" -ForegroundColor Cyan
    $storageInTryCatch = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "try\s*\{[^}]*localStorage|try\s*\{[^}]*sessionStorage" -ErrorAction SilentlyContinue
    $protectedCount = if ($storageInTryCatch) { ($storageInTryCatch | Measure-Object).Count } else { 0 }
    if ($storageCount - $protectedCount -gt 10) {
        Write-Host "  [WARNING] Co the co $($storageCount - $protectedCount) su dung localStorage khong co try-catch" -ForegroundColor Yellow
        Write-Host "  (localStorage co the throw error trong private browsing)" -ForegroundColor Gray
        $warnings += "localStorage: $($storageCount - $protectedCount)"
    }
} else {
    Write-Host "  [OK] Khong su dung localStorage/sessionStorage" -ForegroundColor Green
}
Write-Host ""

# 4. Kiem tra missing keys trong .map()
Write-Host "[4/10] Kiem tra missing keys trong .map()..." -ForegroundColor Cyan
$mapUsage = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "\.map\s*\([^)]*\)\s*=>" -ErrorAction SilentlyContinue
$mapCount = if ($mapUsage) { ($mapUsage | Measure-Object).Count } else { 0 }
if ($mapCount -gt 0) {
    $mapsWithKey = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "key=\{" -ErrorAction SilentlyContinue
    $keyCount = if ($mapsWithKey) { ($mapsWithKey | Measure-Object).Count } else { 0 }
    $missingKeys = $mapCount - $keyCount
    if ($missingKeys -gt 0) {
        Write-Host "  [WARNING] Co the co $missingKeys .map() chua co key prop" -ForegroundColor Yellow
        Write-Host "  (Can kiem tra thu cong)" -ForegroundColor Gray
        $warnings += "missing keys: $missingKeys"
    } else {
        Write-Host "  [OK] Tat ca .map() deu co key" -ForegroundColor Green
    }
}
Write-Host ""

# 5. Kiem tra fetch khong co timeout
Write-Host "[5/10] Kiem tra fetch khong co timeout..." -ForegroundColor Cyan
$fetchUsage = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "fetch\s*\(" -ErrorAction SilentlyContinue
$fetchCount = if ($fetchUsage) { ($fetchUsage | Measure-Object).Count } else { 0 }
if ($fetchCount -gt 0) {
    Write-Host "  [INFO] Tim thay $fetchCount su dung fetch()" -ForegroundColor Cyan
    Write-Host "  [WARNING] Fetch khong co timeout mac dinh" -ForegroundColor Yellow
    Write-Host "  (Can them AbortController hoac timeout wrapper)" -ForegroundColor Gray
    $warnings += "fetch timeout: $fetchCount"
} else {
    Write-Host "  [OK] Khong su dung fetch truc tiep" -ForegroundColor Green
}
Write-Host ""

# 6. Kiem tra race conditions (state updates sau unmount)
Write-Host "[6/10] Kiem tra race conditions..." -ForegroundColor Cyan
$setStateAfterAsync = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "await\s+.*;\s*set[A-Z]" -ErrorAction SilentlyContinue
if ($setStateAfterAsync) {
    Write-Host "  [WARNING] Co the co race conditions" -ForegroundColor Yellow
    Write-Host "  (setState sau async operations co the chay sau khi component unmount)" -ForegroundColor Gray
    Write-Host "  (Can dung useRef hoac cleanup trong useEffect)" -ForegroundColor Gray
    $warnings += "race conditions: potential"
} else {
    Write-Host "  [OK] Khong phat hien vấn đề ro rang" -ForegroundColor Green
}
Write-Host ""

# 7. Kiem tra XSS vulnerabilities (innerHTML, dangerouslySetInnerHTML)
Write-Host "[7/10] Kiem tra XSS vulnerabilities..." -ForegroundColor Cyan
$dangerousHTML = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "(innerHTML|dangerouslySetInnerHTML)" -ErrorAction SilentlyContinue
if ($dangerousHTML) {
    $dangerCount = ($dangerousHTML | Measure-Object).Count
    Write-Host "  [ERROR] Tim thay $dangerCount su dung innerHTML/dangerouslySetInnerHTML" -ForegroundColor Red
    Write-Host "  (Co nguy co XSS neu khong sanitize)" -ForegroundColor Red
    $issues += "XSS risk: $dangerCount"
} else {
    Write-Host "  [OK] Khong su dung innerHTML/dangerouslySetInnerHTML" -ForegroundColor Green
}
Write-Host ""

# 8. Kiem tra hardcoded secrets/API keys
Write-Host "[8/10] Kiem tra hardcoded secrets..." -ForegroundColor Cyan
$secrets = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "(api[_-]?key|secret|password|token)\s*=\s*['\`"][^'\`"]+['\`"]" -ErrorAction SilentlyContinue -CaseSensitive:$false
if ($secrets) {
    $secretCount = ($secrets | Measure-Object).Count
    Write-Host "  [ERROR] Tim thay $secretCount hardcoded secrets/keys" -ForegroundColor Red
    Write-Host "  (Can chuyen sang env variables)" -ForegroundColor Red
    $issues += "hardcoded secrets: $secretCount"
} else {
    Write-Host "  [OK] Khong tim thay hardcoded secrets" -ForegroundColor Green
}
Write-Host ""

# 9. Kiem tra missing null/undefined checks
Write-Host "[9/10] Kiem tra missing null checks..." -ForegroundColor Cyan
$optionalChaining = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "\?\." -ErrorAction SilentlyContinue
$nullishCoalescing = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "\?\?" -ErrorAction SilentlyContinue
$optionalCount = if ($optionalChaining) { ($optionalChaining | Measure-Object).Count } else { 0 }
$nullishCount = if ($nullishCoalescing) { ($nullishCoalescing | Measure-Object).Count } else { 0 }
Write-Host "  [INFO] Su dung optional chaining ($optionalCount) va nullish coalescing ($nullishCount)" -ForegroundColor Cyan
Write-Host "  (Tot - dang dung null safety features)" -ForegroundColor Green
Write-Host ""

# 10. Kiem tra console.log/error con sot lai
Write-Host "[10/10] Kiem tra console.log/error con sot lai..." -ForegroundColor Cyan
$consoleLogs = Select-String -Path "app\**\*.tsx", "components\**\*.tsx" -Pattern "console\.(log|error|warn|debug)" -ErrorAction SilentlyContinue
$consoleCount = if ($consoleLogs) { ($consoleLogs | Measure-Object).Count } else { 0 }
if ($consoleCount -gt 0) {
    Write-Host "  [WARNING] Con $consoleCount console.log/error/warn" -ForegroundColor Yellow
    Write-Host "  (Can thay bang logger service)" -ForegroundColor Gray
    $warnings += "console.log: $consoleCount"
} else {
    Write-Host "  [OK] Khong co console.log nao" -ForegroundColor Green
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TOM TAT" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "  [OK] Khong phat hien loi tien an nao!" -ForegroundColor Green
} else {
    if ($issues.Count -gt 0) {
        Write-Host "  [ERROR] Phat hien $($issues.Count) loi nghiem trong:" -ForegroundColor Red
        $issues | ForEach-Object {
            Write-Host "    - $_" -ForegroundColor Red
        }
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "  [WARNING] Phat hien $($warnings.Count) canh bao:" -ForegroundColor Yellow
        $warnings | ForEach-Object {
            Write-Host "    - $_" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Luu y:" -ForegroundColor Gray
Write-Host "  - XSS: Can sanitize user input truoc khi render HTML" -ForegroundColor Gray
Write-Host "  - Hardcoded secrets: Di chuyen sang env variables" -ForegroundColor Gray
Write-Host "  - Fetch timeout: Them AbortController hoac timeout wrapper" -ForegroundColor Gray
Write-Host "  - Race conditions: Dung useRef hoac cleanup trong useEffect" -ForegroundColor Gray
Write-Host "  - Memory leaks: Cleanup subscriptions/listeners trong useEffect" -ForegroundColor Gray
Write-Host ""

