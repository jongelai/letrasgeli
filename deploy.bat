@echo off
echo Subiendo cambios a GitHub...
git add .
git commit -m "Actualizacion rapida"
git push origin main

echo Lanzando despliegue directo en Vercel...
vercel --prod

pause