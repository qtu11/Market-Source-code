# Script verify Supabase tables
# Usage: .\scripts\verify-supabase-tables.ps1

$ErrorActionPreference = "Stop"

Write-Host "Verifying Supabase Tables" -ForegroundColor Green
Write-Host ""

# Read password from .env.local if exists
$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "DB_PASSWORD=(.+)") {
        $DbPassword = $matches[1].Trim()
    } elseif ($envContent -match "DATABASE_URL=postgresql://postgres:(.+?)@") {
        $DbPassword = $matches[1].Trim()
    } else {
        Write-Host "Could not find password in .env.local" -ForegroundColor Yellow
        $DbPassword = Read-Host "Enter Supabase DB Password" -AsSecureString
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPassword)
        $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    }
} else {
    Write-Host ".env.local not found. Please enter password:" -ForegroundColor Yellow
    $DbPasswordSecure = Read-Host "Enter Supabase DB Password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPasswordSecure)
    $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
}

$SupabaseHost = "db.qrozeqsmqvkqxqenhike.supabase.co"
$SupabasePort = "5432"
$SupabaseUser = "postgres"
$SupabaseDb = "postgres"
$connectionString = "postgresql://${SupabaseUser}:${DbPassword}@${SupabaseHost}:${SupabasePort}/${SupabaseDb}"

$env:PGPASSWORD = $DbPassword

Write-Host "[*] Checking tables..." -ForegroundColor Cyan
Write-Host ""

# List all tables
Write-Host "All tables in database:" -ForegroundColor Cyan
$allTables = & psql $connectionString -t -A -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>&1
$allTables -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
    Write-Host "  - $($_.Trim())" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[*] Checking required tables..." -ForegroundColor Cyan
Write-Host ""

$requiredTables = @("users", "products", "deposits", "withdrawals", "purchases", "reviews", "chats", "notifications")
$allTablesList = ($allTables -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim() }) -join "|"

foreach ($table in $requiredTables) {
    if ($allTablesList -match "\b$table\b") {
        Write-Host "  Table '$table' exists" -ForegroundColor Green
    } else {
        Write-Host "  Table '$table' NOT FOUND" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Verification complete!" -ForegroundColor Green

