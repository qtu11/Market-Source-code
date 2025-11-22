# Script để cleanup và restart dev server
# Usage: .\scripts\clean-dev.ps1

Write-Host "🧹 Cleaning up dev environment..." -ForegroundColor Cyan

# Stop all Node.js processes
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "⏹️  Stopping Node.js processes..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Start-Sleep -Seconds 1
    Write-Host "✅ All Node.js processes stopped" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No Node.js processes running" -ForegroundColor Gray
}

# Remove lock file
if (Test-Path ".next\dev\lock") {
    Remove-Item ".next\dev\lock" -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Lock file removed" -ForegroundColor Green
}

# Clean .next/dev folder
if (Test-Path ".next\dev") {
    Remove-Item ".next\dev" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ .next/dev folder cleaned" -ForegroundColor Green
}

# Check for port 3000
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "⚠️  Port 3000 is in use" -ForegroundColor Yellow
    $processId = $port3000.OwningProcess
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   Process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Gray
    }
}

Write-Host "`n✨ Cleanup complete! Ready to start dev server." -ForegroundColor Green
Write-Host "   Run: npm run dev" -ForegroundColor Cyan

