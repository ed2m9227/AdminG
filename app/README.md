# AdminG / AdminPro

Sistema profesional de administración para veterinarias, peluquerías, spas y fundaciones con autenticación JWT, gestión de planes y control de acceso basado en roles.

## Estado del Proyecto

✅ **Base de datos** con SQLAlchemy + Alembic  
✅ **Autenticación JWT** con usuario/contraseña  
✅ **Sistema de planes** (AdminG Basic/Plus, AdminPro Start/Max)  
✅ **Gestión de clientes** y citas  
✅ **Control de acceso** por plan y características  

## Características Principales

### 🔐 Autenticación
- JWT con email y contraseña
- Roles: admin, staff, viewer
- Planes con límites y características

### 👥 Gestión de Usuarios
- Registro y login
- Asignación de planes
- Control de acceso basado en plan

### 📅 Agenda y Clientes
- CRUD de clientes
- CRUD de citas
- Asociación cliente-cita

### 💳 Sistema de Planes (Mixto)
| Plan | Precio | Usuarios | Sedes | Características |
|------|--------|----------|-------|-----------------|
| AdminG Basic | $5k | 1 | 1 | Clientes, Agenda, Recordatorios |
| AdminG Plus | $30k | 3 | 1 | + Reportes Avanzados |
| AdminPro Start | $50k | 5 | 2 | + Inventario, SMS |
| AdminPro Max | $100k | 10 | 5 | + Contabilidad, API |

## Instalación

### Requisitos
- Python 3.13+
- SQLite (por defecto) o PostgreSQL

### Pasos

1. **Clonar repo y crear venv:**
```bash
python -m venv venv
source venv/Scripts/activate  # Windows
```

2. **Instalar dependencias:**
```bash
pip install -r app/requirements.txt
```

3. **Aplicar migraciones:**
```bash
alembic upgrade head
```

4. **Ejecutar servidor:**
```bash
uvicorn app.main:app --reload
```

La API estará en: `http://127.0.0.1:8000`

## Documentación Interactiva

- **Swagger UI:** http://127.0.0.1:8000/docs
- **ReDoc:** http://127.0.0.1:8000/redoc

## Uso Rápido

### 1. Registrarse
```bash
POST /auth/register
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
{
  "email": "user@example.com",
  "password": "pass123"
}
```

### 3. Crear cliente
```bash
POST /customers/
Authorization: Bearer <token>
{
  "full_name": "Juan Pérez",
  "phone": "+1234567890",
  "email": "juan@example.com"
}
```

### 4. Ver planes disponibles
```bash
GET /plans/
```

## Endpoints Principales

### Autenticación
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Login y obtener JWT token

### Clientes
- `GET /customers/` - Listar clientes
- `POST /customers/` - Crear cliente
- `GET /customers/{id}` - Obtener cliente
- `PUT /customers/{id}` - Actualizar cliente
- `DELETE /customers/{id}` - Eliminar cliente

### Citas
- `GET /appointments/` - Listar citas
- `POST /appointments/` - Crear cita
- `GET /appointments/{id}` - Obtener cita
- `PUT /appointments/{id}` - Actualizar cita
- `DELETE /appointments/{id}` - Eliminar cita

### Planes
- `GET /plans/` - Listar todos los planes
- `GET /plans/{id}` - Obtener plan por ID
- `GET /plans/by-name/{name}` - Obtener plan por nombre

### Health Check
- `GET /health` - Estado de la API

## Estructura de Directorios

```
app/
├── core/
│   ├── config.py           # Variables de entorno
│   ├── security.py         # JWT y password hashing
│   ├── permissions.py      # Validación de permisos por rol
│   └── plan_permissions.py # Validación de permisos por plan
├── db/
│   ├── base.py            # Base de SQLAlchemy
│   └── session.py         # Sesión y conexión a BD
├── models/
│   ├── user.py            # Modelo de usuario
│   ├── customer.py        # Modelo de cliente
│   ├── appointment.py     # Modelo de cita
│   ├── service.py         # Modelo de servicio
│   ├── payment.py         # Modelo de pago
│   └── plan.py            # Modelos de plan
├── modules/
│   ├── auth/              # Autenticación
│   ├── users/             # Gestión de usuarios
│   ├── customers/         # Gestión de clientes
│   ├── appointments/      # Gestión de citas
│   └── plans/             # Gestión de planes
├── schemas/               # Pydantic schemas
└── main.py               # App FastAPI

alembic/                  # Migraciones de BD
```

## Migraciones

### Ver estado actual
```bash
alembic current
```

### Crear nueva migración
```bash
alembic revision --autogenerate -m "Descripcion del cambio"
```

### Aplicar migraciones
```bash
alembic upgrade head
```

### Revertir última migración
```bash
alembic downgrade -1
```

## Variables de Entorno

Crear `.env` en la raíz:
```env
SECRET_KEY=tu_clave_secreta_aqui
DATABASE_URL=sqlite:///./app.db
ALGORITHM=HS256
ACCES_TOKEN_EXPIRE_MINUTES=60
```

## Próximos Pasos

1. [ ] Inventario/Almacén
2. [ ] Reportes y análisis
3. [ ] SMS y recordatorios
4. [ ] Contabilidad e ingresos
5. [ ] Gestión de personal
6. [ ] Integración de pagos
7. [ ] Frontend (React/Vue)
8. [ ] Documentación de responsabilidad

## Notas de Desarrollo

- BD en SQLite por defecto (fácil para desarrollo)
- Usar Alembic siempre para cambios de BD
- Los planes se seedean automáticamente al startup
- JWT expira en 60 minutos (configurable)

## Soporte

Para dudas o issues, contactar a: [tu email]
