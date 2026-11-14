# Stop AIStoryCreator Services
Write-Host "Stopping services on ports 8001, 8002, 3000..." -ForegroundColor Yellow

$connections = Get-NetTCPConnection -LocalPort 8001, 8002, 3000 -ErrorAction SilentlyContinue
if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $pids) {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped process PID: $p" -ForegroundColor Green
    }
} else {
    Write-Host "No active services found on ports 8001, 8002, or 3000." -ForegroundColor Cyan
}

Write-Host "Done!" -ForegroundColor Green
