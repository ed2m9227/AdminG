# AdminG / AdminPro

> Sistema profesional de gestión empresarial para veterinarias, peluquerías, spas y fundaciones. Plataforma SaaS con autenticación JWT, sistema de planes escalables y control de acceso granular.

**Created by Eduardo and IA** | FastAPI + React + SQLAlchemy

---

## 🚀 Características

### Backend API (FastAPI)
- ✅ **Autenticación JWT** - Tokens seguros con refresh
- ✅ **Sistema de Planes** - 4 tiers con features/limits dinámicos
- ✅ **CRUD Completo** - Clientes, Citas, Servicios, Pagos
- ✅ **Inventario** - Gestión de SKU, stock mínimo (AdminPro)
- ✅ **Reportes** - Dashboard con métricas (AdminG Plus+)
- ✅ **Pagos** - Transacciones y upgrades (AdminPro Start+)
- ✅ **Base de datos** - SQLAlchemy + Alembic migrations
- ✅ **Tests** - pytest con 40+ tests unitarios

### Frontend (React + TypeScript)
- ✅ Dashboard responsivo con métricas en tiempo real
- ✅ Gestión de clientes con CRUD completo (Create, Read, Update, Delete)
- ✅ Autenticación con JWT tokens y localStorage
- ✅ Control de acceso según plan del usuario
- ✅ API client con axios interceptores
- ✅ State management con Zustand
- ✅ Styling con Tailwind CSS
- 🔄 Módulos en construcción: Citas, Inventario, Reportes, Pagos

---

## 📊 Planes y Precios

| Plan | Precio/mes | Usuarios | Sedes | Features Clave |
|------|------------|----------|-------|----------------|
| **AdminG Basic** | $5.000 | 1 | 1 | Clientes, Agenda, Recordatorios básicos |
| **AdminG Plus** | $30.000 | 3 | 1 | + Reportes detallados, Métricas avanzadas |
| **AdminPro Start** | $50.000 | 5 | 2 | + Inventario, Pagos, SMS, Multi-sede |
| **AdminPro Max** | $100.000 | 10 | 5 | + Contabilidad, API completa, Ilimitado |

### Límites por Plan
```
Basic:  500 citas/mes, 1GB storage
Plus:   2000 citas/mes, 5GB storage
Start:  5000 citas/mes, 25GB storage
Max:    100k citas/mes, 100GB storage
```

---

## 🛠️ Instalación

### Requisitos
- Python 3.13+
- Node.js 18+ (para frontend)
- SQLite (desarrollo) / PostgreSQL (producción)

### Backend Setup

```bash
# 1. Crear entorno virtual
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 4. Ejecutar migraciones
alembic upgrade head

# 5. Iniciar servidor
uvicorn app.main:app --reload
```

El servidor estará en `http://127.0.0.1:8000`  
Documentación API: `http://127.0.0.1:8000/docs`

### Frontend Setup (Próximamente)

```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Estructura del Proyecto

```
AdminG/
├── app/
│   ├── core/              # Configuración, seguridad, permisos
│   │   ├── config.py      # Variables de entorno
│   │   ├── security.py    # JWT, hash de contraseñas
│   │   ├── permissions.py # Control de acceso por rol
│   │   └── plan_permissions.py  # Control por plan
│   ├── db/                # Base de datos
│   │   ├── base.py        # Declarative Base
│   │   └── session.py     # Sesiones SQLAlchemy
│   ├── models/            # Modelos ORM
│   │   ├── user.py
│   │   ├── customer.py
│   │   ├── appointment.py
│   │   ├── plan.py
│   │   ├── inventory.py
│   │   ├── report.py
│   │   └── transaction.py
│   ├── modules/           # Módulos de negocio
│   │   ├── auth/          # Login, registro
│   │   ├── users/         # Gestión de usuarios
│   │   ├── customers/     # CRUD clientes
│   │   ├── appointments/  # CRUD citas
│   │   ├── plans/         # Sistema de planes
│   │   ├── inventory/     # Almacén (AdminPro)
│   │   ├── reports/       # Reportes (AdminG Plus+)
│   │   └── payments/      # Transacciones (AdminPro Start+)
│   ├── schemas/           # Pydantic schemas
│   └── main.py            # Punto de entrada FastAPI
├── alembic/               # Migraciones de BD
│   └── versions/          # 5 migraciones aplicadas
├── tests/                 # Suite de tests
│   ├── conftest.py        # Fixtures pytest
│   ├── test_auth.py
│   ├── test_customers.py
│   ├── test_inventory.py
│   ├── test_reports.py
│   └── test_payments.py
├── frontend/              # React app (próximamente)
├── requirements.txt       # Dependencias Python
└── README.md             # Este archivo
```

---

## 🔐 Autenticación

### Registro de Usuario

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "contraseña_segura"
}

Response:
{
  "email": "usuario@example.com",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Login

```bash
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=usuario@example.com&password=contraseña_segura

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Uso del Token

```bash
GET /customers/
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📡 API Endpoints

### Públicos (Sin autenticación)
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Inicio de sesión
- `GET /health` - Estado del servidor

### Protegidos (Requieren token)

**Usuarios**
- `GET /users/me` - Usuario actual
- `GET /users/` - Listar usuarios

**Clientes**
- `GET /customers/` - Listar clientes
- `POST /customers/` - Crear cliente
- `GET /customers/{id}` - Obtener cliente
- `PUT /customers/{id}` - Actualizar cliente
- `DELETE /customers/{id}` - Eliminar cliente

**Citas**
- `GET /appointments/` - Listar citas
- `POST /appointments/` - Crear cita
- `GET /appointments/{id}` - Obtener cita
- `PUT /appointments/{id}` - Actualizar cita
- `DELETE /appointments/{id}` - Eliminar cita

**Planes**
- `GET /plans/` - Listar todos los planes disponibles

**Inventario** _(Requiere AdminPro Start+)_
- `GET /inventory/categories` - Listar categorías
- `POST /inventory/categories` - Crear categoría
- `GET /inventory/items` - Listar items
- `POST /inventory/items` - Crear item
- `GET /inventory/items/low-stock` - Items bajo stock

**Reportes** _(Requiere AdminG Plus+)_
- `GET /reports/dashboard?days=30` - Dashboard (disponible para todos)
- `GET /reports/revenue` - Reporte de ingresos
- `GET /reports/appointments` - Reporte de citas

**Pagos** _(Requiere AdminPro Start+)_
- `GET /payments/transactions` - Historial de transacciones
- `POST /payments/transactions` - Crear transacción
- `POST /payments/upgrade-plan` - Actualizar plan
- `GET /payments/balance` - Balance de cuenta

---

## 🧪 Testing

```bash
# Ejecutar todos los tests
pytest tests/ -v

# Tests de un módulo específico
pytest tests/test_auth.py -v

# Con cobertura
pytest tests/ --cov=app --cov-report=html

# Tests de integración con plan-based access
pytest tests/test_inventory.py -v  # Valida AdminPro access
pytest tests/test_reports.py -v    # Valida AdminG Plus access
```

### Cobertura Actual
- ✅ Autenticación (login, registro, tokens)
- ✅ CRUD Clientes
- ✅ Plan-based access control
- ✅ Inventario (protección por plan)
- ✅ Reportes (métricas y filtros)
- ✅ Pagos (transacciones y upgrades)

---

## 🗄️ Base de Datos

### Migraciones

```bash
# Generar nueva migración
alembic revision --autogenerate -m "Descripción del cambio"

# Aplicar migraciones
alembic upgrade head

# Revertir última migración
alembic downgrade -1

# Ver historial
alembic history
```

### Migraciones Aplicadas
1. `427f65673004` - Inicial: users, customers, appointments, services, payments
2. `0ceb8e4c9f5f` - Plans, plan_limits, plan_features
3. `e8153f59fc49` - Inventory: categories, items
4. `124225b53a73` - Reports, transactions
5. `2dbe15fe74a2` - User.plan_id ForeignKey

### Modelo de Datos

**Users** → **Plans** (1:N)  
**Users** → **Customers** (1:N)  
**Customers** → **Appointments** (1:N)  
**Appointments** → **Services** (N:1)  
**Appointments** → **Payments** (1:N)  
**Plans** → **PlanFeatures** (1:N)  
**Plans** → **PlanLimits** (1:N)  
**Users** → **InventoryCategories** (1:N)  
**InventoryCategories** → **InventoryItems** (1:N)  
**Users** → **Transactions** (1:N)  

---

## 🔒 Seguridad

- **Contraseñas**: Bcrypt con salt
- **Tokens JWT**: HS256, expiración 60 minutos
- **Secret Key**: Variable de entorno (nunca en código)
- **SQL Injection**: Protegido por SQLAlchemy ORM
- **CORS**: Configurado para dominios específicos

---

## 🚀 Deploy

### Desarrollo
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Producción (Con Gunicorn)
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Docker (Próximamente)
```bash
docker-compose up -d
```

---

## 📚 Tecnologías

**Backend:**
- FastAPI 0.115.0 - Framework web moderno
- SQLAlchemy 2.0.36 - ORM
- Alembic 1.13.1 - Migraciones
- Pydantic 2.9.2 - Validación de datos
- python-jose 3.3.0 - JWT
- passlib + bcrypt - Hash de contraseñas
- pytest 7.4.0 - Testing

**Frontend (En desarrollo):**
- React 18
- TypeScript
- Tailwind CSS
- React Router
- Axios
- Zustand (state management)

---

## 📝 Próximas Features

- [ ] Frontend React completo
- [ ] Recordatorios por email/SMS
- [ ] Calendario interactivo
- [ ] Módulo de contabilidad
- [ ] API keys para integraciones
- [ ] Dashboard analytics avanzado
- [ ] Exportación de reportes (PDF/Excel)
- [ ] Modo multi-tenant
- [ ] Deploy en AWS/Azure
- [ ] Docker + Kubernetes

---

## 👨‍💻 Desarrollo

### Contribuir

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'Add: nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

### Código

- Seguir PEP 8 para Python
- Tests obligatorios para nuevas features
- Documentar funciones con docstrings
- Type hints en todas las funciones

---

## 📄 Licencia

Este proyecto es privado y confidencial.

---

## 📞 Contacto

**Eduardo** - Creador del proyecto  
GitHub: [Tu usuario]  
Email: [Tu email]

---

## 🎯 Roadmap 2026

**Q1 2026** ✅
- [x] Backend API completo
- [x] Sistema de autenticación
- [x] Plan-based access control
- [x] CRUD básico
- [x] Tests unitarios

**Q2 2026** 🔄
- [ ] Frontend React
- [ ] Dashboard analytics
- [ ] Módulo de pagos real (Stripe/MercadoPago)
- [ ] Deploy producción

**Q3-Q4 2026**
- [ ] App móvil (React Native)
- [ ] Integraciones (WhatsApp, Email)
- [ ] Reportes avanzados
- [ ] Multi-tenant architecture

---

**Made with ❤️ by Eduardo and IA**
