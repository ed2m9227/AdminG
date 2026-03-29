# Análisis Arquitectónico: Consolidación de Módulos

**Fecha**: 18 Marzo 2026  
**Propósito**: Identificar redundancias y proponer una arquitectura mejorada para AdminG

---

## 1. ANÁLISIS: PAGOS vs CAJA (¿Redundancia?)

### Estado Actual

#### **PAGOS** (`/payments`)
```
├─ Registro de transacciones individuales
├─ Campos: customer_id, service_id, appointment_id, service_package_id
├─ Monto: amount, discount_amount, final_amount
├─ Campo "concept" (texto libre descripto)
├─ Status: pending/completed
└─ Métodos: cash, card, transfer, montelibano_gen
```

#### **CAJA** (`/cashregister`)
```
├─ Sesiones con apertura/cierre
├─ Tipos: sale, expense, base
├─ Mismo tipo de datos que Payments
├─ Movimientos agrupados por sesión
└─ Cálculos: balance, sales, expenses
```

#### **FACTURAS** (`/invoices`)
```
├─ Documento formal con NRO secuencial
├─ InvoiceItems (productos/servicios desagregados)
├─ Cálculos: subtotal, IVA, retención
├─ Vinculación opcional a Payment (1:1)
└─ Status: issued, paid, cancelled, void
```

### Diagnóstico: SÍ HAY REDUNDANCIA

| Aspecto | Pagos | Caja | Problema |
|---------|-------|------|----------|
| **Registra transacciones** | ✓ | ✓ | Duplicación de datos |
| **Tracking individual** | ✓ | ✓ | Inconsistencia |
| **Concepto desagregado** | ✓ (texto) | ✓ (descripción) | No referencia items |
| **Sesiones** | ✗ | ✓ | Caja es más "sesionada" |
| **Documentación** | ✗ | ✗ | **FALTA**: No hay documento legal |

### **PROPUESTA DE CONSOLIDACIÓN**

#### **Opción A: Jerarquía Clara** (RECOMENDADA)
```
FACTURA (documento legal)
  ├─ InvoiceItem[] (detalle de items/servicios)
  └─ Pagos[] (múltiples pagos contra la factura)
      └─ CashRegisterSession (si es en caja)
```

**Ventajas:**
- Una factura puede tener múltiples pagos (parciales)
- Pagos sin factura quedan como "transacciones informales"
- Caja solo agrupa pagos, no duplica

**Cambios requeridos:**
1. Payment → `invoice_id` (ForeignKey a Invoice)
2. CashTransaction → `payment_id` (ForeignKey a Payment)
3. Eliminar campo `concept` de Payments (usar Invoice.items en su lugar)

#### **Flujo Propuesto**:
```
Caso 1: Cliente paga servicio formal
─────────────────────────────────────
1. Create Factura
   ├─ InvoiceItem: "Corte de cabello" (service_id)
   ├─ InvoiceItem: "Tinte" (service_id)
   └─ Total: 150,000 COP

2. Create Pago
   ├─ invoice_id: 5
   ├─ amount: 150,000
   └─ method: cash

3. [Opcional] CashRegisterSession
   ├─ session_id: 12
   └─ Agrupa múltiples pagos de hoy


Caso 2: Transacción informal (sin factura)
──────────────────────────────────────────
1. Create Pago [SIN invoice_id]
   ├─ customer_id: 3
   ├─ amount: 50,000
   ├─ method: cash
   └─ concept: "Consulta telefónica"  [TEMPORAL]

2. [Opcional] CashRegisterSession
   └─ Agrupa movimientos informales
```

---

## 2. IMPLEMENTACIÓN: INVENTARIO EN FACTURAS

### Estado Actual
- `InvoiceItem` tiene referencias opcionales:
  - `inventory_item_id` → InventoryItem (productos)
  - `service_id` → Service (servicios)

- **PROBLEMA**: Cuando creas factura, no descargas inventario

### Propuesta: Desagregación Automática

#### **Modelo Mejorado:**
```python
class InvoiceItem(Base):
    # Existente
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    description = Column(String(255))
    quantity = Column(Numeric(10, 2))
    unit_price = Column(Numeric(10, 2))
    
    # NUEVO: Rastreo de origen
    source_type = Column(String(20))  # 'product', 'service', 'custom'
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)
    
    # NUEVO: Trazabilidad
    batch_number = Column(String(50), nullable=True)  # Para productos con lote
    serial_number = Column(String(50), nullable=True)  # Para productos serializados
    document_qr_id = Column(Integer, ForeignKey("document_qrs.id"), nullable=True)
```

#### **Lógica de Creación:**
```python
# Al crear factura, user selecciona items:
Factura.crear({
  items: [
    {type: 'service', service_id: 5, quantity: 1},      # Corte
    {type: 'product', inventory_item_id: 12, quantity: 2}, # Champu x2
    {type: 'custom', description: 'Extras', amount: 10000}
  ]
})

# Sistema automáticamente:
1. Busca precios en Service o InventoryItem
2. Calcula subtotal
3. Aplica IVA según type (servicios: 0%, productos: 19%)
4. Genera InvoiceItems con references
5. [NUEVO] Descarga inventario si es producto
6. [NUEVO] Genera DocumentQR asociado
```

#### **Desagregación de Inventario:**
```python
@router.post("/invoices/generate")
async def generate_invoice(invoice_data, db):
    factura = Invoice.create(...)
    
    # Por cada item de producto
    for item in invoice.items:
        if item.source_type == 'product':
            # Descarga inventario
            inventory = InventoryItem.get(item.inventory_item_id)
            inventory.quantity -= item.quantity
            
            # Registra movimiento
            InventoryMovement.create({
                item_id: inventory.id,
                type: 'salida',
                quantity: item.quantity,
                reason: f'Invoice #{factura.invoice_number}'
            })
```

#### **Descarga en CashRegister (POS):**
```python
# Caso: Cliente compra en caja
cashregister_transaction = {
    items: [
        {inventory_item_id: 5, quantity: 2},  # Producto
        {service_id: 8, quantity: 1}          # Servicio
    ]
}

# Sistema:
1. Crea factura simple (sin número formal si es < 500k)
2. Desagrega items
3. Descarga inventario para productos
4. Registra pago
5. Agrupa en sesión de caja
```

---

## 3. CAMBIO: PAGOS CON ITEMS EN DROPDOWN

### Estado Actual
```
Pago {
  customer_id: 3,
  concept: "Corte + tinte + extras",  ← PROBLEMA: texto libre
  amount: 150,000,
  method: 'cash'
}
```

### Propuesta: Referenciar Items de Factura

#### **Nuevo Schema:**
```python
class PaymentCreate(BaseModel):
    customer_id: int
    invoice_id: int | None = None  # Vincular a factura
    
    # OPCIÓN A: Pago completo de factura
    # OPCIÓN B: Pago parcial
    amount: Decimal
    
    # NUEVO: Items específicos [si no hay factura]
    payment_items: List[PaymentItemCreate] | None = None
    # [{
    #   'type': 'service|product|custom',
    #   'service_id|inventory_item_id|description': ...,
    #   'quantity': 1,
    #   'unit_price': 50000
    # }]
    
    method: str  # cash, card, transfer, etc
    status: str = 'completed'

class PaymentItem(Base):
    payment_id = ForeignKey('payments.id')
    type = Column(String(20))  # service, product, custom
    source_id = Column(Integer)  # service_id o inventory_item_id
    description = Column(String)
    quantity = Column(Numeric)
    unit_price = Column(Numeric)
```

#### **Flujo Frontend:**

```javascript
// Modal de Pago Mejorado:
<form>
  <select name="invoice_id">
    <option>-- Crear pago sin factura --</option>
    <option value="5">Fac-2024-00005 - Cliente: Juan</option>
    <option value="6">Fac-2024-00006 - Cliente: María</option>
  </select>
  
  <!-- SI selecciona factura -->
  <div id="invoiceItems">
    [Servicios/Productos de la factura con checkboxes]
  </div>
  
  <!-- SI NO selecciona factura -->
  <div id="manualItems">
    <button>+ Agregar Item</button>
    <!-- Dropdown: Servicios, Productos, o Descripción -->
    <select>
      <optgroup label="Servicios">
        <option value="service:5">Corte (30,000)</option>
      </optgroup>
      <optgroup label="Productos">
        <option value="product:12">Champu (25,000)</option>
      </optgroup>
      <optgroup label="Otros">
        <option value="custom:0">Descripción personalizada</option>
      </optgroup>
    </select>
  </div>
</form>
```

#### **Eliminación de "concept":**
- Deprecated: `payment.concept`
- New: `payment.payment_items[]` → Desagregación
- Auto-generate: `concept = "Pago #{id}: " + items.map(i => i.description).join(" + ")`

---

## 4. DOCUMENTOS Y TRAZABILIDAD QR

### Contexto Normativo Colombia

**Regulaciones aplicables:**
- Decreto 1929/2019: Facturación electrónica
- Resolución DIAN 000042: Factura electrónica
- NIT, RUT como documentos de identificación
- Retención en la fuente (2%, 8%, variable según actividad)

### Propuesta: Sistema de DOCUMENTOQR

#### **Tipos de Documentos:**
```
1. FACTURA FORMAL (numerada DIAN)
   ├─ Requisitos: NIT cliente, descripción, IVA, retención
   ├─ Validación: Secuencial obligatorio
   └─ Trazabilidad: QR con DIAN info

2. FACTURA SIMPLIFICADA (< 500,000 COP)
   ├─ Requisitos: Nombre cliente, items
   ├─ Validación: Sin numeración obligatoria
   └─ Trazabilidad: QR con hash local

3. RECIBO INFORMAL (POS/Cash)
   ├─ Requisitos: Cliente, items, monto
   ├─ Validación: Sin NIT
   └─ Trazabilidad: QR con timestamp + usuario

4. ORDEN DE SERVICIO
   ├─ Requisitos: Cliente, servicios, duración
   ├─ Validación: Sin monto (presupuesto)
   └─ Trazabilidad: QR con link a factura asociada
```

#### **Modelo DocumentQR:**
```python
class DocumentQR(Base):
    __tablename__ = "document_qrs"
    
    # Identificación
    id = Column(Integer, primary_key=True)
    document_type = Column(String(50))  # factura, recibo, orden
    document_number = Column(String(50), unique=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    customer_id = Column(Integer, ForeignKey('customers.id'))
    
    # Contenido documentado
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=True)
    payment_id = Column(Integer, ForeignKey('payments.id'), nullable=True)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=True)
    
    # QR Data
    qr_data = Column(Text)  # JSON con datos del documento
    qr_hash = Column(String(256))  # SHA256 del documento
    qr_image = Column(LargeBinary, nullable=True)  # PNG del QR
    
    # Legal
    digital_signature = Column(String(500), nullable=True)  # DIAN signature
    dian_timestamp = Column(DateTime, nullable=True)
    dian_status = Column(String(50), default='pending')  # pending, approved, rejected
    
    # Trazabilidad
    scans = relationship("QRScan", back_populates="document")
    created_at = Column(DateTime, default=datetime.utcnow)
    issued_at = Column(DateTime, nullable=True)
    voided_at = Column(DateTime, nullable=True)

class QRScan(Base):
    __tablename__ = "qr_scans"
    
    id = Column(Integer, primary_key=True)
    document_qr_id = Column(Integer, ForeignKey('document_qrs.id'))
    scanner_type = Column(String(50))  # mobile, web, physical_reader
    scan_location = Column(String(255), nullable=True)  # GPS coords
    scanned_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("DocumentQR", back_populates="scans")
```

#### **Contenido del QR:**

```json
{
  "document_type": "factura",
  "document_number": "FAC-2024-00001",
  "issued_date": "2024-03-18T14:30:00",
  "issued_by": "admin@adminsystems.com",
  "customer": {
    "name": "Juan Pérez",
    "nit": "1.234.567-8"
  },
  "items": [
    {
      "description": "Corte de cabello",
      "quantity": 1,
      "unit_price": 50000,
      "tax_rate": 0,
      "subtotal": 50000
    }
  ],
  "subtotal": 50000,
  "iva": 0,
  "retencion": 0,
  "total": 50000,
  "verification_url": "https://adminsystems.com/verify/qr/FAC-2024-00001",
  "qr_hash": "a3f2b8e9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5"
}
```

#### **Flujo Integración Plataforma QR:**

```python
# Como red de trazabilidad
@router.post("/documents/generate")
async def generate_document(doc_data, db):
    # 1. Crear documento
    doc = DocumentQR.create({
        document_type: 'factura',
        invoice_id: invoice.id,
        ...
    })
    
    # 2. Generar QR data
    qr_payload = {
        document_type: doc.document_type,
        document_number: doc.document_number,
        ...
        verification_url: f"https://adminsystems.com/verify/{doc.id}"
    }
    
    # 3. Crear QR image
    qr_image = generate_qr_code(json.dumps(qr_payload))
    
    # 4. [Plataforma QR] Registrar documento
    # POST https://tuapiplatformaQR.com/documents/register
    # {
    #   "reference_id": F"admins-{doc.id}",
    #   "qr_data": qr_payload,
    #   "document_type": "invoice",
    #   "chain": [
    #       {type: "issued", timestamp: now, actor: "admin"},
    #       {type: "paid", timestamp: ..., actor: "customer"}
    #   ]
    # }
    
    # 5. Guardar DocumentQR localmente
    doc.qr_image = qr_image
    doc.qr_hash = hash_sha256(json.dumps(qr_payload))
    db.add(doc)
    db.commit()
    
    return {
        'document_id': doc.id,
        'qr_image_base64': base64.encode(qr_image),
        'verification_url': f"https://adminsystems.com/verify/{doc.id}"
    }

@router.get("/documents/{doc_id}/verify")
async def verify_document(doc_id, db):
    doc = DocumentQR.get(doc_id)
    
    # Mostrar documento con histórico de escaneos
    return {
        'document': doc,
        'scans': [
            {
                'scanner_type': 'mobile',
                'location': 'Cali, Colombia',
                'timestamp': '2024-03-18T15:45:00',
                'device': 'iPhone 12'
            }
        ],
        'status': doc.dian_status,
        'verification': 'VÁLIDO'
    }
```

#### **Webhook para Plataforma QR:**
```python
# Cuando ocurren eventos en plataforma QR:
@router.post("/webhook/qr-events")
async def handle_qr_event(event, db):
    # event: {
    #   reference_id: "admins-5",
    #   event_type: "document_scanned",
    #   location: {...},
    #   timestamp: datetime
    # }
    
    doc = DocumentQR.get_by_reference(event.reference_id)
    
    if event.event_type == 'document_scanned':
        QRScan.create({
            document_qr_id: doc.id,
            scanner_type: 'mobile',
            scan_location: event.location,
            scanned_at: event.timestamp
        })
        
        # Log para trazabilidad
        logger.info(f"Documento {doc.document_number} escaneado en {event.location}")
```

---

## 5. AUTORIZACIONES FORMALES

### Ámbito: Gestión de Firmas, Aprobaciones y Cumplimiento

#### **Tipos de Autorización:**

```
1. AUTORIZACIÓN DE USUARIO
   ├─ ¿Quién? Administrador => Sub-usuario
   ├─ ¿Qué? Acceso a módulos, límites de transactiones
   └─ ¿Cómo? Firmas de rol, certificados digitales

2. AUTORIZACIÓN DE TRANSACCIÓN
   ├─ ¿Quién? Contador => Factura > cierto monto
   ├─ ¿Qué? Aprobación de IVA, retención
   └─ ¿Cómo? Workflow de aprobaciones

3. AUTORIZACIÓN DE DOCUMENTO
   ├─ ¿Quién? DIAN (gobierno)
   ├─ ¿Qué? Radicación de factura electrónica
   └─ ¿Cómo? Certificado digital del contribuyente

4. AUTORIZACIÓN DE NEGOCIO
   ├─ ¿Quién? Dueño del negocio
   ├─ ¿Qué? Autorizar cambios en configuración, tarifas
   └─ ¿Cómo? One-time password, email confirmation
```

### Modelo de Autorizaciones

#### **Base de datos:**
```python
class Authorization(Base):
    __tablename__ = "authorizations"
    
    # Identificación
    id = Column(Integer, primary_key=True)
    authorization_type = Column(String(50))  # user_role, transaction, document, business
    authorization_code = Column(String(100), unique=True)
    
    # Actores
    requester_user_id = Column(Integer, ForeignKey('users.id'))  # Quien pide
    approver_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # Quien aprueba
    
    # Objeto de autorización
    target_type = Column(String(50))  # invoice, payment, user, configuration
    target_id = Column(Integer)
    target_data = Column(JSON)  # Datos del objeto autorizado
    
    # Parámetros
    amount_limit = Column(Numeric(12, 2), nullable=True)  # Si es monto
    expires_at = Column(DateTime, nullable=True)
    required_approvers = Column(Integer, default=1)  # Cuántas firmas necesita
    
    # Estado
    status = Column(String(20), default='pending')  # pending, approved, rejected, expired
    approval_chain = Column(JSON)  # [{user_id, approval_date, signature}, ...]
    
    # Auditoría
    legal_basis = Column(String(255))  # Norma legal que exige esta autorización
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
```

#### **Tipos de Autorización Específicos:**

##### **1. User Role Authorization**
```
Caso: Admin crea Sub-usuario
───────────────────────────
Authorization {
  type: 'user_role',
  requester: admin_user,
  target: new_sub_user,
  target_data: {
    role: 'team_member',
    permissions: ['view_inventory', 'create_appointments'],
    transaction_limit: 500000,
    currency: 'COP'
  },
  legal_basis: 'Internal Control Policy'
}

Sistema:
├─ Requiere firma digital del admin
├─ Registra certificado de delegación
├─ Envía email de confirmación
└─ Activa permisos después de aprobación
```

##### **2. Transaction Authorization**
```
Caso: Factura > 2,000,000 COP
───────────────────────────
Authorization {
  type: 'transaction',
  target: invoice_5,
  target_data: {
    amount: 2500000,
    items: [...],
    iva: 475000,
    retencion: 125000
  },
  required_approvers: 2,  # Debe aprobar contador + admin
  legal_basis: 'Internal Control - Large Transaction Policy'
}

Workflow:
1. Factura generada → status: 'pending_approval'
2. Sistema notifica a contadores
3. Contador 1 revisa → aprueba/rechaza
4. Contador 2 revisa → aprueba/rechaza
5. Admin firma con certificado
6. DocumentQR genera con firmas
```

##### **3. Document Authorization (DIAN)**
```
Caso: Radicación de factura electrónica ante DIAN
───────────────────────────────────────────────
Authorization {
  type: 'document',
  target: invoice_5,
  required_approvers: 1,
  legal_basis: 'Resolución DIAN 000042 - Facturación Electrónica',
  
  signature_requirements: {
    certificate_type: 'digital_certificate',  # Certificado X.509
    certificate_issuer: 'DIAN',  # Autoridad certificadora
    signing_algorithm: 'RSA2048',
    timestamp_required: true  # Sellado de tiempo
  }
}

Proceso:
1. Documento listo para enviar a DIAN
2. Firmar digitalmente con certificado empresa
3. Enviar a ServiceWeb DIAN
4. DIAN retorna: cumplido/rechazado
5. DocumentQR registra status DIAN
```

##### **4. Business Configuration Authorization**
```
Caso: Cambiar tarifa de servicios
─────────────────────────────
Authorization {
  type: 'business',
  target: service_prices_update,
  target_data: {
    service_1: {old_price: 30000, new_price: 35000},
    service_2: {old_price: 50000, new_price: 55000}
  },
  required_approvers: 1,  # Solo dueño
  legal_basis: 'Autonomía empresarial'
}

Implementación:
├─ One-time password enviado al email del dueño
├─ Confirmación mediante QR code
└─ Historial de cambios para auditoría
```

### Auditoría y Cumplimiento

#### **Registro de Auditoría:**
```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True)
    entity_type = Column(String(50))  # invoice, payment, user, etc
    entity_id = Column(Integer)
    action = Column(String(50))  # create, update, delete, authorize
    actor_user_id = Column(Integer, ForeignKey('users.id'))
    
    # Cambios
    old_value = Column(JSON)
    new_value = Column(JSON)
    change_reason = Column(String(255))
    
    # Autorización
    authorization_id = Column(Integer, ForeignKey('authorizations.id'), nullable=True)
    
    # Detalles
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    timestamp = Column(DateTime, default=datetime.utcnow)
    signature = Column(String(500))  # Firma criptográfica del log
```

#### **Reportes de Cumplimiento:**
```
GET /compliance/audit-trail
├─ Filtrar por: fecha, usuario, tipo de transacción
├─ Exportar: PDF con firmas digitales
└─ Verificación: Hash SHA256 anti-tampering

GET /compliance/monthly-report
├─ Resumen: facturas emitidas, pagos, retenciones
├─ Validaciones DIAN
└─ Alertas: discrepancias, documentos no aprobados
```

---

## 6. PLAN DE IMPLEMENTACIÓN

### Fase 1: Consolidación (1-2 semanas)
- [ ] Agregar `invoice_id` a Payment
- [ ] Agregar `payment_id` a CashTransaction
- [ ] Deprecar `concept` en Payments
- [ ] Crear tabla PaymentItem
- [ ] Migración de datos históricos

### Fase 2: Documentos QR (2-3 semanas)
- [ ] Crear tabla DocumentQR
- [ ] Implementar generación de QR codes
- [ ] Integración con plataforma QR externa
- [ ] Endpoint de verificación `/documents/{id}/verify`
- [ ] Frontend para visualizar/descargar QR

### Fase 3: Autorizaciones (3-4 semanas)
- [ ] Crear tabla Authorization & AuditLog
- [ ] Workflow de aprobaciones en backend
- [ ] Request-response DIAN para firmas
- [ ] Frontend: Botón "Enviar a Aprobación"
- [ ] Notificaciones por email

### Fase 4: Refinamiento (1 semana)
- [ ] Testing end-to-end
- [ ] Documentación de APIs
- [ ] Capacitación usuarios
- [ ] Go-live

---

## 7. RESUMEN EJECUTIVO

| Mejora | Beneficio | Complejidad |
|--------|-----------|-------------|
| Consolidar Pagos + Caja | Eliminar redundancia | 🟡 Media |
| Inventario en Facturas | Control de stock | 🟡 Media |
| Items en Pagos | Trazabilidad | 🟡 Media |
| DocumentoQR + Trazabilidad | Cumplimiento legal + red | 🔴 Alta |
| Autorizaciones | Auditoría + control | 🔴 Alta |

**Recomendación**: Implementar Fase 1 + 2 primero (valor inmediato), luego 3 + 4 (cumplimiento legal).

