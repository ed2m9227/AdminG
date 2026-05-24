#!/bin/bash
# 🚀 Script de Migración: Railway → Render
# Uso: ./migrate-to-render.sh

echo "🚀 Iniciando migración de Railway a Render..."

# Verificar que estamos en el directorio correcto
if [ ! -f "app/main.py" ]; then
    echo "❌ Error: Ejecutar desde la raíz del proyecto AdminG"
    exit 1
fi

# 1. Backup de la base de datos actual (si existe)
echo "📦 Creando backup de base de datos..."
if [ -f "app.db" ]; then
    cp app.db "app-backup-$(date +%Y%m%d-%H%M%S).db"
    echo "✅ Backup creado: app-backup-$(date +%Y%m%d-%H%M%S).db"
fi

# 2. Crear render.yaml si no existe
if [ ! -f "render.yaml" ]; then
    echo "📝 Creando configuración de Render..."
    cat > render.yaml << 'EOF'
services:
  - type: web
    name: adming-api
    runtime: python3
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        value: sqlite:///./app.db
      - key: ENVIRONMENT
        value: production
      - key: SECRET_KEY
        generateValue: true
      - key: CORS_ALLOW_ORIGINS
        value: https://tu-dominio.vercel.app,https://tu-dominio.netlify.app
    healthCheckPath: /health
    autoDeploy: true
EOF
    echo "✅ render.yaml creado"
fi

# 3. Actualizar requirements.txt para producción
echo "📦 Verificando dependencias de producción..."
if ! grep -q "uvicorn" requirements.txt; then
    echo "uvicorn[standard]==0.24.0" >> requirements.txt
    echo "✅ uvicorn agregado a requirements.txt"
fi

if ! grep -q "gunicorn" requirements.txt; then
    echo "gunicorn==21.2.0" >> requirements.txt
    echo "✅ gunicorn agregado a requirements.txt"
fi

# 4. Crear .env.example para Render
if [ ! -f ".env.example" ]; then
    echo "📝 Creando .env.example..."
    cat > .env.example << 'EOF'
# Copiar estas variables a Render Environment
DATABASE_URL=sqlite:///./app.db
ENVIRONMENT=production
SECRET_KEY=generar_uno_seguro_aqui
CORS_ALLOW_ALL_ORIGINS=false
CORS_ALLOW_ORIGINS=https://tu-frontend.vercel.app
FRONTEND_BASE_URL=https://tu-frontend.vercel.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
SMTP_FROM_EMAIL=tu-email@gmail.com
EOF
    echo "✅ .env.example creado"
fi

# 5. Verificar configuración de producción
echo "🔍 Verificando configuración de producción..."
python3 -c "
import sys
sys.path.insert(0, '.')
try:
    from app.core.config import validate_runtime_config
    print('✅ Configuración de producción válida')
except SystemExit:
    print('⚠️  Revisar variables de entorno requeridas')
except Exception as e:
    print(f'❌ Error en configuración: {e}')
"

echo ""
echo "🎉 Migración preparada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Crear cuenta en https://render.com"
echo "2. Conectar tu repositorio de GitHub"
echo "3. Crear Web Service desde render.yaml"
echo "4. Configurar variables de entorno"
echo "5. Desplegar"
echo ""
echo "📚 Documentación completa en DESPLIEGUE_GRATUITO.md"</content>
<parameter name="filePath">c:\Users\USUARIO\Desktop\Portafolio\AdminG\migrate-to-render.sh