@echo off
echo Starting local server for Geneva...

cd /d %~dp0geneva

echo Serving folder: %cd%
echo ------------------------------
echo URL: http://localhost:8000
echo Press CTRL+C to stop the server.
echo ------------------------------

python -m http.server 8000
