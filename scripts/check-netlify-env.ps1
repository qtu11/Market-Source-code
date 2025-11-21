# Script kiểm tra environment variables trong Netlify
# Usage: .\scripts\check-netlify-env.ps1

$ErrorActionPreference = "Stop"

Write-Host "Checking Netlify Environment Variables" -ForegroundColor Green
Write-Host ""

# Check if Netlify CLI is installed
$netlifyCli = Get-Command netlify -ErrorAction SilentlyContinue
if (-not $netlifyCli) {
    Write-Host "Netlify CLI not found. Please install:" -ForegroundColor Yellow
    Write-Host "  npm install -g netlify-cli" -ForegroundColor Cyan
    exit 1
}

Write-Host "[*] Fetching environment variables from Netlify..." -ForegroundColor Cyan
Write-Host ""

# List all environment variables
$envList = & netlify env:list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to fetch environment variables. Make sure you're logged in:" -ForegroundColor Red
    Write-Host "  netlify login" -ForegroundColor Yellow
    exit 1
}

# Required variables
$requiredVars = @{
    "DATABASE_URL" = "PostgreSQL connection string"
    "DB_HOST" = "Database host"
    "DB_PORT" = "Database port"
    "DB_USER" = "Database user"
    "DB_PASSWORD" = "Database password"
    "DB_NAME" = "Database name"
    "NEXT_PUBLIC_SUPABASE_URL" = "Supabase project URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY" = "Supabase anonymous key"
    "SUPABASE_SERVICE_ROLE_KEY" = "Supabase service role key"
    "SKIP_DB_CHECK" = "Skip DB check during build"
}

Write-Host "Required Environment Variables:" -ForegroundColor Cyan
Write-Host ""

$missingVars = @()
$foundVars = @()

foreach ($varName in $requiredVars.Keys) {
    $description = $requiredVars[$varName]
    
    # Check if variable exists in the list
    if ($envList -match "^\s*$varName\s+") {
        Write-Host "  $varName" -ForegroundColor Green -NoNewline
        Write-Host " = [SET]" -ForegroundColor Gray
        Write-Host "    Description: $description" -ForegroundColor Gray
        $foundVars += $varName
    } else {
        Write-Host "  $varName" -ForegroundColor Red -NoNewline
        Write-Host " = [MISSING]" -ForegroundColor Yellow
        Write-Host "    Description: $description" -ForegroundColor Gray
        $missingVars += $varName
    }
    Write-Host ""
}

Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Found: $($foundVars.Count)/$($requiredVars.Count)" -ForegroundColor $(if ($foundVars.Count -eq $requiredVars.Count) { "Green" } else { "Yellow" })
Write-Host "  Missing: $($missingVars.Count)" -ForegroundColor $(if ($missingVars.Count -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($missingVars.Count -gt 0) {
    Write-Host "Missing variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "To add missing variables:" -ForegroundColor Cyan
    Write-Host "  1. Run: .\scripts\setup-netlify-env.ps1" -ForegroundColor Yellow
    Write-Host "  2. Or add manually in Netlify Dashboard:" -ForegroundColor Yellow
    Write-Host "     https://app.netlify.com/sites/qtusdevmarketplace/configuration/env" -ForegroundColor Cyan
} else {
    Write-Host "All required variables are set!" -ForegroundColor Green
    Write-Host ""
    Write-Host "If database connection still fails:" -ForegroundColor Yellow
    Write-Host "  1. Verify DATABASE_URL format is correct" -ForegroundColor Gray
    Write-Host "  2. Redeploy site: netlify deploy --prod" -ForegroundColor Gray
    Write-Host "  3. Check Supabase project is active" -ForegroundColor Gray
}

Write-Host ""
Write-Host "To view all variables:" -ForegroundColor Cyan
Write-Host "  netlify env:list" -ForegroundColor Yellow

