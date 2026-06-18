@echo off
cd /d "%~dp0"
echo Starting QR site on http://127.0.0.1:8000/
echo Do not open http://[::]:8000/
python -m http.server 8000 --bind 127.0.0.1
