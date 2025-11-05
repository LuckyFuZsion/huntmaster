@echo off
REM Package the browser extension for Chrome Web Store submission
REM This creates a ZIP file with only production files (no dev files)

echo ========================================
echo Packaging for Chrome Web Store...
echo ========================================
echo.

REM Create a temporary directory
set TEMP_DIR=%TEMP%\huntmaster-store-temp
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

REM Copy only production files
echo Copying production files...
copy manifest.json "%TEMP_DIR%\" >nul
copy background.js "%TEMP_DIR%\" >nul
copy content.js "%TEMP_DIR%\" >nul
copy huntmaster-content.js "%TEMP_DIR%\" >nul
copy popup.html "%TEMP_DIR%\" >nul
copy popup.js "%TEMP_DIR%\" >nul
copy icon16.png "%TEMP_DIR%\" >nul
copy icon48.png "%TEMP_DIR%\" >nul
copy icon128.png "%TEMP_DIR%\" >nul

REM Create ZIP using PowerShell
echo.
echo Creating ZIP file...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$tempDir = '%TEMP_DIR%'; ^
   $zipFile = '%~dp0huntmaster-chrome-store.zip'; ^
   if (Test-Path $zipFile) { Remove-Item $zipFile -Force }; ^
   Add-Type -Assembly 'System.IO.Compression.FileSystem'; ^
   [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipFile); ^
   Write-Host 'Done!'"

REM Clean up temp directory
rmdir /s /q "%TEMP_DIR%"

echo.
echo ========================================
echo SUCCESS!
echo ========================================
echo.
echo Extension packaged as: huntmaster-chrome-store.zip
echo.
echo This ZIP file is ready for Chrome Web Store submission.
echo.
echo Files included:
echo   - manifest.json
echo   - background.js
echo   - content.js
echo   - huntmaster-content.js
echo   - popup.html
echo   - popup.js
echo   - icon16.png, icon48.png, icon128.png
echo.
echo Files excluded (dev files):
echo   - package-extension.bat
echo   - package-extension.sh
echo   - package-chrome-store.bat
echo   - INSTALLATION.md
echo   - README.md
echo   - UPDATE_SERVER_GUIDE.md
echo   - create-icons.html
echo   - .git files
echo.
echo Next steps:
echo   1. Upload huntmaster-chrome-store.zip to Chrome Web Store
echo   2. See CHROME_STORE_SUBMISSION.md for complete guide
echo.
pause

