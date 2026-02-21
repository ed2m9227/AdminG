@echo off
cd /d %~dp0
call venv\Scripts\activate
python verify_caniche2.py
pause
