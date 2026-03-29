# Cambios Realizados: Onboarding y Corrección de Permisos

## Fecha: 2026-02-20

## Problemas Identificados

1. **Plan "free" tenía más permisos que "basic"**: El plan gratuito permitía crear clientes y otras operaciones que deberían estar reservadas para planes pagos.

2. **Configuración de negocio estaba dentro del dashboard**: Debería ser un paso obligatorio ANTES de acceder a la aplicación (onboarding).

## Soluciones Implementadas

### 1. Corrección de Permisos por Plan ✅

**Archivo modificado**: `app/core/features.py`

#### Plan "free" (modo demo/vista previa):
- **ANTES**: Podía crear clientes, ver inventario, pagos, reportes
- **AHORA**: Solo puede VER clientes y citas (modo lectura)
- **Límites**:
  - 10 clientes (antes 50)
  - 20 citas (antes 100)
  - 0 reportes (antes 5)
  - 5 servicios (nuevo)
  - Sin almacenamiento

#### Plan "basic" / "AdminG_Basic" (plan de pago básico):
- **PERMISOS**: CRUD completo para clientes, citas, pagos, reportes básicos
- **SIN ACCESO**: Inventario, funciones avanzadas
- **Límites**:
  - 500 clientes
  - 500 citas
  - 10 reportes
  - 50 servicios
  - 5 GB almacenamiento
  - 1 miembro de equipo

#### Plan "AdminG_Plus":
- **PERMISOS**: Todo lo de Basic + exportaciones, cancelaciones, reembolsos, gestión de equipo
- **Límites**:
  - 2000 clientes
  - 2000 citas
  - 50 reportes
  - 200 servicios
  - 25 GB almacenamiento
  - 3 miembros de equipo

### 2. Módulo de Servicios - Corrección de Acceso ✅

**Archivo modificado**: `app/modules/services/router.py`

- **Función `check_services_access()`**: 
  - Plan "free" ahora está **EXPLÍCITAMENTE BLOQUEADO** ❌
  - Solo planes pagos tienen acceso: `basic`, `plus`, `start`, `max`, `admin`, `AdminG_Basic`, `AdminG_Plus`, `AdminPro_Start`, `AdminPro_Max`
  - Mensaje de error claro: "Services module not available in free plan. Please upgrade to AdminG Basic or higher."

### 3. Wizard de Onboarding Inicial ✅

**Archivo nuevo**: `frontend-dist/js/views/OnboardingWizard.js`

#### Características:
- **Vista completa antes del dashboard** (fullscreen con gradiente)
- **2 pasos**:
  - **Paso 1**: Información básica del negocio
    - Tipo de negocio (veterinaria, barbería, spa, clínica, otro)
    - Nombre del negocio
    - ¿Trabaja con mascotas? (checkbox)
  - **Paso 2**: Personalización de etiquetas
    - Cómo llamas a tus clientes (Cliente, Paciente, Dueño)
    - Cómo llamas a tus citas (Cita, Reserva, Turno)
    - Campos de mascotas (nombre, raza, especie, color, fecha nacimiento, peso)
    - Cómo llamas a las mascotas

#### Flujo:
1. Usuario inicia sesión → Verifica si completó onboarding
2. Si NO completó → Redirige a `/onboarding` obligatoriamente
3. Usuario completa wizard → Se guarda configuración en BD
4. Se marca `onboarding_completed` en `localStorage`
5. Redirige a dashboard → Puede usar la aplicación normalmente

### 4. Integración en App Principal ✅

**Archivo modificado**: `frontend-dist/js/app.js`

#### Cambios:
- **Importación**: `import onboardingWizard from './views/OnboardingWizard.js'`
- **Nueva ruta**: `router.register('onboarding', async () => {...})`
- **Función `renderProtectedView()`**: Verifica `onboarding_completed` antes de renderizar cualquier vista protegida
- **Función `loadInitialView()`**: Redirige a onboarding si no está completado

#### Lógica de Protección:
```javascript
if (!localStorage.getItem('onboarding_completed')) {
    await router.navigate('onboarding');
    return;
}
```

## Cómo Probar

### Test 1: Usuario Nuevo (debe ver onboarding)
```bash
1. Registrar nuevo usuario: POST /auth/register
   {
     "email": "test@example.com",
     "password": "password123",
     "full_name": "Test User"
   }

2. Login → Debe redirigir automáticamente a /onboarding

3. Completar wizard de 2 pasos

4. Verificar redirección a dashboard

5. localStorage debe tener: onboarding_completed = "true"
```

### Test 2: Plan Free vs Basic (permisos)
```bash
# Usuario con plan FREE
POST /services → ❌ 403 Forbidden
"Services module not available in free plan"

GET /customers → ✅ 200 OK (puede ver)
POST /customers → ❌ 403 Forbidden (no puede crear)

# Usuario con plan BASIC (caniche2@example.com)
POST /services → ✅ 201 Created
POST /customers → ✅ 201 Created
PUT /customers/{id} → ✅ 200 OK
DELETE /customers/{id} → ✅ 200 OK
```

### Test 3: Verificar Configuración de Negocio
```bash
# Después de completar onboarding
GET /business/config

# Debe retornar:
{
  "id": 1,
  "user_id": X,
  "business_type": "veterinaria",
  "business_name": "Mi Negocio",
  "custom_labels": {
    "customers": "Dueño",
    "appointments": "Cita",
    "pets": "Mascota"
  },
  "has_pet_relationship": true,
  "pet_fields_enabled": {
    "name": true,
    "breed": true,
    "species": true,
    "color": true
  },
  "created_at": "...",
  "updated_at": "..."
}
```

## Resetear Onboarding (para testing)

Si necesitas volver a ver el onboarding durante las pruebas:

```javascript
// En consola del navegador
localStorage.removeItem('onboarding_completed');
location.reload();
```

## Comandos de Testing

### Verificar cuenta caniche2
```bash
run_verify.bat
```

O ejecuta:
```bash
cd C:\Users\USUARIO\Desktop\Portafolio\AdminG
venv\Scripts\python.exe verify_caniche2.py
```

Esto verificará:
- ✅ Email: caniche2@example.com
- ✅ Plan: AdminG_Basic
- ✅ Role: admin
- ✅ Tiene acceso a servicios

## Archivos Modificados

### Backend:
1. `app/core/features.py` - Corrección de permisos y límites por plan
2. `app/modules/services/router.py` - Verificación explícita de plan "free"

### Frontend:
1. `frontend-dist/js/views/OnboardingWizard.js` - **NUEVO** Wizard de configuración inicial
2. `frontend-dist/js/app.js` - Integración de onboarding en flujo de navegación

### Scripts:
1. `verify_caniche2.py` - Script de verificación de cuenta de prueba
2. `run_verify.bat` - Ejecutor del script de verificación

## Estado Actual

✅ Plan "free" bloqueado correctamente (solo lectura)
✅ Plan "basic" tiene más permisos que "free" (CRUD completo)
✅ Servicios bloqueados para plan "free"
✅ Onboarding obligatorio antes de dashboard
✅ Configuración de negocio capturada en onboarding
✅ Redirección automática según estado de onboarding

## Próximos Pasos (Backlog SERVICIOS_Y_HOMOGENEIZACION.md)

2. **Categorías Unificadas**: Crear sistema de categorías compartido entre servicios e inventario
3. **Integración Servicio-Inventario**: Vincular insumos por servicio
4. **Reportes por Servicio**: Servicios top, ingresos por servicio, márgenes
5. **Homogeneización UI**: Estandarizar alertas, tablas, botones
6. **Formato de Números**: COP currency formatting consistente

## Notas Importantes

- El onboarding **NO bloquea** a usuarios admin globales
- Se puede resetear onboarding con `localStorage.removeItem('onboarding_completed')`
- La configuración del negocio aún puede editarse desde el dashboard (para futura iteración)
- Los usuarios existentes que ya tenían acceso mantendrán localStorage limpio, por lo que verán el onboarding en su próximo login
