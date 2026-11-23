@echo off
REM Handwriting Service Startup Script for Windows

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Start the service
echo Starting Handwriting Analyzer Service on http://localhost:8001
echo API docs available at http://localhost:8001/docs
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

pause
