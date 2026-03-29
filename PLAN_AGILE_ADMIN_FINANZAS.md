# 📋 PLAN AGILE - MÓDULO ADMIN & FINANZAS

**Fecha:** 2026-03-03  
**Objetivo:** Implementar sistema completo de facturación, caja, inventario y finanzas sin perder detalles  
**Metodología:** Scrum + Kanban híbrido  

---

## 1️⃣ ESTRATEGIA DE RAMAS GIT

### Recomendación: **Git Flow Modificado**

```
main (producción)
  ↓
develop (desarrollo)
  ├─ feature/caja-apertura-cierre
  ├─ feature/facturacion-iva-retenciones
  ├─ feature/stock-inventory-sync
  ├─ feature/paquetes-servicios
  ├─ feature/reportes-financieros
  └─ bugfix/dashboard-cash-movements
```

**Protocolo:**
1. Cada épica = 1 rama `feature/nombre`
2. Al terminar sprint = `Pull Request` a `develop`
3. Review obligatoria (checklist de pruebas)
4. Merge a `develop` solo si pasa tests
5. Al final del ciclo (cada 2 semanas) = release a `main`

**Beneficios:**
- ✅ Historial claro por módulo
- ✅ Fácil revertir si algo falla
- ✅ Desarrollo paralelo sin conflictos
- ✅ Deploy selectivo

---

## 2️⃣ ÉPICAS (Roadmap General)

### **ÉPICA 1: Sistema de Caja (Abrir/Cerrar)**  
*Dependencia base para ventas y gastos*

**Historias de Usuario:**
- [US-101] Como operador, puedo abrir caja con monto inicial
- [US-102] Como operador, veo balance en tiempo real
- [US-103] Como operador, puedo cerrar caja y ver reporte diario
- [US-104] Como admin, veo historial de aperturas/cierres

**Tareas:**
- [ ] Crear modelo `CashRegisterSession` (apertura/cierre)
- [ ] Endpoint `POST /cashregister/open` con validación
- [ ] Endpoint `POST /cashregister/close` con cuadratura
- [ ] Dashboard widget caja (estado actual, transacciones hoy)
- [ ] Validar: solo 1 caja abierta por usuario
- [ ] Tests unitarios

**Estimación:** 5 puntos | **Sprint:** 1-2

---

### **ÉPICA 2: Facturación + IVA + Retenciones**  
*Requisito legal para ventas profesionales*

**Historias de Usuario:**
- [US-201] Como vendedor, genero factura con IVA automático
- [US-202] Como admin, configuro % IVA por plan
- [US-203] Como consumidor, veo retención si aplica (persona jurídica)
- [US-204] Como vendedor, descargo PDF de factura

**Tareas:**
- [ ] Crear modelo `Invoice` (numero, fecha, items, IVA, retención)
- [ ] Crear tabla de configuración de IVA por plan
- [ ] Lógica: detectar tipo cliente (natural/jurídica)
- [ ] Endpoint `POST /invoices/generate` con cálculos
- [ ] Template HTML → PDF con pdfkit o reportlab
- [ ] Validar: invoice vinculada a payment
- [ ] Tests de cálculos IVA/retención

**Estimación:** 8 puntos | **Sprint:** 2-3

---

### **ÉPICA 3: Sincronización Stock (Venta → Inventario)**  
*Evitar sobreventa*

**Historias de Usuario:**
- [US-301] Como vendedor, cuando hago venta se desconté stock automático
- [US-302] Como vendedor, recibo alerta si stock < 5 unidades
- [US-303] Como admin, veo movimientos de stock (entrada/salida)

**Tareas:**
- [ ] Crear modelo `StockMovement` (tipo: venta/compra/ajuste, cantidad, referencia)
- [ ] Hook en `POST /cashregister/transactions` (sale) → descontar stock
- [ ] Endpoint `GET /inventory/items/:id/movements`
- [ ] Validar stock > 0 antes de venta
- [ ] Alert si stock bajo
- [ ] Reverse: si se cancela venta, restaurar stock
- [ ] Tests de integridad

**Estimación:** 5 puntos | **Sprint:** 2

---

### **ÉPICA 4: Paquetes de Servicios (Bundles)**  
*Combinar items de inventario como servicio*

**Historias de Usuario:**
- [US-401] Como admin, creo paquete "Baño + Corte + Cepillado"
- [US-402] Como vendedor, vendo paquete (descuento configurado)
- [US-403] Como admin, veo composición de paquete vendido

**Tareas:**
- [ ] Crear modelo `ServicePackage` (nombre, items[], precios, descuento)
- [ ] CRUD endpoints `/services/packages`
- [ ] Endpoint `POST /cashregister/transactions` aceptar package_id
- [ ] Descontar stock de c/item del paquete
- [ ] Registrar itemización en caja
- [ ] Tests

**Estimación:** 5 puntos | **Sprint:** 3

---

### **ÉPICA 5: Reportes Financieros (Dashboard + Analytics)**  
*Análisis profundo de flujo de caja*

**Historias de Usuario:**
- [US-501] Como admin, veo dashboard con: ingresos hoy, gastos, balance
- [US-502] Como admin, genero reporte período: ingresos/gastos/saldo
- [US-503] Como admin, veo gráficos de tendencia (últimos 30 días)
- [US-504] Como admin, filtro por: rango fecha, tipo pago, vendedor

**Tareas:**
- [ ] Endpoint `GET /reports/cashflow?start_date=&end_date=&group_by=day|week|month`
- [ ] Cálculos: ingresos_totales, gastos_totales, saldo, margen
- [ ] Endpoint `GET /reports/analytics` (gráficos)
- [ ] Query eficiente (agrupa en DB, no en memory)
- [ ] Frontend: gráficos con Chart.js o Plotly
- [ ] Export a CSV/Excel
- [ ] Tests de agregaciones

**Estimación:** 8 puntos | **Sprint:** 3-4

---

### **ÉPICA 6: Gestión de Permisos (Cancelar Pagos, Cierre Caja)**  
*Control de roles*

**Historias de Usuario:**
- [US-601] Como manager, puedo cancelar un pago (solo si es suyo)
- [US-602] Como admin, puedo cancelar cualquier pago
- [US-603] Come manager, solo puedo cerrar MI caja, no la de otros
- [US-604] Como manager, no puedo abrir caja de otro usuario

**Tareas:**
- [ ] Permiso: `can_cancel_payment` (solo admin/manager+owner)
- [ ] Permiso: `can_close_register` (managers + dueños)
- [ ] Validar en cada endpoint
- [ ] Feature flag por plan si es preciso
- [ ] Tests de autorización

**Estimación:** 3 puntos | **Sprint:** 2

---

## 3️⃣ PLANIFICACIÓN POR SPRINT

### **SPRINT 1 (Semana 1: Commit + Caja Base)**

**Objetivo:** Commit de cambios previos + abrir/cerrar caja funcional

**Tareas:**
1. Crear rama `develop` limpia
2. Hacer commit de fix anterior (Optional customer_id)
3. Crear modelo `CashRegisterSession`
4. Endpoints base: abrir/cerrar
5. Tests unitarios
6. Validar en postman

**Salida:** Rama `feature/caja-apertura-cierre` lista para revisar

**Riesgo:** Si no cierra bien → tira todo el flujo de pagos

---

### **SPRINT 2 (Semana 2: Facturación + Stock + Permisos)**

**Dependencias:** Sprint 1 ✓

**Tareas paralelas:**
- Equipo A: Facturación (IVA, retenciones, modelo Invoice)
- Equipo B: Stock sync (descontar en venta, alerts)
- Equipo C: Permisos (roles, validación, tests)

**Salida:** 3 ramas feature listas

**Riesgo:** Si stock no sincroniza → inconsistencias

---

### **SPRINT 3 (Semana 3: Servicios + Reportes Base)**

**Dependencias:** Sprint 1 + 2 ✓

**Tareas:**
- ServicePackage CRUD
- Reportes básicos (ingresos/gastos/saldo)
- Gráficos simples

**Salida:** 2 ramas feature

**Riesgo:** Reportes lentos si no optimizamos queries

---

### **SPRINT 4 (Semana 4: Pulido + Testing + Deploy)**

**Tareas:**
- Merge todas ramas a `develop`
- Testing integración completo
- Optimizaciones
- Fix bugs encontrados
- Release a `main`

---

## 4️⃣ TAREAS CHECKLIST (Detalladas por Módulo)

### **MÓDULO CAJA (Épica 1)**

- [ ] **Modelo:**
  - [ ] `CashRegisterSession(id, user_id, opened_at, closed_at, initial_amount, final_balance, notes, status)`
  - [ ] Relación con `CashTransaction`
  - [ ] Validación: solo 1 abierta por usuario

- [ ] **Backend:**
  - [ ] `POST /cashregister/open {initial_amount}` → crear sesión
  - [ ] `GET /cashregister/current` → sesión actual o null
  - [ ] `POST /cashregister/close {notes}` → cerrar, calcular balance
  - [ ] `GET /cashregister/history?limit=20` → historial

- [ ] **Frontend:**
  - [ ] Widget caja: "¿Abierta? Sí/No + Monto inicial + Balance"
  - [ ] Botón "Abrir" (modal con input monto)
  - [ ] Botón "Cerrar" (muestra cuadratura, confirma)
  - [ ] Historial de sesiones

- [ ] **Tests:**
  - [ ] Abrir caja sin otra abierta ✓
  - [ ] No permitir 2 cajas abiertas ✓
  - [ ] Cierre calcula balance correcto ✓

---

### **MÓDULO FACTURACIÓN (Épica 2)**

- [ ] **Configuración:**
  - [ ] Tabla `IVATaxConfig(plan, iva_percentage, effective_date)`
  - [ ] Tabla `CustomerType` (natural, jurídica, régimen)
  - [ ] Tabla `RetentionConfig(customer_type, retention_percentage, trigger_amount)`

- [ ] **Modelo Invoice:**
  - [ ] `Invoice(id, payment_id, invoice_number, issue_date, subtotal, iva_amount, retention_amount, total, pdf_url, status)`
  - [ ] Relación 1:1 con `Payment`
  - [ ] Secuencia numeración por usuario

- [ ] **Lógica Cálculos:**
  - [ ] Función `calculate_iva(amount, customer_type)` → iva_amount
  - [ ] Función `calculate_retention(amount, customer_type)` → retention_amount
  - [ ] Función `calculate_final_amount(subtotal, iva, retention)` → total neto

- [ ] **Backend:**
  - [ ] `POST /invoices/generate {payment_id}` → generar con cálculos
  - [ ] `GET /invoices/{id}` → datos
  - [ ] `GET /invoices/{id}/pdf` → descarga PDF
  - [ ] `PUT /invoices/{id}/send-email` → envía por correo

- [ ] **Frontend:**
  - [ ] Después de pago exitoso → opción "Descargar Factura"
  - [ ] Vista previa de factura (HTML)
  - [ ] Línea: Subtotal | IVA | Retención | Total

- [ ] **Tests:**
  - [ ] IVA calcula correcto (ej: 8% de $100 = $8) ✓
  - [ ] Retención aplica si cliente jurídico ✓
  - [ ] PDF genera sin errores ✓

---

### **MÓDULO STOCK (Épica 3)**

- [ ] **Modelo StockMovement:**
  - [ ] `StockMovement(id, item_id, type: sale|purchase|adjustment, quantity, reference_type, reference_id, timestamp)`
  - [ ] Índice: item_id + timestamp

- [ ] **Lógica:**
  - [ ] Trigger en `POST /cashregister/transactions (sale)` → descontar stock
  - [ ] Validar `item.stock >= quantity` antes de permitir venta
  - [ ] Registrar en `StockMovement` con `reference_id = transaction_id`

- [ ] **Backend:**
  - [ ] `GET /inventory/items/:id/current-stock` → cantidad disponible
  - [ ] `GET /inventory/items/:id/movements?limit=50` → historial movimientos
  - [ ] `GET /inventory/low-stock?threshold=5` → items bajo stock
  - [ ] `POST /inventory/items/:id/adjust {quantity, reason}` → ajuste manual (admin)

- [ ] **Frontend:**
  - [ ] Mostrar stock actual al lado del item en POS
  - [ ] Alert rojo si stock < 5
  - [ ] Tooltip: "Último movimiento: 3 ventas hoy" (últimas 3)
  - [ ] Bloquear venta si stock = 0

- [ ] **Tests:**
  - [ ] Venta descuenta stock ✓
  - [ ] Stock no puede ser negativo ✓
  - [ ] Movimientos se registran correctamente ✓
  - [ ] Cancelación de venta restaura stock ✓

---

### **MÓDULO SERVICIOS/PAQUETES (Épica 4)**

- [ ] **Modelo ServicePackage:**
  - [ ] `ServicePackage(id, user_id, name, description, items[{item_id, quantity}], discount_percentage, price, active, created_at)`
  - [ ] Relación M:N con `InventoryItem`

- [ ] **Backend:**
  - [ ] `GET /services/packages` → listar
  - [ ] `POST /services/packages` → crear
  - [ ] `PUT /services/packages/:id` → editar
  - [ ] `DELETE /services/packages/:id` → eliminar
  - [ ] Al vender paquete: descontar c/item automáticamente

- [ ] **Frontend:**
  - [ ] Sección "Paquetes" en POS
  - [ ] Combo: seleccionar paquete, ver composición
  - [ ] Mostrar desc % si aplica
  - [ ] Botón "Añadir al carrito"

- [ ] **Tests:**
  - [ ] Crear paquete con 3 items ✓
  - [ ] Venta de paquete descuenta stock c/item ✓
  - [ ] Descuento se aplica correctamente ✓

---

### **MÓDULO REPORTES (Épica 5)**

- [ ] **Queries Agregadas:**
  - [ ] `GET /reports/dashboard-summary?date=YYYY-MM-DD` → ingresos, gastos, saldo hoy
  - [ ] `GET /reports/cashflow?start=YYYY-MM-DD&end=YYYY-MM-DD&group_by=day` → serie temporal
  - [ ] `GET /reports/top-products?limit=10&days=30` → items más vendidos
  - [ ] `GET /reports/sales-by-payment-method` → gráfico pagos

- [ ] **Frontend:**
  - [ ] Dashboard: widgets con números grandes (ingresos, gastos, balance)
  - [ ] Gráfico línea: evolución últimos 30 días
  - [ ] Gráfico pastel: distribución por tipo pago
  - [ ] Tabla: últimas 20 transacciones
  - [ ] Filtros: rango fecha, vendedor

- [ ] **Exportación:**
  - [ ] Botón "Descargar CSV" → exporta reporte actual
  - [ ] Botón "Descargar PDF" → reporte formateado

- [ ] **Tests:**
  - [ ] Suma de ingresos correcta ✓
  - [ ] Filtro por fecha funciona ✓
  - [ ] CSV/PDF generan sin errores ✓

---

### **MÓDULO PERMISOS (Épica 6)**

- [ ] **Matriz de Permisos:**
  ```
  | Acción                 | Admin | Manager (owner) | Vendedor |
  |------------------------|-------|-----------------|----------|
  | Cancelar pago propio   | ✓     | ✓               | ✗        |
  | Cancelar pago de otro  | ✓     | ✗               | ✗        |
  | Abrir caja             | ✓     | ✓               | ✗        |
  | Cerrar MI caja         | ✓     | ✓               | ✗        |
  | Cerrar caja de otro    | ✓     | ✗               | ✗        |
  | Ver reportes           | ✓     | ✓ (solo suyo)   | ✗        |
  | Ajustar manualmente    | ✓     | ✗               | ✗        |
  ```

- [ ] **Backend:**
  - [ ] Middleware: `require_permission(action)` en cada endpoint
  - [ ] Validar: `user.id == resource.user_id OR user.role == 'admin'`
  - [ ] Retornar 403 con mensaje claro si deniega

- [ ] **Frontend:**
  - [ ] Ocultar botones si no tiene permisos
  - [ ] Mostrar tooltip: "Necesitas ser manager"

- [ ] **Tests:**
  - [ ] Manager no puede cancelar pago de otro ✓
  - [ ] Admin puede cancelar cualquiera ✓
  - [ ] Vendedor no ve reportes ✓

---

## 5️⃣ RIESGOS & MITIGACIÓN

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| Stock se desincroniza con caja | Alto | Tests automáticos, transacciones DB |
| IVA calcula mal | Crítico | Validar con CPA, unit tests exhaustivos |
| Reportes lentos con muchos datos | Alto | Índices, agregación en DB, caché |
| Cancelación de pago queda a mitad | Alta | Transacciones, rollback automático |
| Usuario olvida cerrar caja | Medio | Alerta si caja abierta >12h, dashboard visible |
| Concurrencia: 2 aperturas simultáneas | Alta | Unique constraint `(user_id, opened_at, status='open')` |

---

## 6️⃣ CHECKLIST DE REVISIÓN (Antes de Merge)

Para cada PR, verificar:

- [ ] Branch correcto (feature/*)
- [ ] Commits con mensajes descriptivos
- [ ] Tests pasan (coverage > 80%)
- [ ] No hay breaking changes
- [ ] Documentación API actualizada
- [ ] Approvals de 2 reviewers
- [ ] Pase pruebas manuales
- [ ] Base de datos migrada limpiamente
- [ ] Logs y errores claros
- [ ] Performance acceptable (< 500ms endpoints)

---

## 7️⃣ ESTIMACIÓN TOTAL

| Épica | Puntos | Sprints |
|-------|--------|---------|
| Caja | 5 | 1-2 |
| Facturación | 8 | 2-3 |
| Stock | 5 | 2 |
| Servicios | 5 | 3 |
| Reportes | 8 | 3-4 |
| Permisos | 3 | 2 |
| **TOTAL** | **34** | **4 sprints** |

**Velocidad:** 8-9 puntos/sprint → **4 semanas** de desarrollo.

---

## 8️⃣ COMANDOS GIT SETUP

```bash
# Crear rama develop desde main
git checkout main
git pull origin main
git checkout -b develop
git push origin develop

# Crear rama feature para cada épica
git checkout develop
git pull origin develop
git checkout -b feature/caja-apertura-cierre
# ... después de commits
git push origin feature/caja-apertura-cierre
# → Abrir PR en GitHub/GitLab → Review → Merge a develop

# Al final de Sprint 4: release a main
git checkout develop
git pull origin develop
git checkout main
git merge develop
git tag v1.0.0-admin-finanzas
git push origin main --tags
```

---

## 9️⃣ DETALLES OLVIDABLES (COPILOT CHECKLIST)

Para no perder nada:

- [ ] ¿Validación de entrada en todos los endpoints?
- [ ] ¿Índices DB para queries de reporting?
- [ ] ¿Auditoría de quién canceló qué pago/cierre?
- [ ] ¿Timezone handling (horas UTC vs local)?
- [ ] ¿Export de reportes en múltiples formatos?
- [ ] ¿Alertas en tiempo real (WebSocket) para balance negativo?
- [ ] ¿Versionamiento de facturas (PDF con timestamp)?
- [ ] ¿Rate limiting en endpoints de payment/cashregister?
- [ ] ¿Backup automático de datos diarios?
- [ ] ¿Logs de auditoría (quién, qué, cuándo, dónde)?

---

**Fin del Plan**  
Guardado en: `PLAN_AGILE_ADMIN_FINANZAS.md`
