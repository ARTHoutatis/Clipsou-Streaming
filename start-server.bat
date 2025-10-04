@echo off
echo ========================================
echo   Clipsou Streaming - Serveur Local
echo ========================================
echo.
echo Demarrage du serveur...
echo.
echo Le site sera accessible sur:
echo   http://localhost:8000
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo ========================================
echo.

python -m http.server 8000

pause
