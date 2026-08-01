@echo off
title Kavana CleanStock — Launcher
cd /d "%~dp0"

echo =============================================
echo   Kavana CleanStock — Inicio Rapido
echo =============================================
echo.

:: ─── 1. Verificar / Iniciar Docker ────────────────────────────────────────
echo [1/5] Verificando Docker PostgreSQL...
docker ps --format "{{.Names}}" 2>nul | findstr /I "kavana" >nul
if %errorlevel% equ 0 (
    echo   ✔ Contenedor PostgreSQL ya esta en ejecucion.
) else (
    echo   ⚡ Iniciando contenedor PostgreSQL...
    docker compose up -d db 2>&1
    if %errorlevel% neq 0 (
        echo   ⚡ docker compose no disponible, intentando docker-compose...
        docker-compose up -d db 2>&1
    )
    echo   ✔ Contenedor PostgreSQL iniciado.
    echo   ⏳ Esperando 5 segundos para que la base de datos este lista...
    timeout /t 5 /nobreak >nul
)

:: ─── 2. Instalar dependencias si no existen ───────────────────────────────
echo.
echo [2/5] Verificando dependencias del backend...
if not exist "node_modules" (
    echo   ⚡ Instalando dependencias del backend...
    call npm install
    echo   ✔ Dependencias del backend instaladas.
) else (
    echo   ✔ node_modules ya existe.
)

:: ─── 3. Ejecutar migraciones Prisma ───────────────────────────────────────
echo.
echo [3/5] Ejecutando migraciones Prisma...
call npx prisma generate 2>&1 | findstr /V "✔" >nul
call npx prisma migrate deploy 2>&1 | findstr /V "✔" >nul
echo   ✔ Migraciones aplicadas.

:: ─── 4. Abrir ventanas de cada servicio ───────────────────────────────────
echo.
echo [4/5] Abriendo servicios...

:: Backend API (puerto 3000)
start "Kavana API" cmd /k "title Kavana API & echo [API] http://localhost:3000 & echo. & npx nodemon src/server.js"

:: Dashboard (puerto 4001) — esperar 3s para que la API arranque
timeout /t 3 /nobreak >nul
start "Kavana Dashboard" cmd /k "title Kavana Dashboard & cd /d "%~dp0dashboard" & echo [Dashboard] http://localhost:4001 & echo. & call npx vite --port 4001 --host"

:: Mobile PWA (puerto 4000)
start "Kavana Mobile" cmd /k "title Kavana Mobile & cd /d "%~dp0mobile" & echo [Mobile] http://localhost:4000 & echo. & call npx vite --port 4000 --host"

:: ─── 5. Abrir navegador ───────────────────────────────────────────────────
echo.
echo [5/5] Abriendo navegador...
echo.
echo   =============================================
echo   🟢  Todos los servicios iniciados:
echo.
echo      📊 Dashboard Supervisor: http://localhost:4001
echo      📱 Mobile Limpiador:    http://localhost:4000
echo      🔧 API Backend:         http://localhost:3000
echo      📖 API Docs (Swagger):  http://localhost:3000/api-docs
echo   =============================================
echo.
timeout /t 2 /nobreak >nul

:: Abrir Dashboard en el navegador predeterminado
start http://localhost:4001

echo   ✔ Navegador abierto en Dashboard.
echo.
echo   ❌ Cierra esta ventana o presiona Ctrl+C para salir.
echo   (Las ventanas de los servicios continuaran abiertas)
echo.
pause >nul
