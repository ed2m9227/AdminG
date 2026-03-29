@echo off
REM Start Backend Server for AdminG / AdminPro
echo Starting AdminG Backend Server...
echo.

REM Activate virtual environment if exists
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM Start uvicorn from root directory
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

pause
