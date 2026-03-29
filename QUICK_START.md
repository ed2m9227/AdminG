# 🚀 QUICK START - AdminG Full Stack

## ✅ Lo que acabamos de crear

### Backend (FastAPI)
✓ Autenticación de usuarios con JWT  
✓ Registro y login funcionales  
✓ Endpoints para inventario, pagos, reportes  
✓ Integración MontelibanoGen (7% descuento)  
✓ Multi-tenancy (parent_user_id para sub-usuarios)  
✓ Roles: admin, manager, viewer  
✓ CORS configurado  
✓ Base de datos SQLite sincronizada  

### Frontend (React + TypeScript/TSX)
✓ Login.tsx - Página de inicio de sesión  
✓ Register.tsx - Registro con selección de plan y rol  
✓ Dashboard.tsx - Panel principal con info del usuario  
✓ App.tsx - Router principal  
✓ Tailwind CSS para estilos  
✓ Axios para llamadas HTTP  
✓ React Router para navegación  

---

## 📋 Pasos para ejecutar todo (Windows)

### Terminal 1: Backend

```powershell
# 1. Ve al directorio raíz
cd C:\Users\USUARIO\Desktop\Portafolio\AdminG

# 2. Mata procesos Python anteriores (si hay)
Get-Process python | Stop-Process -Force -ErrorAction SilentlyContinue

# 3. Inicia el servidor
C:\Users\USUARIO\Desktop\Portafolio\AdminG\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Deberías ver:
```
✓ Uvicorn running on http://127.0.0.1:8000
✓ Application startup complete
```

---

### Terminal 2: Frontend (nueva terminal)

```powershell
# 1. Ve a la carpeta frontend
cd C:\Users\USUARIO\Desktop\Portafolio\AdminG\frontend

# 2. Instala dependencias (solo primera vez)
npm install

# 3. Compila para producción
npm run build

# 4. Vuelve a raíz y copia los archivos
cd ..
Copy-Item -Path "frontend/dist/*" -Destination "frontend-dist/" -Recurse -Force

# 5. Listo - el frontend se sirve desde el backend
```

---

## 🎯 Ahora abre en tu navegador

1. **Ir a**: http://127.0.0.1:8000
2. **Deberías ver**: Página de login
3. **Click en**: "¿No tienes cuenta? Regístrate aquí"
4. **Registrar con**:
   - Email: `caniche1@example.com` (o cualquiera)
   - Plan: `AdminG Basic` (o el que prefieras)
   - Rol: `Viewer` (por defecto)
   - Contraseña: `password123` (6+ caracteres)
5. **Crear cuenta**
6. **Volver a login**
7. **Iniciar sesión** con el email y password
8. **Ver dashboard** con tu información

---

## 📊 Estructura Front/Back actualizada

```
Backend:
✓ app/main.py → Servir frontend estático automaticamente
✓ app/modules/users/router.py → Agregué GET /users/me
✓ app/modules/auth/ → Login/Register funcionan
✓ app/core/security.py → Password validation <72 bytes

Frontend:
✓ frontend/src/pages/Login.tsx → Login form
✓ frontend/src/pages/Register.tsx → Registro con planes/roles  
✓ frontend/src/pages/Dashboard.tsx → Dashboard después del login
✓ frontend/src/App.tsx → React Router
✓ frontend/src/main.tsx → Punto de entrada
✓ frontend/package.json → React Router + Axios ya incluidos
```

---

## 🔐 Roles explicados

**👁️ Viewer (por defecto)**
- Solo lectura
- Ver clientes, reportes
- No puede modificar nada

**📊 Manager**
- Crear/editar clientes
- Generador reportes
- Gestionar citas

**🔐 Admin**
- Control total
- Crear/eliminar usuarios
- Acceso a todo incluyendo settings

---

## 💳 Planes explicados

| Plan | Precio | Características |
|------|--------|-----------------|
| **Free** | Gratis | Basic features |
| **Basic** | $5k/mes | Clientes + Citas |
| **Plus** | $30k/mes | + Reportes avanzados |
| **Start** | $50k/mes | + Inventario |
| **Max** | $100k/mes | TODO + Máximo |

---

## 🌐 Multi-tenancy

En AdminG puedes tener:

```
Tu Empresa (admin@empresa.com) - Eres el dueño
  ├── Gerente (gerente@empresa.com) - Sub-usuario
  └── Vendedor (vendedor@empresa.com) - Sub-usuario
```

El campo `parent_user_id` gestiona esto. Solo el usuario padre (**parent_user_id = NULL**) paga el plan.

---

## 🎁 Integración MontelibanoGen

Cuando haces un pago con `method="montelibano_gen"`:

```python
# Se calcula automáticamente:
final_amount = amount * 0.93  # 7% descuento
```

Ejemplo:
- Monto original: $10.000
- Descuento (7%): -$700
- Monto final: $9.300 ✓

---

## ✨ Features implementados

✓ Autenticación JWT  
✓ Registro de usuarios  
✓ Gestión de clientes  
✓ Agendamiento de citas  
✓ Gestión de planes (free/basic/plus/start/max)  
✓ Inventario (SKU, stock, movimientos)  
✓ Pagos (cash/card/transfer/montelibano_gen)  
✓ Reportes (dashboard, revenue, customers, inventory)  
✓ Multi-tenancy (sub-usuarios)  
✓ CORS habilitado  
✓ TypeScript en frontend  

---

## 🆘 Si algo falla

### Error: "Cannot GET /register"
→ El frontend no se compiló. Ejecuta `npm run build` y copia a `frontend-dist/`

### Error: "Access to XMLHttpRequest blocked by CORS"
→ CORS está habilitado pero verifica que el backend está en `127.0.0.1:8000`

### Error: "Email already registered"
→ Usa un email diferente en el registro

### Error: "Password cannot be longer than 72 bytes"
→ Usa un password más corto (máx 72 caracteres)

### Puerto 8000 en uso
```powershell
Get-Process python | Stop-Process -Force
```

---

## 📚 Endpoints disponibles (sin autenticación)

```
POST   /health                    → {"status": "ok"}
GET    /api/version               → Features list
POST   /auth/login                → Login usuario
POST   /auth/register             → Registrar usuario
```

## 🔒 Endpoints con autenticación (usar token en header)

```
GET    /users/me                  → Info del usuario actual
GET    /inventory/categories      → Listar categorías
POST   /inventory/items           → Crear item
GET    /payments                  → Listar pagos
POST   /payments                  → Crear pago
GET    /reports/dashboard         → Dashboard
... (y muchos más)
```

---

## 🎉 Conclusión

Ahora tienes un **sistema completo de administración de empresas** con:
- ✅ Backend FastAPI robusto
- ✅ Frontend React moderno con TypeScript
- ✅ Base de datos SQLite sincronizada
- ✅ Autenticación JWT
- ✅ Multi-tenancy
- ✅ Planes de suscripción
- ✅ Integración MontelibanoGen
- ✅ CORS habilitado
- ✅ Roles y permisos

¡Listo para empezar! 🚀

---

## 📞 Próximos pasos opcionales

1. Deploy a Heroku/AWS
2. Agregar autenticación OAuth (Google/GitHub)
3. Crear app móvil React Native
4. Integración payment gateways (Stripe)
5. Backups automáticos
6. Email notifications

¡Éxito! 💪
