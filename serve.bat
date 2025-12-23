@echo off
echo Starting local server for CivicLearn...

cd "%USERPROFILE%\Documents\GitHub\civiclearn"

start "" http://localhost:8000

python -m http.server 8000

pause