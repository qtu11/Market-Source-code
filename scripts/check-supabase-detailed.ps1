# Script kiem tra chi tiet Supabase: cong, bang, indexes, du lieu
# Usage: .\scripts\check-supabase-detailed.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KIEM TRA CHI TIET SUPABASE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Read password from .env.local if exists
$envFile = Join-Path $PSScriptRoot "..\.env.local"
$DbPassword = $null

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "DB_PASSWORD=(.+)") {
        $DbPassword = $matches[1].Trim()
    } elseif ($envContent -match "DATABASE_URL=postgresql://postgres:(.+?)@") {
        $DbPassword = $matches[1].Trim()
    }
}

if (-not $DbPassword) {
    Write-Host "[*] Khong tim thay password trong .env.local" -ForegroundColor Yellow
    Write-Host "[*] Nhap password tu Supabase Dashboard:" -ForegroundColor Cyan
    $DbPasswordSecure = Read-Host "Enter Supabase DB Password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPasswordSecure)
    $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
}

# Supabase connection info
$SupabaseHost = "db.qrozeqsmqvkqxqenhike.supabase.co"
$SupabasePort = "5432"
$SupabaseUser = "postgres"
$SupabaseDb = "postgres"
$SupabaseUrl = "https://qrozeqsmqvkqxqenhike.supabase.co"

$connectionString = "postgresql://${SupabaseUser}:${DbPassword}@${SupabaseHost}:${SupabasePort}/${SupabaseDb}"
$env:PGPASSWORD = $DbPassword

Write-Host "[1/7] THONG TIN KET NOI" -ForegroundColor Cyan
Write-Host "  Host: $SupabaseHost" -ForegroundColor Gray
Write-Host "  Port: $SupabasePort" -ForegroundColor Gray
Write-Host "  User: $SupabaseUser" -ForegroundColor Gray
Write-Host "  Database: $SupabaseDb" -ForegroundColor Gray
Write-Host "  Supabase URL: $SupabaseUrl" -ForegroundColor Gray
Write-Host ""

# Test connection
Write-Host "[2/7] KIEM TRA KET NOI" -ForegroundColor Cyan
try {
    $versionResult = & psql $connectionString -t -A -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Ket noi thanh cong!" -ForegroundColor Green
        $versionInfo = ($versionResult -split "`r`n" | Where-Object { $_.Trim() -ne "" } | Select-Object -First 1).Trim()
        Write-Host "  PostgreSQL: $versionInfo" -ForegroundColor Gray
    } else {
        Write-Host "  [ERROR] Ket noi that bai!" -ForegroundColor Red
        Write-Host "  Error: $versionResult" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [ERROR] Loi ket noi: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# List all tables
Write-Host "[3/7] DANH SACH TAT CA BANG" -ForegroundColor Cyan
$allTables = & psql $connectionString -t -A -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" 2>&1
$tableCount = ($allTables -split "`r`n" | Where-Object { $_.Trim() -ne "" }).Count
Write-Host "  Tong so bang: $tableCount" -ForegroundColor Gray
Write-Host ""
Write-Host "  Danh sach bang:" -ForegroundColor Gray
$allTables -split "`r`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
    $tableName = $_.Trim()
    Write-Host "    - $tableName" -ForegroundColor DarkGray
}
Write-Host ""

# Check required tables
Write-Host "[4/7] KIEM TRA BANG BAT BUOC" -ForegroundColor Cyan
$requiredTables = @("users", "products", "deposits", "withdrawals", "purchases", "reviews", "chats", "notifications", "user_profiles", "product_ratings", "password_resets", "transactions")
$allTablesList = ($allTables -split "`r`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim() })

$missingTables = @()
foreach ($table in $requiredTables) {
    if ($allTablesList -contains $table) {
        Write-Host "  [OK] '$table' - TON TAI" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] '$table' - THIEU" -ForegroundColor Red
        $missingTables += $table
    }
}

if ($missingTables.Count -gt 0) {
    Write-Host ""
    Write-Host "  [WARNING] Thieu $($missingTables.Count) bang: $($missingTables -join ', ')" -ForegroundColor Yellow
}
Write-Host ""

# Check row counts
Write-Host "[5/7] SO LUONG DU LIEU TRONG BANG" -ForegroundColor Cyan
$importantTables = @("users", "products", "deposits", "withdrawals", "purchases", "reviews", "chats", "notifications")
foreach ($table in $importantTables) {
    if ($allTablesList -contains $table) {
        try {
            $countResult = & psql $connectionString -t -A -c "SELECT COUNT(*) FROM $table;" 2>&1
            $count = ($countResult -split "`r`n" | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1).Trim()
            if ($count -match '^\d+$') {
                Write-Host "  $table : $count rows" -ForegroundColor Gray
            } else {
                Write-Host "  $table : Khong the dem (kiem tra loi)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  $table : Loi dem du lieu" -ForegroundColor Red
        }
    }
}
Write-Host ""

# Check indexes
Write-Host "[6/7] KIEM TRA INDEXES" -ForegroundColor Cyan
try {
    $indexesResult = & psql $connectionString -t -A -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>&1
    $indexCount = ($indexesResult -split "`r`n" | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1).Trim()
    Write-Host "  Tong so indexes: $indexCount" -ForegroundColor Gray
    
    # Check indexes for important tables
    foreach ($table in @("users", "products", "deposits", "withdrawals", "purchases")) {
        if ($allTablesList -contains $table) {
            $tableIndexes = & psql $connectionString -t -A -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = '$table';" 2>&1
            $tableIndexCount = ($tableIndexes -split "`r`n" | Where-Object { $_.Trim() -ne "" }).Count
            Write-Host "    $table : $tableIndexCount indexes" -ForegroundColor DarkGray
        }
    }
} catch {
    Write-Host "  [WARNING] Khong the kiem tra indexes: $_" -ForegroundColor Yellow
}
Write-Host ""

# Check table structures
Write-Host "[7/7] CAU TRUC BANG QUAN TRONG" -ForegroundColor Cyan
foreach ($table in @("users", "products", "deposits")) {
    if ($allTablesList -contains $table) {
        Write-Host ""
        Write-Host "  [TABLE] Bang: $table" -ForegroundColor Yellow
        try {
            $columnsResult = & psql $connectionString -t -A -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table' ORDER BY ordinal_position;" 2>&1
            $columnsResult -split "`r`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
                $parts = $_ -split '\|'
                if ($parts.Count -ge 3) {
                    $colName = $parts[0].Trim()
                    $colType = $parts[1].Trim()
                    $colNullable = $parts[2].Trim()
                    $nullableIcon = if ($colNullable -eq "YES") { "NULL" } else { "NOT NULL" }
                    Write-Host "    - $colName : $colType ($nullableIcon)" -ForegroundColor DarkGray
                }
            }
        } catch {
            Write-Host "    [WARNING] Khong the doc cau truc: $_" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TOM TAT" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  [OK] Ket noi: Thanh cong" -ForegroundColor Green
Write-Host "  [OK] Tong so bang: $tableCount" -ForegroundColor Green
Write-Host "  [OK] Bang bat buoc: $($requiredTables.Count - $missingTables.Count)/$($requiredTables.Count)" -ForegroundColor $(if ($missingTables.Count -eq 0) { "Green" } else { "Yellow" })
if ($missingTables.Count -gt 0) {
    Write-Host "  [ERROR] Bang thieu: $($missingTables -join ', ')" -ForegroundColor Red
}
Write-Host ""
Write-Host "Ket noi Supabase:" -ForegroundColor Gray
Write-Host "  Host: $SupabaseHost" -ForegroundColor Gray
Write-Host "  Port: $SupabasePort" -ForegroundColor Gray
Write-Host "  URL: $SupabaseUrl" -ForegroundColor Gray
Write-Host ""
