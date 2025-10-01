@echo off
echo Starting MongoDB...
echo.

REM Check if MongoDB service exists
sc query MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo MongoDB service not found. Please install MongoDB first.
    echo Download from: https://www.mongodb.com/try/download/community
    pause
    exit /b 1
)

REM Start MongoDB service
echo Starting MongoDB service...
net start MongoDB

if %errorlevel% equ 0 (
    echo.
    echo ✅ MongoDB started successfully!
    echo.
    echo You can now run your accounting web application.
    echo Test MongoDB with: mongosh
) else (
    echo.
    echo ❌ Failed to start MongoDB service.
    echo Please check if MongoDB is properly installed.
)

echo.
pause
