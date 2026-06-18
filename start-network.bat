@echo off
cd /d "%~dp0"
echo Starting QR site for network access on port 8000.
echo Open http://YOUR_COMPUTER_IP:8000/ from another device.
echo Do not open http://[::]:8000/
python -m http.server 8000 --bind 0.0.0.0
