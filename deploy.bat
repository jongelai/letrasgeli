@echo off
setlocal enabledelayedexpansion

echo === Deploy ===

git rev-parse --is-inside-work-tree >nul 2>&1 || exit /b

echo >nul | git diff --exit-code
if errorlevel 1 (
    git stash save deploy-temp >nul
    git pull --rebase
    git stash pop >nul
) else (
    git pull --rebase
)

git add -A

echo >nul | git diff --cached --exit-code
if not errorlevel 1 (
    echo No hay cambios.
    pause
    exit /b
)

for /f "tokens=1-3 delims=/: " %%a in ("%date%") do (
    set d=%%a-%%b-%%c
)
for /f "tokens=1-3 delims=:, " %%a in ("%time%") do (
    set t=%%a-%%b-%%c
)

git commit -m "deploy !d! !t!"
git push
vercel --prod
echo OK
pause
