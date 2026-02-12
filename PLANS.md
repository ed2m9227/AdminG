# Sistema de Planes - AdminG / AdminPro

## Descripción

El sistema de planes divide las funcionalidades en 4 tiers de precios con límites y características específicas:

### Planes Disponibles

| Plan | Precio | Usuarios | Sedes | Citas/mes | Storage | Características |
|------|--------|----------|-------|-----------|---------|-----------------|
| **AdminG Basic** | $5,000 | 1 | 1 | 500 | 1GB | Clientes, Agenda, Recordatorios, Reportes Básicos |
| **AdminG Plus** | $30,000 | 3 | 1 | 2,000 | 5GB | + Reportes Avanzados |
| **AdminPro Start** | $50,000 | 5 | 2 | 5,000 | 25GB | + Inventario, SMS, Multi-sede |
| **AdminPro Max** | $100,000 | 10 | 5 | 100,000 | 100GB | + Contabilidad, API |

## Uso del API

### 1. Registrar usuario con plan

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "pass123",
  "role": "admin",
  "plan": "AdminG_Basic"
}
```

### 2. Login

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "pass123"
}
```

Retorna: `{"access_token": "...", "token_type": "bearer"}`

### 3. Usar token en requests

```bash
GET /customers/
Authorization: Bearer <token>
```

## Validación de Permisos por Plan

### Middleware: Verificar Feature

```python
from app.core.plan_permissions import check_feature_access

@router.get("/inventory")
def get_inventory(user=Depends(check_feature_access("inventory"))):
    # Solo accesible si el plan del usuario tiene "inventory" habilitada
    return {"inventory": []}
```

**Características disponibles:**
- `customers` - Gestión de clientes
- `appointments` - Agenda y citas
- `reminders` - Recordatorios automáticos
- `basic_reports` - Reportes básicos
- `advanced_reports` - Reportes avanzados
- `inventory` - Almacén/Inventario
- `accounting` - Contabilidad
- `sms_reminders` - Recordatorios por SMS
- `api` - Acceso a API

### Middleware: Verificar Límite

```python
from app.core.plan_permissions import check_plan_limit

@router.post("/appointments")
def create_appointment(payload: AppointmentCreate, user=Depends(check_plan_limit("max_appointments_per_month"))):
    # Valida si el usuario no ha alcanzado el límite
    return appointment
```

**Límites disponibles:**
- `max_users` - Máximo de usuarios
- `max_locations` - Máximo de sedes/locales
- `max_appointments_per_month` - Máximo de citas por mes
- `max_storage_gb` - Almacenamiento máximo en GB

## Endpoints de Planes

### Listar todos los planes

```bash
GET /plans/
```

Retorna lista de todos los planes con sus límites y características.

### Obtener plan por ID

```bash
GET /plans/{plan_id}
```

### Obtener plan por nombre

```bash
GET /plans/by-name/AdminG_Basic
```

## Flujo Completo (Ejemplo)

1. **Registrar usuario con plan AdminG_Basic:**
```bash
curl -X POST "http://127.0.0.1:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vet@example.com",
    "password": "secure123",
    "role": "admin",
    "plan": "AdminG_Basic"
  }'
```

2. **Login y obtener token:**
```bash
curl -X POST "http://127.0.0.1:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vet@example.com",
    "password": "secure123"
  }'
```

3. **Crear cliente (disponible en AdminG_Basic):**
```bash
curl -X POST "http://127.0.0.1:8000/customers/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Juan Pérez",
    "phone": "+56912345678",
    "email": "juan@example.com"
  }'
```

4. **Intentar acceder a inventario (NO disponible en AdminG_Basic):**
```bash
curl -X GET "http://127.0.0.1:8000/inventory" \
  -H "Authorization: Bearer <token>"
```
Retorna: `{"detail": "Feature 'inventory' not available in your plan 'AdminG Basic'"}`

## Estructura de Base de Datos

```
plans
├── id (PK)
├── name (AdminG_Basic, AdminG_Plus, AdminPro_Start, AdminPro_Max)
├── display_name
├── price
├── description
└── is_active

plan_limits
├── id (PK)
├── plan_id (FK)
├── limit_name (max_users, max_locations, etc)
└── limit_value

plan_features
├── id (PK)
├── plan_id (FK)
├── feature_code (inventory, accounting, etc)
├── feature_name
└── is_enabled
```

## Próximas Mejoras

- [ ] Actualizar plan de usuario (upgrade/downgrade)
- [ ] Endpoint para ver mi plan actual
- [ ] Alertas cuando se acerca al límite
- [ ] Bloqueo automático cuando se alcanza limite
- [ ] Webhook para cambios de plan
- [ ] UI de selección de planes
