# ✅ Sprint 1: Facturación y Caja Base - Checklist

**Fecha inicio:** 3 de marzo de 2026  
**Fecha fin:** 10 de marzo de 2026  
**Objetivo:** Implementar IVA/retención en pagos y apertura/cierre de caja

---

## 🎯 User Stories del Sprint

### ✅ US-1.1: Cálculo IVA en pagos (5 pts)
**Branch:** `feature/facturacion-iva-retefuente`

#### Tasks Backend
- [ ] Actualizar `app/models/payment.py`:
  - [ ] Agregar `subtotal` (Numeric)
  - [ ] Agregar `iva_percentage` (Numeric, default 19)
  - [ ] Agregar `iva_amount` (Numeric)
  - [ ] Mantener `amount` como total final
  - [ ] Actualizar relación con `total = subtotal + iva_amount`

- [ ] Crear migración Alembic:
  ```bash
  alembic revision --autogenerate -m "add_iva_fields_to_payments"
  alembic upgrade head
  ```

- [ ] Actualizar `app/modules/payments/schemas.py`:
  - [ ] `PaymentCreate`: agregar `subtotal`, `iva_percentage`
  - [ ] `PaymentOut`: incluir todos los campos de IVA
  - [ ] Hacer `iva_percentage` opcional (default 19%)

- [ ] Modificar `app/modules/payments/router.py`:
  - [ ] En POST `/payments/`: calcular `iva_amount` = subtotal * (iva_percentage/100)
  - [ ] Calcular `amount` = subtotal + iva_amount
  - [ ] Validar que subtotal > 0

#### Tasks Frontend
- [ ] Actualizar `frontend-dist/js/views/OtherViews.js` (PaymentsView):
  - [ ] Formulario: cambiar campo "Monto" por "Subtotal"
  - [ ] Agregar select "IVA (%)" con opciones: 0%, 5%, 19%
  - [ ] Mostrar "IVA Calculado" (readonly)
  - [ ] Mostrar "Total a Pagar" (readonly)
  - [ ] Calcular en tiempo real al cambiar subtotal o %

- [ ] Actualizar tabla de pagos:
  - [ ] Columnas: Subtotal | IVA | Total
  - [ ] Formato moneda colombiana

#### Testing
- [ ] **Caso Feliz:** Crear pago subtotal $100,000 con 19% IVA → Total $119,000
- [ ] **Caso Sin IVA:** Crear pago subtotal $50,000 con 0% IVA → Total $50,000
- [ ] **Caso Error:** Intentar subtotal negativo → Error 400

---

### ✅ US-1.2: Recordatorio retención en la fuente (5 pts)
**Branch:** `feature/facturacion-iva-retefuente` (mismo)

#### Tasks Backend
- [ ] Actualizar `app/models/payment.py`:
  - [ ] Agregar `retencion_percentage` (Numeric, nullable)
  - [ ] Agregar `retencion_amount` (Numeric, nullable)
  - [ ] Agregar `requiere_retencion` (Boolean, computed)

- [ ] Migración Alembic (extender la anterior o crear nueva)

- [ ] Actualizar schemas en `payments/schemas.py`:
  - [ ] `PaymentCreate`: agregar campos opcionales de retención
  - [ ] `PaymentOut`: incluir campos de retención

- [ ] Modificar router POST `/payments/`:
  - [ ] Si `subtotal >= 1,000,000` → calcular retención automática
  - [ ] Porcentaje por defecto: 2.5% (configurable después)
  - [ ] `retencion_amount` = subtotal * (retencion_percentage/100)
  - [ ] `amount` = subtotal + iva_amount - retencion_amount

#### Tasks Frontend
- [ ] Componente de alerta en formulario de pago:
  - [ ] Si subtotal >= $1,000,000 → Mostrar banner amarillo
  - [ ] Texto: "⚠️ Esta transacción requiere retención en la fuente"
  - [ ] Input opcional: "% Retención" (default 2.5%)
  - [ ] Mostrar "Retención Calculada" (readonly)
  - [ ] Actualizar "Total Neto" = Subtotal + IVA - Retención

- [ ] En tabla de pagos:
  - [ ] Icono ⚠️ si tiene retención
  - [ ] Tooltip con detalle al pasar mouse

#### Testing
- [ ] **Umbral:** Pago $999,999 → NO muestra alerta
- [ ] **Umbral:** Pago $1,000,000 → SÍ muestra alerta
- [ ] **Cálculo:** Subtotal $2,000,000, IVA 19%, Ret 2.5% → Total correcto
- [ ] **Optional:** Permitir retención en pagos <$1M si usuario la activa manualmente

---

### ✅ US-2.1: Abrir caja con base inicial (5 pts)
**Branch:** `feature/caja-apertura-cierre`

#### Tasks Backend
- [ ] Crear modelo `app/models/cash_register_session.py`:
  ```python
  class CashRegisterSession(Base):
      __tablename__ = "cash_register_sessions"
      
      id: int (PK)
      user_id: int (FK users)
      status: str  # 'open', 'closed'
      opening_balance: Numeric  # Base inicial
      opening_date: DateTime
      closing_balance: Numeric (nullable)
      closing_date: DateTime (nullable)
      expected_cash: Numeric (nullable)
      actual_cash: Numeric (nullable)
      discrepancy: Numeric (nullable)
      notes: str (nullable)
  ```

- [ ] Migración Alembic:
  ```bash
  alembic revision --autogenerate -m "add_cash_register_sessions"
  ```

- [ ] Crear endpoint POST `/cashregister/open`:
  - [ ] Validar que NO haya sesión abierta del usuario
  - [ ] Crear nueva sesión con `opening_balance`
  - [ ] Guardar `opening_date` = now()
  - [ ] Estado = `open`
  - [ ] Retornar sesión creada

- [ ] Crear endpoint GET `/cashregister/session/current`:
  - [ ] Retornar sesión activa del usuario o `null`

- [ ] Modificar endpoint POST `/cashregister/transactions`:
  - [ ] Validar que exista sesión abierta
  - [ ] Si no existe → Error 400 "Debe abrir caja primero"
  - [ ] Asociar transacción a `session_id`

#### Tasks Frontend
- [ ] Actualizar `frontend-dist/js/views/OtherViews.js` (CashRegisterView):
  - [ ] Al cargar vista, llamar `/cashregister/session/current`
  - [ ] Si NO hay sesión abierta:
    - [ ] Mostrar banner: "Caja Cerrada 🔒"
    - [ ] Botón grande: "Abrir Caja"
    - [ ] Deshabilitar productos y carrito
  
  - [ ] Modal "Abrir Caja":
    - [ ] Input: "Base Inicial ($)" (requerido, min $0)
    - [ ] Textarea: "Notas de apertura" (opcional)
    - [ ] Botón: "Confirmar Apertura"
  
  - [ ] Si HAY sesión abierta:
    - [ ] Mostrar banner: "Caja Abierta ✅ | Base: $XXX | Apertura: HH:MM"
    - [ ] Habilitar todo

#### Testing
- [ ] **Abrir OK:** Usuario sin sesión puede abrir caja con $100,000
- [ ] **Doble apertura:** Intentar abrir caja 2 veces → Error
- [ ] **Venta sin caja:** Intentar vender con caja cerrada → Error 400
- [ ] **Ver sesión:** GET `/cashregister/session/current` retorna sesión activa

---

## 📋 Orden de Implementación Recomendado

1. **Día 1-2:** US-2.1 (Abrir caja) - Es bloqueante para US-1.1
2. **Día 3-4:** US-1.1 (IVA en pagos) - Base de facturación
3. **Día 5-6:** US-1.2 (Retención) - Complementa facturación
4. **Día 7:** Testing integral + ajustes + merge a `develop`

---

## 🚀 Comandos para Iniciar

```bash
# 1. Asegurar que develop esté actualizado
git checkout develop
git pull origin develop

# 2. Crear primer branch
git checkout -b feature/caja-apertura-cierre

# 3. Hacer primer commit (crear modelo)
# (trabajar en US-2.1)
git add app/models/cash_register_session.py
git commit -m "feat(caja): add CashRegisterSession model"

# 4. Cuando termines US-2.1, crear segundo branch desde develop
git checkout develop
git checkout -b feature/facturacion-iva-retefuente

# (trabajar en US-1.1 y US-1.2)
```

---

## ✅ Definition of Done - Sprint 1

- [ ] 3 User Stories completadas (15 pts)
- [ ] Migraciones de BD aplicadas sin errores
- [ ] Casos de test documentados y probados manualmente
- [ ] PRs creados con descripción clara
- [ ] Code review entre branches (si hay equipo)
- [ ] Merge a `develop` exitoso
- [ ] README actualizado con nuevos endpoints
- [ ] Demo funcional grabada (opcional)

---

## 📊 Tracking Diario

| Día | Tasks Completadas | Bloqueadores | Notas |
|-----|-------------------|--------------|-------|
| Lun | | | |
| Mar | | | |
| Mié | | | |
| Jue | | | |
| Vie | | | |
| Sáb | | | |
| Dom | Retrospectiva | | |

---

**¡Éxito en el Sprint 1! 🚀**
