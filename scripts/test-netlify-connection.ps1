# Script test Supabase connection như Netlify Functions
# Usage: .\scripts\test-netlify-connection.ps1

$ErrorActionPreference = "Stop"

Write-Host "Testing Supabase Connection (Netlify Mode)" -ForegroundColor Green
Write-Host ""

# Set environment variables như Netlify
$env:NETLIFY = "true"
$env:SKIP_DB_CHECK = "true"

# Read .env.local
$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path $envFile)) {
    Write-Host ".env.local not found. Please run setup-supabase-env.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "[*] Loading environment variables from .env.local..." -ForegroundColor Cyan
$envContent = Get-Content $envFile -Raw

if ($envContent -match "DATABASE_URL=(.+)") {
    $env:DATABASE_URL = $matches[1].Trim()
    Write-Host "  DATABASE_URL loaded" -ForegroundColor Gray
}

if ($envContent -match "DB_HOST=(.+)") {
    $env:DB_HOST = $matches[1].Trim()
}

if ($envContent -match "DB_PORT=(.+)") {
    $env:DB_PORT = $matches[1].Trim()
}

if ($envContent -match "DB_USER=(.+)") {
    $env:DB_USER = $matches[1].Trim()
}

if ($envContent -match "DB_PASSWORD=(.+)") {
    $env:DB_PASSWORD = $matches[1].Trim()
}

if ($envContent -match "DB_NAME=(.+)") {
    $env:DB_NAME = $matches[1].Trim()
}

Write-Host ""
Write-Host "[*] Environment:" -ForegroundColor Cyan
Write-Host "  NETLIFY = $env:NETLIFY" -ForegroundColor Gray
Write-Host "  SKIP_DB_CHECK = $env:SKIP_DB_CHECK" -ForegroundColor Gray
Write-Host "  DATABASE_URL = [SET]" -ForegroundColor Gray
Write-Host ""

# Test với Node.js script
Write-Host "[*] Testing database connection..." -ForegroundColor Cyan

$testScript = @"
const { Pool } = require('pg');
const { logger } = require('../lib/logger');

const isServerless = process.env.NETLIFY === 'true' || process.env.VERCEL === '1';
const poolConfig = isServerless
  ? {
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    }
  : {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...poolConfig,
});

async function test() {
  try {
    console.log('Testing connection...');
    const start = Date.now();
    const result = await pool.query('SELECT NOW() as timestamp, version() as version');
    const duration = Date.now() - start;
    
    console.log('✅ Connection successful!');
    console.log('  Timestamp:', result.rows[0].timestamp);
    console.log('  Version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    console.log('  Response time:', duration + 'ms');
    console.log('  Pool config:', JSON.stringify(poolConfig, null, 2));
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Connection failed:', error);
    await pool.end();
    process.exit(1);
  }
}

test();
"@

$testScriptPath = Join-Path $env:TEMP "test-netlify-connection.js"
$testScript | Out-File -FilePath $testScriptPath -Encoding UTF8

try {
    node $testScriptPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Test passed! Connection works correctly in Netlify mode." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Test failed! Check the error above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error running test: $_" -ForegroundColor Red
    exit 1
} finally {
    if (Test-Path $testScriptPath) {
        Remove-Item $testScriptPath -Force
    }
}

