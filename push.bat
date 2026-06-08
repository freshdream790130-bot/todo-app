@echo off
cd /d "%~dp0"
git add .
git commit -m "feat: add daily/weekly view, checkbox, google calendar"
git push
pause
