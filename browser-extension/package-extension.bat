@echo off
REM Package the browser extension for distribution
REM Creates a ZIP file that users can download and extract

echo Packaging HuntMaster Browser Extension...
echo.

REM Create a temporary directory with only the files we need
set TEMP_DIR=%TEMP%\huntmaster-extension-temp
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

REM Copy required files (exclude development files)
copy manifest.json "%TEMP_DIR%\" >nul
copy *.js "%TEMP_DIR%\" >nul
copy *.html "%TEMP_DIR%\" >nul 2>nul
copy *.png "%TEMP_DIR%\" >nul 2>nul

REM Create ZIP using PowerShell (more reliable than Compress-Archive with wildcards)
echo Creating ZIP file...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$tempDir = '%TEMP_DIR%'; ^
   $zipFile = '%~dp0huntmaster-extension.zip'; ^
   if (Test-Path $zipFile) { Remove-Item $zipFile -Force }; ^
   Add-Type -Assembly 'System.IO.Compression.FileSystem'; ^
   [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipFile); ^
   Write-Host 'Done!'"

REM Clean up temp directory
rmdir /s /q "%TEMP_DIR%"

echo.
echo Extension packaged as: huntmaster-extension.zip
echo.
echo Files included: manifest.json, *.js, *.html, *.png
echo Files excluded: package-extension.bat, INSTALLATION.md, README.md, create-icons.html, .git
echo.
pause

