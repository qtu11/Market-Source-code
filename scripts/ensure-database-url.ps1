# Script đảm bảo DATABASE_URL đúng format cho tunnel
# Tự động cập nhật .env.local với connection string đúng

param(
    [string]$User = "qtusdev",
    [string]$Password = "20022007",
    [string]$Database = "qtusdevmarket",
    [int]$Port = 6543,
    [string]$DbHost = "localhost",
    [switch]$UpdateOnly = $false
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "Ensure DATABASE_URL Configuration" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$rootDir = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $rootDir ".env.local"
$envExampleFile = Join-Path $rootDir ".env.example"

# Tạo DATABASE_URL
$databaseUrl = "postgresql://${User}:${Password}@${DbHost}:${Port}/${Database}"

Write-Host "[*] Target DATABASE_URL:" -ForegroundColor Cyan
Write-Host "  $databaseUrl" -ForegroundColor White
Write-Host ""

# Kiểm tra .env.local
if (Test-Path $envFile) {
    Write-Host "[*] Found .env.local" -ForegroundColor Cyan
    $content = Get-Content $envFile -Raw
    
    # Kiểm tra DATABASE_URL hiện tại
    if ($content -match "DATABASE_URL=(.+)") {
        $currentUrl = $matches[1].Trim()
        Write-Host "  Current: $currentUrl" -ForegroundColor Gray
        
        if ($currentUrl -eq $databaseUrl) {
            Write-Host "  [OK] DATABASE_URL is already correct" -ForegroundColor Green
        } else {
            Write-Host "  [INFO] DATABASE_URL needs update" -ForegroundColor Yellow
            
            if (-not $UpdateOnly) {
                $confirm = Read-Host "Update DATABASE_URL? (Y/N)"
                if ($confirm -eq "Y" -or $confirm -eq "y") {
                    $content = $content -replace "DATABASE_URL=.*", "DATABASE_URL=$databaseUrl"
                    $content | Set-Content $envFile -NoNewline
                    Write-Host "  [OK] DATABASE_URL updated" -ForegroundColor Green
                }
            } else {
                $content = $content -replace "DATABASE_URL=.*", "DATABASE_URL=$databaseUrl"
                $content | Set-Content $envFile -NoNewline
                Write-Host "  [OK] DATABASE_URL updated automatically" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "  [INFO] DATABASE_URL not found, adding..." -ForegroundColor Yellow
        Add-Content -Path $envFile -Value "`nDATABASE_URL=$databaseUrl"
        Write-Host "  [OK] DATABASE_URL added" -ForegroundColor Green
    }
    
    # Đảm bảo các biến riêng lẻ cũng có
    $individualVars = @{
        "DB_HOST" = $DbHost
        "DB_PORT" = $Port.ToString()
        "DB_USER" = $User
        "DB_PASSWORD" = $Password
        "DB_NAME" = $Database
    }
    
    foreach ($varName in $individualVars.Keys) {
        if ($content -notmatch "$varName=") {
            Write-Host "  [INFO] Adding $varName..." -ForegroundColor Yellow
            Add-Content -Path $envFile -Value "$varName=$($individualVars[$varName])"
        }
    }
} else {
    Write-Host "[*] .env.local not found, creating..." -ForegroundColor Cyan
    
    $envContent = @"
# Database Configuration
DATABASE_URL=$databaseUrl
DB_HOST=$DbHost
DB_PORT=$Port
DB_USER=$User
DB_PASSWORD=$Password
DB_NAME=$Database
"@
    
    $envContent | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "  [OK] .env.local created with DATABASE_URL" -ForegroundColor Green
}

Write-Host ""
Write-Host "[OK] DATABASE_URL configuration complete!" -ForegroundColor Green
Write-Host ""

