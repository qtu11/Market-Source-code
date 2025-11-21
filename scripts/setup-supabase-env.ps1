# Script setup Supabase environment va test connection
# Usage: .\scripts\setup-supabase-env.ps1

$ErrorActionPreference = "Stop"

Write-Host "Supabase Environment Setup" -ForegroundColor Green
Write-Host ""

# Supabase connection info
$SupabaseHost = "db.qrozeqsmqvkqxqenhike.supabase.co"
$SupabasePort = "5432"
$SupabaseUser = "postgres"
$SupabaseDb = "postgres"
$SupabaseUrl = "https://qrozeqsmqvkqxqenhike.supabase.co"
$SupabaseAnonKey = "sb_publishable_V1EwyaylbTgQ8yGo0IpY7w_NRy6fzX9"
$SupabaseServiceKey = "sb_secret_mFGSgU42XIFf5jcouj1T0A_6i188-XS"

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "psql not found. Please install PostgreSQL client." -ForegroundColor Red
    Write-Host "Download: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can still create .env.local file, but cannot test connection." -ForegroundColor Yellow
    $skipTest = $true
} else {
    $skipTest = $false
}

# Prompt for database password
Write-Host "[*] Enter Supabase Database Password:" -ForegroundColor Cyan
Write-Host "    (Get from: Supabase Dashboard -> Settings -> Database -> Connection string)" -ForegroundColor Gray
Write-Host "    (If not available, click 'Reset database password' to create new one)" -ForegroundColor Gray
Write-Host ""
$DbPasswordSecure = Read-Host "Password" -AsSecureString

# Convert SecureString to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPasswordSecure)
$DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

# Test connection
if (-not $skipTest) {
    Write-Host ""
    Write-Host "[*] Testing connection to Supabase..." -ForegroundColor Cyan
    $env:PGPASSWORD = $DbPassword
    $connectionString = "postgresql://${SupabaseUser}:${DbPassword}@${SupabaseHost}:${SupabasePort}/${SupabaseDb}"
    
    try {
        $testResult = & psql $connectionString -c "SELECT version();" 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Connection successful!" -ForegroundColor Green
            Write-Host ""
        } else {
            Write-Host "Connection failed!" -ForegroundColor Red
            Write-Host "Error: $testResult" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Password is incorrect. Please:" -ForegroundColor Yellow
            Write-Host "   1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/qrozeqsmqvkqxqenhike/settings/database" -ForegroundColor Cyan
            Write-Host "   2. Find 'Connection string' or 'Database password'" -ForegroundColor Cyan
            Write-Host "   3. Click 'Reset database password' if not available" -ForegroundColor Cyan
            Write-Host "   4. Copy new password and run this script again" -ForegroundColor Cyan
            Write-Host ""
            exit 1
        }
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
}

# Create .env.local file
Write-Host "[*] Creating .env.local file..." -ForegroundColor Cyan

# Build connection string separately to avoid parsing issues
$dbConnectionString = "postgresql://postgres:${DbPassword}@${SupabaseHost}:${SupabasePort}/${SupabaseDb}"

$envContent = @"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SupabaseAnonKey

# Supabase Database Connection (PostgreSQL)
DATABASE_URL=$dbConnectionString

# Fallback individual variables (if DATABASE_URL does not work)
DB_HOST=$SupabaseHost
DB_PORT=$SupabasePort
DB_USER=$SupabaseUser
DB_PASSWORD=$DbPassword
DB_NAME=$SupabaseDb

# Supabase Service Role Key (from Settings -> API -> service_role key)
SUPABASE_SERVICE_ROLE_KEY=$SupabaseServiceKey

# Optional: Skip DB check during build
SKIP_DB_CHECK=true
"@

$envFile = Join-Path $PSScriptRoot "..\.env.local"
$envContent | Out-File -FilePath $envFile -Encoding UTF8 -NoNewline

Write-Host "File .env.local created successfully!" -ForegroundColor Green
Write-Host "Location: $envFile" -ForegroundColor Gray
Write-Host ""

# Ask if user wants to run migration
if (-not $skipTest) {
    Write-Host "[*] Do you want to run schema migration now? (Y/N)" -ForegroundColor Cyan
    $runMigration = Read-Host
    if ($runMigration -eq "Y" -or $runMigration -eq "y") {
        Write-Host ""
        Write-Host "[*] Running schema migration..." -ForegroundColor Cyan
        $migrateScript = Join-Path $PSScriptRoot "migrate-to-supabase.ps1"
        if (Test-Path $migrateScript) {
            $DbPasswordSecure = ConvertTo-SecureString $DbPassword -AsPlainText -Force
            & $migrateScript -DbPasswordSecure $DbPasswordSecure
        } else {
            Write-Host "Migration script not found: $migrateScript" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "File .env.local has been created with Supabase information." -ForegroundColor Gray
Write-Host "You can run: npm run dev to test the application." -ForegroundColor Gray
