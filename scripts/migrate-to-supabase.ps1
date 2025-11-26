# Script migrate PostgreSQL schema sang Supabase
# Usage: .\scripts\migrate-to-supabase.ps1 -DbPasswordSecure (SecureString)

param(
    [Parameter(Mandatory=$true)]
    [SecureString]$DbPasswordSecure
)

# Convert SecureString to plain text (for psql)
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPasswordSecure)
$DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Migrating schema to Supabase..." -ForegroundColor Green

# Supabase connection info
$SupabaseHost = "db.qrozeqsmqvkqxqenhike.supabase.co"
$SupabasePort = "5432"
$SupabaseUser = "postgres"
$SupabaseDb = "postgres"

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ psql not found. Please install PostgreSQL client." -ForegroundColor Red
    Write-Host "   Download: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Set password environment variable
$env:PGPASSWORD = $DbPassword

# Connection string
$connectionString = "postgresql://${SupabaseUser}:${DbPassword}@${SupabaseHost}:${SupabasePort}/${SupabaseDb}"

Write-Host "[*] Testing connection to Supabase..." -ForegroundColor Cyan
try {
    $testResult = & psql $connectionString -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Connection successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Connection failed: $testResult" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}

# Schema file path
$schemaFile = Join-Path $PSScriptRoot "..\create-tables.sql"

if (-not (Test-Path $schemaFile)) {
    Write-Host "❌ Schema file not found: $schemaFile" -ForegroundColor Red
    exit 1
}

Write-Host "[*] Running schema migration..." -ForegroundColor Cyan
Write-Host "    File: $schemaFile" -ForegroundColor Gray

try {
    # Run schema file
    & psql $connectionString -f $schemaFile 2>&1 | ForEach-Object {
        if ($_ -match "ERROR|error") {
            Write-Host "⚠️  $_" -ForegroundColor Yellow
        } else {
            Write-Host "   $_" -ForegroundColor Gray
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Schema migration completed!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Migration completed with warnings (some tables may already exist)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Migration error: $_" -ForegroundColor Red
    exit 1
}

# Verify tables
Write-Host "[*] Verifying tables..." -ForegroundColor Cyan
$tables = @("users", "products", "deposits", "withdrawals", "purchases", "reviews", "chats", "notifications")
foreach ($table in $tables) {
    $result = & psql $connectionString -t -A -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';" 2>&1
    $count = ($result -split "`n" | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1).Trim()
    if ($count -eq "1") {
        Write-Host "   Table '$table' exists" -ForegroundColor Green
    } else {
        Write-Host "   Table '$table' not found (count: $count)" -ForegroundColor Yellow
        # Try to check if table exists with different query
        $checkResult = & psql $connectionString -t -A -c "\dt $table" 2>&1
        if ($checkResult -match $table) {
            Write-Host "   (But table '$table' seems to exist in database)" -ForegroundColor Gray
        }
    }
}

Write-Host "`n✅ Migration complete!" -ForegroundColor Green
Write-Host "   Connection: $connectionString" -ForegroundColor Gray