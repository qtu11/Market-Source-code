# Script setup Netlify environment variables for Supabase
# Usage: .\scripts\setup-netlify-env.ps1

$ErrorActionPreference = "Stop"

Write-Host "Netlify Environment Variables Setup" -ForegroundColor Green
Write-Host ""

# Check if Netlify CLI is installed
$netlifyCli = Get-Command netlify -ErrorAction SilentlyContinue
if (-not $netlifyCli) {
    Write-Host "Netlify CLI not found. Installing..." -ForegroundColor Yellow
    Write-Host "Please install Netlify CLI first:" -ForegroundColor Cyan
    Write-Host "  npm install -g netlify-cli" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Or set environment variables manually in Netlify Dashboard:" -ForegroundColor Yellow
    Write-Host "  https://app.netlify.com/sites/YOUR_SITE/settings/deploys#environment-variables" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Read .env.local if exists
$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path $envFile)) {
    Write-Host ".env.local not found. Please run setup-supabase-env.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "[*] Reading .env.local..." -ForegroundColor Cyan
$envContent = Get-Content $envFile -Raw

# Extract environment variables
$envVars = @{}

if ($envContent -match "NEXT_PUBLIC_SUPABASE_URL=(.+)") {
    $envVars["NEXT_PUBLIC_SUPABASE_URL"] = $matches[1].Trim()
}

if ($envContent -match "NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)") {
    $envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = $matches[1].Trim()
}

if ($envContent -match "DATABASE_URL=(.+)") {
    $envVars["DATABASE_URL"] = $matches[1].Trim()
}

if ($envContent -match "DB_HOST=(.+)") {
    $envVars["DB_HOST"] = $matches[1].Trim()
}

if ($envContent -match "DB_PORT=(.+)") {
    $envVars["DB_PORT"] = $matches[1].Trim()
}

if ($envContent -match "DB_USER=(.+)") {
    $envVars["DB_USER"] = $matches[1].Trim()
}

if ($envContent -match "DB_PASSWORD=(.+)") {
    $envVars["DB_PASSWORD"] = $matches[1].Trim()
}

if ($envContent -match "DB_NAME=(.+)") {
    $envVars["DB_NAME"] = $matches[1].Trim()
}

if ($envContent -match "SUPABASE_SERVICE_ROLE_KEY=(.+)") {
    $envVars["SUPABASE_SERVICE_ROLE_KEY"] = $matches[1].Trim()
}

# Add serverless-specific variables
$envVars["NETLIFY"] = "true"
$envVars["SKIP_DB_CHECK"] = "true"

Write-Host "[*] Found environment variables:" -ForegroundColor Cyan
foreach ($key in $envVars.Keys) {
    if ($key -match "PASSWORD|SECRET|KEY") {
        Write-Host "  $key = [HIDDEN]" -ForegroundColor Gray
    } else {
        Write-Host "  $key = $($envVars[$key])" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "[*] Setting environment variables in Netlify..." -ForegroundColor Cyan
Write-Host ""

# Set each variable
foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    Write-Host "Setting $key..." -ForegroundColor Gray
    & netlify env:set $key "$value" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK" -ForegroundColor Green
    } else {
        Write-Host "  Failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Environment variables setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Verify variables in Netlify Dashboard:" -ForegroundColor Gray
Write-Host "     https://app.netlify.com/sites/YOUR_SITE/settings/deploys#environment-variables" -ForegroundColor Yellow
Write-Host "  2. Redeploy your site:" -ForegroundColor Gray
Write-Host "     netlify deploy --prod" -ForegroundColor Yellow
Write-Host "  3. Test database connection:" -ForegroundColor Gray
Write-Host "     Visit: https://YOUR_SITE.netlify.app/api/health/database" -ForegroundColor Yellow

