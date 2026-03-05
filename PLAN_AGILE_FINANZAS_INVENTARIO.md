# 📋 Plan Agile: AdminG - Finanzas e Inventario Profesional

**Fecha de inicio:** 3 de marzo de 2026  
**Metodología:** Scrum con sprints de 1 semana  
**Objetivo:** Implementar sistema completo de facturación, caja profesional, inventario con servicios y reportes financieros

---

## 🎯 Estrategia de Branches (Git Workflow)

### Modelo Recomendado: **Feature Branch + GitFlow Simplificado**

```
main (producción estable)
  └─ develop (desarrollo integrado)
       ├─ feature/facturacion-iva-retefuente
       ├─ feature/caja-apertura-cierre
       ├─ feature/inventario-servicios-paquetes
       ├─ feature/stock-ventas-sincronizacion
       ├─ feature/reportes-financieros
       └─ feature/permisos-cancelar-pagos
```

### Reglas de Branches

1. **`main`**: Solo código probado y funcional en producción
2. **`develop`**: Integración continua de features completadas
3. **`feature/*`**: Un branch por épica/módulo
4. **Commits**: Convencionales (feat, fix, refactor, docs)
5. **Merge**: Solo con PR y revisión (al menos 1 aprobación)

### Ejemplo de Commits

```bash
git commit -m "feat(facturacion): add IVA calculation to payments schema"
git commit -m "fix(caja): resolve stock update on sale transactions"
git commit -m "refactor(reports): improve cash register dashboard query"
```

---

## 📦 Épicas y Backlog Priorizado

### **ÉPICA 1: Sistema de Facturación Completo** 
**Priority:** 🔴 ALTA | **Story Points:** 21

#### User Stories

**US-1.1: Como administrador, quiero calcular IVA automáticamente en pagos**
- **Criterios de Aceptación:**
  - [ ] Campo `iva_percentage` configurable (0%, 5%, 19%)
  - [ ] Campo `iva_amount` calculado automáticamente
  - [ ] Campo `subtotal` (monto sin IVA)
  - [ ] Campo `total` = subtotal + iva_amount
  - [ ] Migración de BD para nuevos campos
- **Tasks:**
  - Actualizar modelo `Payment` con campos de IVA
  - Crear migración Alembic
  - Actualizar schema Pydantic `PaymentCreate`
  - Implementar cálculo en endpoint POST `/payments/`
  - Actualizar frontend formulario de pago
- **Story Points:** 5
- **Branch:** `feature/facturacion-iva-retefuente`

**US-1.2: Como contador, necesito recordatorio de retención en la fuente para clientes aplicables**
- **Criterios de Aceptación:**
  - [ ] Campo `retencion_fuente` (opcional) en Payment
  - [ ] Validación si `amount >= 1,000,000` mostrar recordatorio
  - [ ] Campo `retencion_percentage` configurable
  - [ ] Campo `retencion_amount` calculado
  - [ ] Nota visual en UI "⚠️ Aplica retención"
- **Tasks:**
  - Agregar campos retención a modelo Payment
  - Implementar lógica de validación en backend
  - Crear componente visual de alerta en frontend
  - Actualizar vista de pagos con indicador
- **Story Points:** 5
- **Branch:** `feature/facturacion-iva-retefuente`

**US-1.3: Como usuario, quiero ver factura completa con totales, IVA y retención**
- **Criterios de Aceptación:**
  - [ ] Vista de detalle de pago muestra todos los campos
  - [ ] Formato: Subtotal + IVA + Retención = Total
  - [ ] Botón "Generar Factura PDF" (fase 2)
  - [ ] Historial de facturas en `/payments/`
- **Tasks:**
  - Crear componente `PaymentDetailModal`
  - Diseñar layout de factura
  - Implementar endpoint GET `/payments/{id}/invoice`
  - Integrar en lista de pagos
- **Story Points:** 8
- **Branch:** `feature/facturacion-iva-retefuente`

**US-1.4: Como administrador, quiero configurar tasas de IVA y retención desde el sistema**
- **Criterios de Aceptación:**
  - [ ] Configuración global en `/business/config` o `/settings/taxes`
  - [ ] Valores por defecto: IVA 19%, Retención 0%
  - [ ] Persistencia en BD (tabla `tax_config` o en `business_configurations`)
- **Tasks:**
  - Crear modelo `TaxConfiguration` (o extender BusinessConfiguration)
  - Migración de BD
  - Endpoint GET/PUT `/settings/taxes`
  - Vista de configuración en frontend (Admin Panel)
- **Story Points:** 3
- **Branch:** `feature/facturacion-iva-retefuente`

---

### **ÉPICA 2: Caja Registradora Profesional**
**Priority:** 🔴 ALTA | **Story Points:** 13

**US-2.1: Como cajero, quiero abrir caja con base inicial obligatoria**
- **Criterios de Aceptación:**
  - [ ] Estado de caja: `closed`, `open`
  - [ ] Campo `opening_balance` (base inicial)
  - [ ] Campo `opening_date` y `opening_user_id`
  - [ ] No permitir transacciones si caja está cerrada
  - [ ] Botón "Abrir Caja" en vista `/cashregister`
- **Tasks:**
  - Crear modelo `CashRegisterSession`
  - Migración con campos de apertura/cierre
  - Endpoint POST `/cashregister/open`
  - Middleware validación estado de caja
  - UI modal apertura con input de base
- **Story Points:** 5
- **Branch:** `feature/caja-apertura-cierre`

**US-2.2: Como cajero, quiero cerrar caja y generar reporte de cierre**
- **Criterios de Aceptación:**
  - [ ] Calcular total ventas + gastos + base
  - [ ] Campo `closing_balance` calculado
  - [ ] Campo `expected_cash` vs `actual_cash` (conteo físico)
  - [ ] Campo `discrepancy` = actual - expected
  - [ ] Reporte de cierre en PDF/pantalla
  - [ ] Caja queda en estado `closed`
- **Tasks:**
  - Endpoint POST `/cashregister/close`
  - Cálculo de balance esperado vs real
  - Modelo de reporte de cierre
  - UI modal cierre con input de conteo físico
  - Vista de histórico de cierres
- **Story Points:** 5
- **Branch:** `feature/caja-apertura-cierre`

**US-2.3: Como administrador, quiero ver histórico de aperturas/cierres de caja**
- **Criterios de Aceptación:**
  - [ ] Lista de sesiones de caja en `/cashregister/history`
  - [ ] Filtros por fecha, usuario, estado
  - [ ] Detalle de cada sesión (transacciones incluidas)
- **Tasks:**
  - Endpoint GET `/cashregister/sessions`
  - Vista de tabla con histórico
  - Modal de detalle de sesión
- **Story Points:** 3
- **Branch:** `feature/caja-apertura-cierre`

---

### **ÉPICA 3: Inventario con Servicios y Paquetes**
**Priority:** 🟡 MEDIA | **Story Points:** 13

**US-3.1: Como veterinario, quiero crear servicios (no solo productos físicos)**
- **Criterios de Aceptación:**
  - [ ] Campo `item_type` en `InventoryItem`: `product`, `service`, `package`
  - [ ] Servicios NO afectan stock
  - [ ] Productos SÍ afectan stock
  - [ ] Validación en ventas según tipo
- **Tasks:**
  - Actualizar modelo `InventoryItem` con `item_type`
  - Migración de BD
  - Lógica condicional en descuento de stock
  - Actualizar formulario de creación
  - Filtros por tipo en vista inventario
- **Story Points:** 5
- **Branch:** `feature/inventario-servicios-paquetes`

**US-3.2: Como administrador, quiero crear paquetes que combinen productos y servicios**
- **Criterios de Aceptación:**
  - [ ] Modelo `Package` con relación `package_items`
  - [ ] Tabla intermedia `package_inventory_items` (many-to-many)
  - [ ] Al vender paquete, descontar items individuales
  - [ ] Precio de paquete puede ser distinto a suma de partes (descuento)
- **Tasks:**
  - Crear modelo `Package` y relación
  - Migración de BD
  - Endpoint POST `/inventory/packages`
  - Endpoint GET `/inventory/packages`
  - UI para armar paquetes (selector de items)
  - Lógica de descuento de stock en paquetes
- **Story Points:** 8
- **Branch:** `feature/inventario-servicios-paquetes`

---

### **ÉPICA 4: Sincronización Ventas → Stock**
**Priority:** 🔴 ALTA | **Story Points:** 8

**US-4.1: Como inventarista, cuando se registra una venta, el stock debe descontarse automáticamente**
- **Criterios de Aceptación:**
  - [ ] Al crear transacción de caja tipo `sale` con items, descontar stock
  - [ ] Validar stock disponible antes de vender
  - [ ] Si stock insuficiente, mostrar error
  - [ ] Registrar movimiento en `inventory_movements`
  - [ ] Tipo de movimiento: `sale` (salida)
- **Tasks:**
  - Modificar endpoint POST `/cashregister/transactions`
  - Agregar campo `items` a `CashTransactionCreate` (array de {item_id, quantity})
  - Validar stock disponible
  - Actualizar `InventoryItem.stock`
  - Crear registro en `InventoryMovement`
- **Story Points:** 5
- **Branch:** `feature/stock-ventas-sincronizacion`

**US-4.2: Como administrador, quiero ver movimientos histórcos de inventario por ventas**
- **Criterios de Aceptación:**
  - [ ] En `/inventory/movements` filtrar por `movement_type = sale`
  - [ ] Relacionar movimiento con transacción de caja
  - [ ] Mostrar cliente, fecha, cantidad vendida
- **Tasks:**
  - Actualizar modelo `InventoryMovement` con `cash_transaction_id`
  - Migración de BD
  - Endpoint con filtros mejorados
  - Vista de movimientos en frontend
- **Story Points:** 3
- **Branch:** `feature/stock-ventas-sincronizacion`

---

### **ÉPICA 5: Reportes Financieros con Datos de Caja**
**Priority:** 🟡 MEDIA | **Story Points:** 13

**US-5.1: Como administrador, en Dashboard quiero ver resumen de caja (no solo pagos)**
- **Criterios de Aceptación:**
  - [ ] Widget "Ventas de Caja Hoy": suma de `cash_transactions` tipo `sale`
  - [ ] Widget "Gastos de Caja Hoy": suma tipo `expense`
  - [ ] Widget "Balance de Caja": ventas + base - gastos
  - [ ] Widget "Pagos Registrados Hoy": suma de `payments`
  - [ ] Comparar caja vs pagos (diferencias)
- **Tasks:**
  - Actualizar endpoint GET `/reports/dashboard`
  - Agregar queries de cash_transactions
  - Actualizar `DashboardView.js` con nuevos widgets
  - Diseño de tarjetas de métricas
- **Story Points:** 5
- **Branch:** `feature/reportes-financieros`

**US-5.2: Como contador, en Reportes quiero generar análisis financiero con caja incluida**
- **Criterios de Aceptación:**
  - [ ] Reporte "Flujo de Caja": ingresos (ventas) vs egresos (gastos)
  - [ ] Gráfico de líneas por día/semana/mes
  - [ ] Exportar a PDF/Excel (fase 2)
  - [ ] Filtros por rango de fechas
- **Tasks:**
  - Endpoint POST `/reports/cash-flow`
  - Lógica de agrupación por fecha
  - Integrar librería de gráficos (Chart.js ya existe)
  - Vista de reporte en frontend
- **Story Points:** 5
- **Branch:** `feature/reportes-financieros`

**US-5.3: Como administrador, quiero reporte de conciliación (Pagos vs Caja)**
- **Criterios de Aceptación:**
  - [ ] Tabla comparativa: Total Pagos vs Total Ventas Caja
  - [ ] Detectar discrepancias
  - [ ] Mostrar pagos SIN registro en caja
  - [ ] Mostrar ventas en caja SIN pago (ventas sin cliente)
- **Tasks:**
  - Endpoint GET `/reports/reconciliation`
  - Query que cruce `payments` y `cash_transactions`
  - UI de tabla comparativa
- **Story Points:** 3
- **Branch:** `feature/reportes-financieros`

---

### **ÉPICA 6: Permisos y Roles Refinados**
**Priority:** 🟢 BAJA | **Story Points:** 5

**US-6.1: Como administrador, solo usuarios con rol `manager` o `admin` pueden cancelar pagos**
- **Criterios de Aceptación:**
  - [ ] Endpoint DELETE `/payments/{id}` valida rol
  - [ ] Frontend oculta botón "Cancelar" si no es manager/admin
  - [ ] Mensaje de error si intentan sin permisos
  - [ ] Agregar feature `cancel_payments` a sistema de permisos
- **Tasks:**
  - Actualizar `plan_permissions.py` con `cancel_payments`
  - Middleware de validación en endpoint DELETE
  - Condicional en frontend según features del usuario
  - Testing de permisos
- **Story Points:** 3
- **Branch:** `feature/permisos-cancelar-pagos`

**US-6.2: Como administrador, quiero auditar quién canceló un pago**
- **Criterios de Aceptación:**
  - [ ] Campo `cancelled_by_user_id` en Payment
  - [ ] Campo `cancelled_at` timestamp
  - [ ] Historial de cancelaciones en reportes
- **Tasks:**
  - Actualizar modelo Payment
  - Migración BD
  - Registrar user_id en DELETE
  - Vista de auditoría en Admin Panel
- **Story Points:** 2
- **Branch:** `feature/permisos-cancelar-pagos`

---

## 📅 Planificación de Sprints

### **Sprint 1: Facturación y Caja Base** (Semana 1)
**Objetivo:** Implementar IVA/retención y apertura/cierre de caja

- ✅ US-1.1: Cálculo IVA en pagos (5 pts)
- ✅ US-1.2: Recordatorio retención (5 pts)
- ✅ US-2.1: Abrir caja (5 pts)

**Total:** 15 Story Points  
**Capacidad estimada:** 15-18 pts/sprint

---

### **Sprint 2: Inventario con Servicios** (Semana 2)
**Objetivo:** Separar productos de servicios y crear paquetes

- ✅ US-3.1: Servicios en inventario (5 pts)
- ✅ US-3.2: Paquetes combinados (8 pts)

**Total:** 13 Story Points

---

### **Sprint 3: Stock y Cierre de Caja** (Semana 3)
**Objetivo:** Sincronizar ventas con inventario y cerrar caja

- ✅ US-4.1: Descontar stock en ventas (5 pts)
- ✅ US-2.2: Cerrar caja con reporte (5 pts)
- ✅ US-4.2: Movimientos de inventario (3 pts)

**Total:** 13 Story Points

---

### **Sprint 4: Reportes Financieros** (Semana 4)
**Objetivo:** Dashboard y reportes con datos de caja

- ✅ US-5.1: Dashboard con caja (5 pts)
- ✅ US-5.2: Reporte flujo de caja (5 pts)
- ✅ US-1.3: Vista de factura completa (8 pts)

**Total:** 18 Story Points

---

### **Sprint 5: Permisos y Refinamientos** (Semana 5)
**Objetivo:** Permisos de cancelación y ajustes finales

- ✅ US-6.1: Permisos cancelar pagos (3 pts)
- ✅ US-6.2: Auditoría de cancelaciones (2 pts)
- ✅ US-2.3: Histórico de caja (3 pts)
- ✅ US-5.3: Reporte conciliación (3 pts)
- ✅ US-1.4: Configuración de tasas (3 pts)

**Total:** 14 Story Points

---

## 🔄 Definition of Done (DoD)

Cada User Story se considera completada cuando:

- ✅ **Código:** Implementado y funcional
- ✅ **Tests:** Al menos caso feliz y caso de error cubiertos
- ✅ **Migración BD:** Ejecutada y versionada en Alembic
- ✅ **Documentación:** Comentarios en código + README actualizado
- ✅ **Code Review:** Al menos 1 aprobación en PR
- ✅ **QA Manual:** Probado en entorno local
- ✅ **Merge:** Integrado a `develop` sin conflictos

---

## 🚨 Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Pérdida de contexto entre sprints | Media | Alto | Este documento + commits descriptivos + PRs con contexto |
| Conflictos de merge al integrar branches | Alta | Medio | Sync frecuente con `develop`, rebases pequeños |
| Cambios en BD rompen datos existentes | Media | Alto | Migraciones con `op.add_column` nullable, scripts de seed |
| Feature creep (agregar funciones no planeadas) | Alta | Medio | Backlog cerrado, nuevas ideas a Sprint 6+ |
| Testing insuficiente | Alta | Alto | Cada US incluye tests básicos en DoD |

---

## 📊 Tracking de Progreso

### Burndown Chart (actualizar semanalmente)

```
Story Points Restantes:
Sprint 1: [15 → 0]
Sprint 2: [13 → 0]
Sprint 3: [13 → ?]
Sprint 4: [18 → ?]
Sprint 5: [14 → ?]
```

### Velocity Actual
- Sprint 1: __ pts completados
- Sprint 2: __ pts completados
- **Velocity promedio:** Calcular después de Sprint 2

---

## 🛠️ Stack Técnico

**Backend:**
- FastAPI + SQLAlchemy
- Alembic (migraciones)
- Pydantic (schemas)

**Frontend:**
- Vanilla JS (ES6+)
- Componentes modulares
- Fetch API

**Base de Datos:**
- SQLite (desarrollo)
- PostgreSQL (producción - futuro)

---

## 📝 Comandos Útiles

### Git Workflow
```bash
# Crear feature branch
git checkout develop
git pull origin develop
git checkout -b feature/facturacion-iva-retefuente

# Durante desarrollo
git add .
git commit -m "feat(facturacion): add IVA fields to Payment model"
git push origin feature/facturacion-iva-retefuente

# Integrar a develop
git checkout develop
git merge feature/facturacion-iva-retefuente
git push origin develop

# Cerrar feature branch
git branch -d feature/facturacion-iva-retefuente
```

### Migraciones Alembic
```bash
# Crear migración automática
alembic revision --autogenerate -m "add_iva_retencion_to_payments"

# Aplicar migración
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Reiniciar BD (solo desarrollo)
```bash
python quick_reset.py
```

---

## 🎯 Meta Final

Al completar los 5 sprints (5 semanas), AdminG tendrá:

1. ✅ **Sistema de facturación completo** con IVA y retención
2. ✅ **Caja registradora profesional** con apertura/cierre
3. ✅ **Inventario multi-tipo** (productos, servicios, paquetes)
4. ✅ **Stock sincronizado** con ventas reales
5. ✅ **Reportes financieros** con datos de caja y pagos
6. ✅ **Permisos refinados** para operaciones críticas

**Resultado:** Sistema listo para negocios reales con contabilidad formal.

---

## 📌 Notas Importantes

- **Commits frecuentes:** Al menos 1 commit por task
- **PRs descriptivos:** Incluir capturas si cambia UI
- **No saltarse el DoD:** Asegura calidad y reduce bugs
- **Comunicación:** Si una tarea toma >2 días, dividir en subtasks
- **Retrospectiva:** Al final de cada sprint, documentar lecciones

---

**Última actualización:** 3 de marzo de 2026  
**Responsable:** Equipo AdminG  
**Próxima revisión:** Final de Sprint 1
