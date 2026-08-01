@echo off
title Subir Repositorio a GitHub (Kavana CleanStock)
color 0B

echo ========================================================
echo   Subida automatica a GitHub: Kavana CleanStock
echo   Repositorio: kavanasystemsinfo-ui/clean_ops
echo   Rama: main
echo ========================================================
echo.

:: Verificar si existe la carpeta .git, si no, inicializar el repo
if not exist ".git" (
    echo [1/4] Inicializando repositorio local Git...
    git init
    git branch -M main
    git remote add origin https://github.com/kavanasystemsinfo-ui/clean_ops.git
    echo.
) else (
    echo [1/4] Repositorio Git ya inicializado.
    :: Asegurarse de que el remote está bien configurado (por si acaso)
    git remote set-url origin https://github.com/kavanasystemsinfo-ui/clean_ops.git
    echo.
)

:: Asegurarse de estar en la rama main
git checkout main 2>nul || git checkout -b main

:: Añadir todos los archivos
echo [2/4] Agregando archivos al staging area...
git add .
echo.

:: Pedir mensaje del commit al usuario
set /p commitMsg="[3/4] Escribe un mensaje para el commit (ej: 'Modulos Enterprise implementados'): "
if "%commitMsg%"=="" set commitMsg="Actualizacion del sistema (Modulos Enterprise)"

echo.
echo Realizando commit...
git commit -m "%commitMsg%"
echo.

:: Hacer push a la rama main
echo [4/4] Subiendo cambios a GitHub (rama: main)...
git push -u origin main

echo.
if %errorlevel% equ 0 (
    color 0A
    echo ========================================================
    echo   ¡Exito! Los cambios se han subido correctamente.
    echo   Revisa tu repositorio en:
    echo   https://github.com/kavanasystemsinfo-ui/clean_ops/tree/main
    echo ========================================================
) else (
    color 0C
    echo ========================================================
    echo   Hubo un error al subir los cambios a GitHub.
    echo   Posibles causas:
    echo   - No tienes conexion a Internet
    echo   - No tienes permisos de escritura en el repositorio
    echo   - Hay conflictos con la rama remota
    echo.
    echo   Solucion: git pull origin main --rebase y vuelve a ejecutar
    echo ========================================================
)

echo.
pause
