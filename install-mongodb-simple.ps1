# Simple MongoDB Installation Script
Write-Host "Installing MongoDB..." -ForegroundColor Green

# Create data directory
$dataDir = "C:\data\db"
if (!(Test-Path $dataDir)) {
    Write-Host "Creating data directory: $dataDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $dataDir -Force
}

# Download MongoDB
$downloadUrl = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-8.2.0-signed.msi"
$installerPath = "$env:TEMP\mongodb-installer.msi"

Write-Host "Downloading MongoDB..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing

# Install MongoDB
Write-Host "Installing MongoDB..." -ForegroundColor Yellow
Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $installerPath, "/quiet", "/norestart" -Wait

# Add to PATH
$mongodbPath = "C:\Program Files\MongoDB\Server\8.2\bin"
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
if ($currentPath -notlike "*$mongodbPath*") {
    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$mongodbPath", "Machine")
}

Write-Host "MongoDB installation completed!" -ForegroundColor Green
Write-Host "Please restart PowerShell and run: mongod --dbpath C:\data\db" -ForegroundColor Cyan

# Cleanup
Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
