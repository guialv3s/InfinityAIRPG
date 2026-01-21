@echo off
echo Iniciando servidor em 0.0.0.0:8000...
echo Para acessar pelo celular, use o IP: http://192.168.1.68:8000
echo Procure pelo IP acima no seu navegador do celular.
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
if %errorlevel% neq 0 (
    echo.
    echo Erro ao iniciar o servidor via python. Tentando comando direto 'uvicorn'...
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
)
pause
