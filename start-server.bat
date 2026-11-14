@echo off
title TCSD Case Intelligence & To-Do Tracking System (บก.ปอท. / CIB)
color 0B
echo =======================================================================
echo   TCSD CYBER INVESTIGATION TASKFORCE - SYSTEM STARTUP
echo   กองบังคับการปราบปรามการกระทำความผิดเกี่ยวกับอาชญากรรมทางเทคโนโลยี (บก.ปอท.)
echo =======================================================================
echo.
echo [*] Starting Production Server on http://localhost:5000 ...
echo [*] Team members on the same network can access via http://[YOUR-IP]:5000
echo.
node server.js
pause
