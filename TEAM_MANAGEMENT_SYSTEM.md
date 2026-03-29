# Sistema de Gestión de Equipo - AdminG/AdminPro

## 📋 Resumen Ejecutivo

El sistema de gestión de equipo permite a los dueños de cuentas (veterinarias, spas, barberías, fundaciones, PHs) **crear cuentas secundarias para su personal** con acceso limitado a la plataforma.

## 🏗️ Arquitectura del Sistema

### 1. Tipos de Cuentas

#### **Cuenta Principal (Owner)**
- **Rol**: `user` (por defecto al registrarse)
- **Plan**: Free, Basic, Plus, Start o Max (según suscripción)
- **Permisos**: Acceso COMPLETO a todas las funciones de su plan
- **Capacidades**:
  - Ver, crear, editar y **ELIMINAR** clientes
  - Ver, crear, editar y **ELIMINAR** transacciones
  - Ver, crear, editar y **ELIMINAR** productos
  - Ver, crear, editar y **ELIMINAR** citas
  - Ver y exportar reportes
  - Gestionar caja registradora
  - **Crear, invitar y eliminar** miembros de equipo
  - **Ver todos los datos** de la cuenta

#### **Cuenta de Empleado (Team Member)**
- **Rol**: `viewer` o `team_member` (asignado por el owner)
- **Plan**: Heredan el plan del owner (no pagan suscripción propia)
- **Permisos**: Acceso LIMITADO según configuración
- **Capacidades**:
  - ✅ Ver clientes (solo lectura o edición según rol)
  - ✅ Crear citas
  - ✅ Registrar pagos
  - ✅ Ver inventario
  - ✅ Usar caja registradora
  - ❌ **NO pueden eliminar** clientes
  - ❌ **NO pueden eliminar** transacciones
  - ❌ **NO pueden eliminar** productos
  - ❌ **NO pueden ver reportes financieros** (solo owner)
  - ❌ **NO pueden gestionar equipo** (solo owner)
  - ❌ **NO pueden cambiar planes** (solo owner)

### 2. Modelo de Datos

```
users (Tabla Principal)
├── id (PK)
├── email
├── password (hasheado)
├── role ('user', 'viewer', 'admin')
├── plan ('free', 'basic', 'plus', 'start', 'max', 'admin')
├── parent_user_id (FK → users.id) ← CLAVE PARA JERARQUÍA
├── business_type
├── is_active
└── created_at

team_users (Tabla de Relaciones)
├── id (PK)
├── team_owner_id (FK → users.id) ← Owner principal
├── member_user_id (FK → users.id) ← Empleado
├── role_in_team ('viewer', 'editor', 'manager')
├── status ('active', 'invited', 'suspended')
├── joined_at
└── permissions_json (JSON con permisos granulares)
```

### 3. Flujo de Creación de Empleados

#### **Opción A: Invitar Usuario Existente**
```
1. Owner va a "Mi Equipo" en el sidebar
2. Click en "+ Invitar Miembro"
3. Ingresa email del empleado
4. Selecciona rol: Viewer (solo lectura) o Editor (puede modificar)
5. Sistema envía invitación
6. Empleado acepta y queda vinculado a la cuenta del owner
```

**Endpoint Backend**:
```
POST /admin/team/invite?email={email}&role={role}
```

#### **Opción B: Crear Usuario Directamente**
```
1. Owner va a "Mi Equipo"
2. Click en "+ Crear Usuario"
3. Ingresa email y password temporal para el empleado
4. Selecciona rol
5. Sistema crea cuenta inmediatamente
6. Owner comparte credenciales con empleado
```

**Endpoint Backend**:
```
POST /admin/team/create?email={email}&password={password}&role={role}
```

### 4. Restricciones por Plan

| Plan | Límite de Empleados | Funciones Compartidas |
|------|---------------------|----------------------|
| **Free** | 0 (solo owner) | N/A |
| **Basic** | 3 empleados | Clientes, Citas, Pagos |
| **Plus** | 5 empleados | + Reportes básicos |
| **Start** | 15 empleados | + Inventario, Reportes avanzados |
| **Max** | 100 empleados | + Todas las funciones |

### 5. Aislamiento de Datos (Multi-Tenancy)

**Regla Crítica**: Los empleados **SOLO pueden ver y modificar datos de su cuenta owner**, NUNCA de otras cuentas.

#### Implementación Técnica:
```python
# Cada registro tiene user_id que apunta al OWNER
customers
├── id
├── user_id (FK → users.id del OWNER, no del empleado)
├── full_name
├── ...

# Al crear/leer datos:
def get_customers(db: Session, current_user: User):
    # Si es empleado, buscar su owner
    owner_id = current_user.parent_user_id or current_user.id
    
    return db.query(Customer).filter(
        Customer.user_id == owner_id
    ).all()
```

### 6. Permisos Granulares

```json
{
  "permissions": {
    "customers": {
      "view": true,
      "create": true,
      "edit": true,
      "delete": false  // ← Empleados NO pueden eliminar
    },
    "appointments": {
      "view": true,
      "create": true,
      "edit": true,
      "delete": false
    },
    "payments": {
      "view": true,
      "create": true,
      "edit": false,    // ← Solo crear, no modificar
      "delete": false
    },
    "inventory": {
      "view": true,
      "create": false,   // ← Solo owner crea productos
      "edit": true,      // ← Puede ajustar stock
      "delete": false
    },
    "reports": {
      "view": false,     // ← Solo owner ve reportes
      "export": false
    },
    "cashregister": {
      "use": true,       // ← Puede usar caja
      "close_day": false // ← Solo owner cierra el día
    },
    "team": {
      "view": false,     // ← No puede ver otros empleados
      "manage": false    // ← No puede crear/eliminar empleados
    }
  }
}
```

## 🎯 Casos de Uso Reales

### **Caso 1: Veterinaria con 2 veterinarios**

**Owner (Dr. Juan)**:
- Plan: AdminPro Start ($29/mes)
- Crea 2 cuentas para sus veterinarios asistentes
- Permiso viewer: Pueden ver clientes, crear citas, registrar pagos
- **NO pueden**: Eliminar clientes, ver reportes financieros, gestionar equipo

**Flujo Diario**:
1. Owner revisa reportes en la mañana
2. Asistente 1 registra nueva cita para cliente
3. Asistente 2 cobra servicio y registra pago en caja
4. Owner cierra caja al final del día y ve reporte de ingresos

### **Caso 2: Spa de uñas con 5 manicuristas**

**Owner (María)**:
- Plan: AdminG Plus ($19/mes)
- Crea 5 cuentas para sus manicuristas
- Permiso editor: Pueden crear/editar citas, ver clientes, usar caja
- **NO pueden**: Ver reportes de ganancias, eliminar historial

**Flujo Diario**:
1. Cliente llama, Manicurista 1 crea cita desde su cuenta
2. Cliente llega, Manicurista 2 cobra servicio en caja registradora
3. Owner revisa al final del día cuánto generó cada manicurista

### **Caso 3: Barbería con 3 barberos**

**Owner (Carlos)**:
- Plan: AdminG Basic ($9/mes)
- Crea 3 cuentas para barberos
- Permiso viewer: Solo ver clientes y crear citas (no acceso a pagos)
- Owner maneja todos los pagos personalmente

## 🔐 Seguridad

### Validaciones Backend:
```python
def require_owner(current_user: User):
    """Solo owners pueden ejecutar acciones sensibles"""
    if current_user.parent_user_id is not None:
        raise HTTPException(
            status_code=403,
            detail="Solo el dueño de la cuenta puede realizar esta acción"
        )

@router.delete("/customers/{id}")
async def delete_customer(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_owner(current_user)  # ← Bloquea si es empleado
    # ... resto del código
```

### Validaciones Frontend:
```javascript
// En beforeNavigate hook
const user = authService.getCurrentUser();
if (user.parent_user_id) {
    // Es empleado - ocultar opciones de owner
    hideDeleteButtons();
    hideReportsMenu();
    hideTeamManagement();
}
```

## 📊 Dashboard para Empleados vs Owners

### **Dashboard Owner**:
```
┌────────────────────────────────────┐
│ Dashboard                          │
├────────────────────────────────────┤
│ Clientes Totales: 152              │
│ Citas Hoy: 8                       │
│ Ingresos Mes: $4,250               │ ← Solo owner
│ Productos: 45                      │
├────────────────────────────────────┤
│ Mi Plan: AdminPro Start            │
│ Equipo: 3/15 miembros             │
│ Clientes: Ilimitados               │
└────────────────────────────────────┘
```

### **Dashboard Empleado**:
```
┌────────────────────────────────────┐
│ Dashboard                          │
├────────────────────────────────────┤
│ Clientes Totales: 152              │
│ Citas Hoy: 8                       │
│ Mis Citas Hoy: 3                   │ ← Filtradas por empleado
│ [Ingresos ocultos]                 │
├────────────────────────────────────┤
│ Mi Rol: Empleado (Viewer)          │
│ Cuenta de: DrJuan Veterinaria      │ ← Muestra a qué cuenta pertenece
└────────────────────────────────────┘
```

## 🚀 Próximos Pasos de Implementación

### **Fase 1: MVP (Ya implementado)**
- ✅ Modelo de base de datos (users.parent_user_id, team_users)
- ✅ Endpoints de creación (/team/create, /team/invite)
- ✅ Vista de gestión de equipo en frontend
- ✅ Sistema de permisos básico (roles)

### **Fase 2: Refinamiento (Pendiente)**
- [ ] Permisos granulares por módulo
- [ ] Dashboard diferenciado para empleados
- [ ] Tracking de acciones por empleado (auditoría)
- [ ] Notificaciones de invitación por email
- [ ] Sistema de aprobación de eliminaciones (requiere aprobación del owner)

### **Fase 3: Features Avanzadas (Futuro)**
- [ ] Comisiones por empleado (% de ventas)
- [ ] Horarios de trabajo por empleado
- [ ] Reportes individuales de desempeño
- [ ] Sistema de turnos y disponibilidad
- [ ] App móvil para empleados

## 📝 FAQ

**P: ¿Los empleados pagan suscripción?**
R: NO. Solo el owner paga. Los empleados "heredan" el plan del owner.

**P: ¿Cuántos empleados puedo tener?**
R: Depende del plan: Basic (3), Plus (5), Start (15), Max (100).

**P: ¿Los empleados ven datos de otros clientes de AdminG?**
R: NO. Cada cuenta está completamente aislada (multi-tenancy por user_id).

**P: ¿Un empleado puede tener acceso a múltiples negocios?**
R: SÍ. Un mismo email puede ser empleado de varios owners (

usando team_users).

**P: ¿Cómo elimino un empleado?**
R: Owner va a "Mi Equipo" → botón "Remover" → confirma eliminación.

**P: ¿Qué pasa si el owner cambia de plan?**
R: Los empleados automáticamente pierden/ganan acceso según nuevas funciones del plan.

**P: ¿Puedo dar permiso a un empleado para ver reportes?**
R: En la Fase 2 sí (permisos granulares). Por ahora solo owners ven reportes.

## 🎨 Consideraciones de UX

1. **Indicador visual**: Empleados ven badge "Empleado de {Owner}" en header
2. **Sidebar simplificado**: Ocultar automáticamente módulos sin permiso
3. **Botones deshabilitados**: Mostrar botón de eliminar  pero deshabilitado con tooltip "Solo el dueño puede eliminar"
4. **Mensajes claros**: "No tienes permiso para ver reportes. Contacta al dueño de la cuenta."

---

**Última actualización**: 19 Feb 2026  
**Versión**: 1.0  
**Estado**: En producción (MVP)
