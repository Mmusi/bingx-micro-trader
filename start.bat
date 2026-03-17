@echo off
setlocal enabledelayedexpansion

echo.
echo  ==============================================
echo   BINGX MICRO TRADER -- SETUP
echo  ==============================================
echo.

REM Save root dir
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

REM Create database dir if missing
if not exist "%ROOT%\database" mkdir "%ROOT%\database"

REM Copy settings if not already done
if not exist "%ROOT%\backend\config\settings.js" (
  copy "%ROOT%\backend\config\settings.example.js" "%ROOT%\backend\config\settings.js" >nul
  echo  [INFO] Created backend\config\settings.js
  echo  [WARN] Add your BingX API keys before running!
) else (
  echo  [OK] settings.js already exists
)

echo.
echo  Installing root dependencies...
cd /d "%ROOT%"
call npm install
if errorlevel 1 ( echo [ERROR] Root npm install failed & pause & exit /b 1 )

echo.
echo  Installing backend dependencies...
cd /d "%ROOT%\backend"
call npm install
if errorlevel 1 ( echo [ERROR] Backend npm install failed & pause & exit /b 1 )

echo.
echo  Installing frontend dependencies...
cd /d "%ROOT%\frontend"
call npm install
if errorlevel 1 ( echo [ERROR] Frontend npm install failed & pause & exit /b 1 )

echo.
echo  ==============================================
echo   Setup complete!
echo  ==============================================
echo.
echo  NEXT STEPS:
echo  1. Edit:  backend\config\settings.js
echo            - BINGX_API_KEY
echo            - BINGX_API_SECRET
echo            - TELEGRAM_BOT_TOKEN  (optional)
echo            - TELEGRAM_CHAT_ID    (optional)
echo.
echo  2. Run:   npm run dev   (from the root folder)
echo.
echo  3. Open:  http://localhost:3000
echo.
cd /d "%ROOT%"
pause
