# Frontend Build Instructions / Instrucciones de Compilación Frontend

## 1. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

## 2. Compilar el frontend (generar dist/)

```bash
npm run build
```

Esto va a generar una carpeta `frontend/dist/` con los archivos optimizados.

## 3. Copiar dist/ al backend

```bash
# Desde el directorio raíz (PowerShell)
Copy-Item -Path "frontend/dist/*" -Destination "frontend-dist/" -Recurse -Force
```

O en CMD:
```cmd
xcopy frontend\dist\* frontend-dist\ /E /I /Y
```

## 4. Reiniciar el servidor backend

El servidor servirá automáticamente los archivos estáticos en http://127.0.0.1:8000/

```bash
python -m uvicorn app.main:app --reload
```

O usando venv:
```bash
C:\...\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

---

## Estructura final esperada

```
AdminG/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx      ✓ Creado
│   │   │   ├── Register.tsx   ✓ Creado
│   │   │   ├── Dashboard.tsx  ✓ Creado
│   │   ├── App.tsx            ✓ Creado
│   │   ├── main.tsx           ✓ Creado
│   │   ├── index.css
│   │   └── App.css
│   ├── dist/                  (generado por npm run build)
│   ├── node_modules/          (generado por npm install)
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
├── frontend-dist/             (copia manual de dist/)
│   ├── index.html
│   └── assets/
├── app/
│   ├── main.py               (actualizado con /users/me)
│   └── modules/
│       ├── users/
│       │   ├── router.py     ✓ Actualizado (agregué GET /users/me)
│       │   └── schemas.py
│       ├── auth/
│       └── ...
└── ...
```

---

## URLs disponibles después de compilar

✓ http://127.0.0.1:8000/          → Redirige a /dashboard
✓ http://127.0.0.1:8000/login     → Página de login
✓ http://127.0.0.1:8000/register  → Página de registro  
✓ http://127.0.0.1:8000/dashboard → Dashboard (requiere login)

---

## Paso a Paso Rápido (Windows PowerShell)

```powershell
# 1. Instalar dependencias
cd frontend
npm install

# 2. Compilar
npm run build

# 3. Copiar a frontend-dist
Copy-Item -Path "dist/*" -Destination "../frontend-dist/" -Recurse -Force

# 4. Volver a raíz e iniciar servidor
cd ..
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Luego abre: http://127.0.0.1:8000

---

## Troubleshooting

### ❌ "npm: command not found"

Necesitas instalar Node.js desde https://nodejs.org/

### ❌ Module ENOENT, no such file

```bash
# Limpiar e reinstalar
rm -r node_modules
rm package-lock.json
npm install
```

### ❌ "Cannot find module 'react-router-dom'"

```bash
npm install react-router-dom axios
```

### ❌ Port 8000 already in use

Mata el proceso anterior:
```bash
Get-Process python | Stop-Process -Force
```

### ❌ API connection refused

1. Verifica que el backend está corriendo: http://127.0.0.1:8000/health
2. Verifica que CORS esté en app/main.py
3. Revisa la consola del navegador (F12) para ver errores

### ❌ "TypeError: Cannot read property 'token'"

El token no se está guardando en localStorage. Verifica que:
- El login responde con `access_token`
- El frontend guarda: `localStorage.setItem('token', response.data.access_token)`

---

## Roles disponibles en el registro

**Viewer** (👁️)
- Solo lectura
- Ver reportes pero no modificar

**Manager** (📊)
- Gestionar clientes
- Crear reportes
- Modificar información

**Admin** (🔐)  
- Control total del sistema
- Acceso a todos los módulos
- Crear y eliminar usuarios

---

## Planes disponibles

- **free**: Gratis, funcionalidad básica
- **basic**: $5.000/mes, gestión de clientes
- **plus**: $30.000/mes, reportes avanzados
- **start**: $50.000/mes, con inventario
- **max**: $100.000/mes, solución completa con todo

---

## Multi-tenancy en AdminG

Si un usuario tiene `parent_user_id` = algo, es un SUB-USUARIO de otro.

Ejemplo:
```
Usuario A (admin@empresa.com) → parent_user_id = NULL → Dueño
  │
  ├── Usuario B (gerente@empresa.com) → parent_user_id = A.id → Sub-usuario
  │
  └── Usuario C (vendedor@empresa.com) → parent_user_id = A.id → Sub-usuario
```

Esto permite planes de equipo donde un dueño invita a otros usuarios a su cuenta.

---

## Próximos pasos after build

1. ✅ Compila el frontend
2. ✅ Reinicia el servidor
3. ✅ Abre http://127.0.0.1:8000/register
4. ✅ Regístrate con:
   - Email: demo@example.com
   - Password: password123 (6+ caracteres)
   - Plan: Elige uno (todos están habilitados)
   - Role: viewer (por defecto está bien)
5. ✅ Ve a login e inicia sesión
6. ✅ Deberías ver el dashboard con tu información

---

¡Listo! Si hay problemas, revisa los logs del servidor backend en la terminal. 🚀
