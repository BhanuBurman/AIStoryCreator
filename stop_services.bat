@echo off
title Stop AIStoryCreator Services
echo ==========================================================
echo  Stopping AIStoryCreator Services (Ports 8001, 8002, 3000)
echo ==========================================================

powershell -Command "Get-NetTCPConnection -LocalPort 8001, 8002, 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo.
echo All microservices on ports 8001, 8002, and 3000 have been stopped!
pause
