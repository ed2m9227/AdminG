# 🚀 Guía Rápida de Setup - Frontend AdminG

## 1️⃣ **Instalar Dependencias (YA HECHO)**

```bash
cd frontend
npm install
```

✅ Ya se ejecutó automáticamente. Verifica que exista la carpeta `node_modules`.

---

## 2️⃣ **Configurar .env.local**

✅ **Ya está creado en**: `frontend/.env.local`

Contiene:
```
VITE_API_URL=http://localhost:8000
```

**Si el backend está en otro puerto, actualiza este archivo.**

---

## 3️⃣ **Asegurar que el Backend está corriendo**

Abre otra terminal y ejecuta:

```bash
# Desde la raíz del proyecto (AdminG/)
cd app
uvicorn main:app --reload --port 8000
```

Deberías ver:
```
Uvicorn running on http://127.0.0.1:8000
```

---

## 4️⃣ **Iniciar el Frontend en Desarrollo**

```bash
cd frontend
npm run dev
```

Verás algo como:
```
➜ Local:   http://127.0.0.1:5173/
```

**Abre este link en tu navegador.**

---

## 5️⃣ **Primeros Pasos en la App**

### Crear una cuenta nueva:
1. Haz clic en "Regístrate aquí" en la página de login
2. Ingresa email y contraseña (mín. 8 caracteres)
3. Se te asignará **AdminG Basic** automáticamente

### Datos de prueba (si ejecutaste pytest):
```
Email: test@example.com
Password: testpass123
Plan: AdminG Basic
```

---

## 📋 **Errores Comunes y Soluciones**

### ❌ "Command vite not found"
**Solución:**
```bash
cd frontend
npm install  # Instalar de nuevo
```

### ❌ "Cannot find module axios"
**Solución:** npm install no se ejecutó completamente
```bash
npm install axios
```

### ❌ Error en formulario de login (422)
**Causa:** El email NO existe en la BD

**Solución:** 
1. Regístrate primero en `/register`
2. O usa `test@example.com` (si corriste los tests)

### ❌ "ECONNREFUSED" - No conecta al backend
**Causa:** El backend no está corriendo

**Solución:**
```bash
# En otra terminal
cd app
uvicorn main:app --reload
```

### ❌ Líneas rojas en VS Code (errores TypeScript)
**Es normal durante desarrollo.** Si quieres verificar:
```bash
cd frontend
npx tsc --noEmit
```

---

## ✅ **Checklist de Funcionamiento**

- [ ] `npm install` completó sin errores
- [ ] Backend corre en `http://localhost:8000`
- [ ] Frontend corre en `http://localhost:5173`
- [ ] Puedes acceder a `/login`
- [ ] Puedo registrar un usuario nuevo
- [ ] Login funciona y va a dashboard
- [ ] Dashboard muestra datos
- [ ] Clientes CRUD funciona
- [ ] Sidebar muestra menú correcto

---

## 🔧 **Comandos Útiles**

```bash
# Build para producción
npm run build

# Preview del build
npm run preview

# Lint del código
npm run lint

# Ver errores TypeScript
npx tsc --noEmit
```

---

## 📱 **Estructura Actual del Frontend**

```
✅ Pages Completadas:
  - LoginPage         (login/registro)
  - DashboardPage     (métricas + features)
  - CustomersPage     (CRUD clientes)

🔄 Pages con Estructura:
  - AppointmentsPage  (tabla + form vacío)
  - InventoryPage     (tabla + low stock alert)
  - ReportsPage       (métricas demostración)
  - PaymentsPage      (tabla transacciones)

⚡ Componentes:
  - Layout           (Sidebar + Navigation)
  - API Client       (Axios con interceptores)
  - Auth Store       (Zustand state management)
```

---

## 🎨 **Colores y Estilos**

**Todo usa Tailwind CSS con colores estándar:**
- Primario: `blue-*` (blue-50, blue-600, etc)
- Secundario: `gray-*`
- Error: `red-*`
- Éxito: `green-*`
- Advertencia: `yellow-*`

**No hay clases custom**.

---

## 🔒 **Autenticación**

### Cómo funciona:
1. Usuario entra credenciales en `/login`
2. API retorna `access_token` en JSON
3. Token se guarda en `localStorage`
4. Axios interceptor agrega: `Authorization: Bearer {token}`
5. Si status 401 → redirect a `/login`

### Probando autenticación:
```javascript
// En consola del navegador
console.log(localStorage.getItem('token'))  // Ver token
localStorage.removeItem('token')             // Eliminar token (logout)
```

---

## 🐛 **Debugging**

### Ver requests/responses:
```bash
# En la consola de DevTools (F12)
# Network tab → refrescar página → ver requests a localhost:8000
```

### Ver estado auth:
```javascript
// Consola
import { useAuthStore } from './src/store/authStore'
const store = useAuthStore()
console.log(store.user)     // Usuario actual
console.log(store.token)    // Token JWT
console.log(store.isAuthenticated)  // Boolean
```

---

## 📞 **Próximos Pasos (Opcional)**

Una vez que todo funcione:

1. **Implementar Chart.js** en ReportsPage
2. **Agregar más validaciones** en formularios
3. **Agregar modales** para confirmaciones
4. **Implementar búsqueda/filtrado** en tablas
5. **Push a producción** (Vercel, Netlify, etc)

---

## ✨ **Ready!**

Si todo está verde ✅, ¡el frontend está listo para usar!

**Cualquier error, revisa la consola del navegador (F12) → Console tab**
