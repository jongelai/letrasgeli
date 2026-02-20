@echo off
git add .
git commit -m "Actualizacion automatica"
git push origin main
echo Proyecto actualizado en GitHub!
timeout /t 3