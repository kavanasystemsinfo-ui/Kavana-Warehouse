@echo off
echo ========================================
echo  Sincronizando repositorio Kavana Warehouse...
echo ========================================

cd /d "C:\Users\jorge\Desktop\proyectos IA\clean_stock"

echo.
echo [1/2] Descargando cambios del remoto...
git fetch origin

echo.
echo [2/2] Aplicando cambios...
git pull origin main

echo.
echo ========================================
echo  ¡Listo! Repositorio actualizado.
echo ========================================
pause
