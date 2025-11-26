# Script phân tích schema SQL và so sánh với code
# Usage: .\scripts\analyze-schema-from-sql.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PHAN TICH SCHEMA SQL" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Danh sách tables từ schema SQL user cung cấp
$schemaTables = @{
    "admin" = @("id", "user_id", "role", "created_at")
    "api_keys" = @("id", "user_id", "key", "created_at", "expires_at")
    "audit_logs" = @("id", "user_id", "action", "details", "created_at")
    "chats" = @("id", "user_id", "admin_id", "message", "is_admin", "created_at")
    "deposits" = @("id", "user_id", "user_email", "user_name", "amount", "method", "transaction_id", "status", "timestamp", "approved_time", "approved_by")
    "withdrawals" = @("id", "user_id", "user_email", "user_name", "amount", "bank_name", "account_number", "account_name", "status", "created_at", "approved_time", "approved_by")
    "products" = @("id", "title", "description", "price", "category", "demo_url", "download_url", "tags", "image_url", "is_active", "created_at", "updated_at")
    "purchases" = @("id", "user_id", "product_id", "amount", "created_at")
    "reviews" = @("id", "user_id", "product_id", "rating", "comment", "created_at", "updated_at")
    "product_ratings" = @("product_id", "average_rating", "total_ratings", "updated_at")
    "users" = @("id", "username", "name", "email", "password_hash", "avatar_url", "ip_address", "role", "balance", "created_at", "updated_at", "status")
    "notifications" = @("id", "user_id", "type", "message", "is_read", "created_at")
    "user_profiles" = @("user_id", "bio", "profile_picture")
    "transactions" = @("id", "user_id", "type", "amount", "payment_method", "transaction_details", "created_at")
}

# Tables bắt buộc cho marketplace
$requiredTables = @(
    "users",
    "products",
    "deposits",
    "withdrawals",
    "purchases",
    "reviews",
    "product_ratings",
    "chats",
    "notifications",
    "admin",
    "transactions"
)

Write-Host "[1/3] PHAN TICH SCHEMA SQL" -ForegroundColor Cyan
Write-Host "  Tổng số tables trong schema: $($schemaTables.Keys.Count)" -ForegroundColor Gray
Write-Host "  Tables bắt buộc: $($requiredTables.Count)" -ForegroundColor Gray
Write-Host ""

Write-Host "  Danh sách tables:" -ForegroundColor Gray
$schemaTables.Keys | Sort-Object | ForEach-Object {
    $table = $_
    $isRequired = $requiredTables -contains $table
    $icon = if ($isRequired) { "[*]" } else { "[ ]" }
    $color = if ($isRequired) { "Green" } else { "DarkGray" }
    Write-Host "    $icon $_" -ForegroundColor $color
}
Write-Host ""

# Kiểm tra columns quan trọng
Write-Host "[2/3] KIEM TRA COLUMNS QUAN TRONG" -ForegroundColor Cyan
$criticalChecks = @{
    "users" = @("id", "email", "role", "balance")
    "products" = @("id", "title", "price", "is_active")
    "deposits" = @("id", "user_id", "amount", "status")
    "withdrawals" = @("id", "user_id", "amount", "status")
    "purchases" = @("id", "user_id", "product_id", "amount")
    "chats" = @("id", "user_id", "admin_id", "message", "is_admin")
}

foreach ($table in $criticalChecks.Keys) {
    if ($schemaTables.ContainsKey($table)) {
        $requiredCols = $criticalChecks[$table]
        $actualCols = $schemaTables[$table]
        $missingCols = $requiredCols | Where-Object { $actualCols -notcontains $_ }
        
        if ($missingCols.Count -eq 0) {
            Write-Host "  [OK] Table '$table' có đủ columns" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Table '$table' thiếu columns: $($missingCols -join ', ')" -ForegroundColor Red
        }
    } else {
        Write-Host "  [ERROR] Table '$table' không tồn tại trong schema!" -ForegroundColor Red
    }
}
Write-Host ""

# So sánh với code
Write-Host "[3/3] SO SANH VOI CODE" -ForegroundColor Cyan
$codeFiles = @(
    "lib/database.ts",
    "app/api/products/route.ts",
    "app/api/deposits/route.ts",
    "app/api/withdrawals/route.ts",
    "app/api/chat/route.ts"
)

Write-Host "  Kiểm tra các file code sử dụng database:" -ForegroundColor Gray
foreach ($file in $codeFiles) {
    $filePath = Join-Path $PSScriptRoot "..\$file"
    if (Test-Path $filePath) {
        Write-Host "    [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "    [SKIP] $file (không tồn tại)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TOM TAT" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

$allRequiredExist = $true
foreach ($table in $requiredTables) {
    if (-not $schemaTables.ContainsKey($table)) {
        $allRequiredExist = $false
        break
    }
}

if ($allRequiredExist) {
    Write-Host "  [OK] Schema có đủ tất cả tables bắt buộc!" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Schema thiếu một số tables bắt buộc!" -ForegroundColor Red
}

Write-Host ""
Write-Host "  Lưu ý về lỗi DNS:" -ForegroundColor Yellow
Write-Host "    - Lỗi 'getaddrinfo ENOTFOUND' thường do Supabase project bị PAUSE" -ForegroundColor Gray
Write-Host "    - Free tier tự động pause sau 7 ngày không sử dụng" -ForegroundColor Gray
Write-Host "    - Giải pháp: Vào Dashboard và Restore project" -ForegroundColor Cyan
Write-Host "      https://supabase.com/dashboard/project/qrozeqsmqvkqxqenhike" -ForegroundColor Cyan
Write-Host ""

