# PowerShell script to run handwriting service
$ErrorActionPreference = "Stop"
$ServicePath = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvScripts = "$ServicePath\.venv\Scripts"

Write-Host "Installing dependencies..." -ForegroundColor Cyan
& "$VenvScripts\pip.exe" install -r "$ServicePath\requirements.txt" -q

Write-Host "Starting Handwriting Service on http://localhost:8001" -ForegroundColor Green
Write-Host "API Documentation: http://localhost:8001/docs" -ForegroundColor Green

& "$VenvScripts\uvicorn.exe" app.main:app --host 0.0.0.0 --port 8001 --reload
