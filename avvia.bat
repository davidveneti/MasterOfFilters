@echo off
setlocal
cd /d "%~dp0"
title AR Crypto Lab
echo ============================================
echo   AR Crypto Lab - avvio rapido
echo ============================================
echo.

rem --- 1. Node.js presente e abbastanza recente (>= 18)?
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRORE] Node.js non e' installato.
  echo Scaricalo da https://nodejs.org ^(versione LTS^), installalo e rilancia questo file.
  echo.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0])>=18?0:1)"
if errorlevel 1 (
  echo [ERRORE] Serve Node.js 18 o superiore. Aggiornalo da https://nodejs.org
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo Node.js %%v trovato.

rem --- 2. Dipendenze: installa solo se mancano
if not exist "node_modules\vite\package.json" (
  echo.
  echo Installo le dipendenze ^(serve internet, solo la prima volta^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERRORE] npm install non e' riuscito. Controlla la connessione e riprova.
    pause
    exit /b 1
  )
) else (
  echo Dipendenze gia' installate.
)

rem --- 3. Avvia Vite e apre il browser su http://localhost:5173
echo.
echo Avvio dell'applicazione... il browser si aprira' da solo.
echo Consenti l'uso della webcam quando richiesto.
echo Per fermare tutto premi CTRL+C oppure chiudi questa finestra.
echo.
call npm run dev -- --open

echo.
echo Applicazione terminata.
pause
