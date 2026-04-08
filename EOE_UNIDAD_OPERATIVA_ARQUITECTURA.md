# AdminG EOE - Arquitectura "Unidad Operativa"

## 0) Marco EOE obligatorio
AdminG se define como Ecosistema Operativo Empresarial (EOE), no como ERP modular aislado.

Principio:
- Todo evento operativo debe modelarse como una interaccion dentro del ecosistema.
- Ningun modulo opera solo: CRM, RRHH, Riesgos, Gastos y Canales comparten contexto y eventos.

Capas:
1. Nucleo operativo: Unidad Operativa
2. Contexto: actor, canal, ubicacion, tiempo, riesgo
3. Dominios conectados: CRM, Gastos, Servicios, Personal, Riesgos, POS futuro
4. Canales: Web, Mobile, WhatsApp, SMS, Notificaciones
5. Inteligencia: interpretacion, recomendacion, automatizacion
6. Control: plan, rol, tenant, permisos, registro central dinamico

## 1) Unidad Operativa (modelo base)
Unidad minima ejecutable, trazable y reusable.

Tipos:
- SERVICE
- PRODUCT
- BUNDLE
- ACTION
- EVENT
- RESOURCE
- CUSTOM

## 2) Entidades de datos

### 2.1 Tabla: operational_unit_types
- id (PK)
- code (UNIQUE): SERVICE, PRODUCT, BUNDLE, ACTION, EVENT, RESOURCE, CUSTOM
- name
- is_active
- created_at

### 2.2 Tabla: operational_units
- id (PK)
- tenant_id (FK users/business owner)
- type_id (FK operational_unit_types)
- code (UNIQUE por tenant)
- title
- description
- status: draft, active, archived
- risk_capable (bool)
- compliance_capable (bool)
- created_by
- created_at
- updated_at

### 2.3 Tabla: operational_unit_items
- id (PK)
- unit_id (FK operational_units)
- ref_type: service, product, expense, customer, employee, shift, incident, custom
- ref_id
- quantity
- unit_cost
- metadata_json

### 2.4 Tabla: operational_contexts
- id (PK)
- unit_id (FK operational_units)
- channel_origin: web, mobile, whatsapp, sms, voice
- actor_type: customer, employee, system, ai
- actor_id
- location_id
- occurred_at
- risk_level_snapshot
- related_entities_json

### 2.5 Tabla: operational_events
- id (PK)
- tenant_id
- unit_id (FK operational_units)
- event_type: risk_detected, incident_reported, action_overdue, expense_flagged, whatsapp_received
- severity: low, medium, high, critical
- probability_score (0..1)
- impact_score (0..1)
- risk_score (0..1)
- status: open, in_progress, mitigated, closed
- trigger_source: user, rule, ai, integration
- payload_json
- created_at
- closed_at

### 2.6 Tabla: risk_registry
- id (PK)
- tenant_id
- area
- risk_type
- description
- probability_level (1..5)
- impact_level (1..5)
- risk_level_auto (probability_level * impact_level)
- category: low, medium, high, critical
- owner_user_id
- status: active, mitigated, accepted, closed
- created_at
- updated_at

### 2.7 Tabla: risk_assessments
- id (PK)
- risk_id (FK risk_registry)
- audit_date
- auditor_user_id
- evidence_json
- recommendation
- compliance_score
- next_review_at

### 2.8 Tabla: incidents
- id (PK)
- tenant_id
- event_id (FK operational_events)
- risk_id (FK risk_registry, nullable)
- area
- incident_type: near_miss, accident, disease, unsafe_condition
- injured_people_count
- lost_days
- direct_cost
- indirect_cost
- description
- root_cause
- report_channel
- created_by
- created_at

### 2.9 Tabla: action_plans
- id (PK)
- incident_id (FK incidents, nullable)
- risk_id (FK risk_registry, nullable)
- title
- owner_user_id
- due_date
- status: open, in_progress, done, overdue
- progress_pct
- estimated_cost
- actual_cost

### 2.10 Tabla: compliance_trainings
- id (PK)
- tenant_id
- topic
- audience_role
- mandatory (bool)
- due_date
- completion_rate
- status

### 2.11 Tabla: expenses (Expense Management System)
- id (PK)
- tenant_id
- employee_id
- category: travel, operational, safety, medical, equipment, other
- amount
- currency
- expense_date
- channel_origin
- related_event_id (FK operational_events, nullable)
- related_incident_id (FK incidents, nullable)
- status: draft, submitted, approved, reimbursed, rejected
- receipt_url
- notes

### 2.12 Tabla: communication_events
- id (PK)
- tenant_id
- event_id (FK operational_events)
- channel: whatsapp, sms, push, email, voice
- recipient_type
- recipient_ref
- template_code
- delivery_status
- sent_at
- ack_at

## 3) Matriz de riesgo (probabilidad x impacto)
Escala recomendada:
- Probabilidad: 1 a 5
- Impacto: 1 a 5
- Resultado: score = probabilidad * impacto

Categorias:
- 1-4: Bajo
- 5-9: Medio
- 10-16: Alto
- 17-25: Critico

Reglas:
- score >= 10 crea operational_event(risk_detected)
- score >= 17 dispara canal critico (SMS + WhatsApp + notificacion)

## 4) Integracion por dominio

### 4.1 Mi Equipo (RRHH)
- actor principal en reportes de riesgo/incidente
- asignacion de responsables de acciones
- capacitaciones por rol
- relacion con turnos para detectar fatiga/exposicion

### 4.2 Turnos
- eventos por sobrecarga de horas
- correlacion de incidentes por franja y area

### 4.3 Gastos
- coste por incidente (directo + indirecto)
- gastos de mitigacion por plan de accion
- travel & expense integrado a eventos y cumplimiento

### 4.4 CRM
- para starter: CRM no habilitado
- para planes superiores: incidentes asociados a clientes cuando aplique sector

### 4.5 IA
- interpreta inputs multicanal
- propone clasificacion de riesgo
- sugiere acciones y prioridades
- detecta brechas de cumplimiento

## 5) Omnicanal operativo

### 5.1 WhatsApp Business API (roadmap)
- inbound: recepcion de reporte de incidente/riesgo
- outbound: alertas, estado de accion, recordatorios de cumplimiento
- webhook -> communication_events + operational_events

### 5.2 SMS
- uso solo critico
- activacion por severidad critica o SLA vencido

### 5.3 Mobile nativo
- captura en campo (offline-first recomendado)
- sincronizacion eventual con cola local

### 5.4 Voz ambiental
- transcripcion a EVENT/ACTION
- deteccion de palabras de riesgo y escalamiento

## 6) Endpoints clave (v1)

### 6.1 Unidad Operativa
- POST /operational-units
- GET /operational-units
- GET /operational-units/{id}
- POST /operational-units/{id}/execute
- POST /operational-units/{id}/events

### 6.2 Riesgos
- POST /risks
- GET /risks
- PATCH /risks/{id}
- POST /risks/{id}/assessments
- POST /risks/{id}/mitigate

### 6.3 Incidentes
- POST /incidents
- GET /incidents
- GET /incidents/{id}
- POST /incidents/{id}/action-plans

### 6.4 Cumplimiento y capacitacion
- POST /compliance/trainings
- GET /compliance/trainings
- POST /compliance/audits

### 6.5 Gastos
- POST /expenses
- GET /expenses
- PATCH /expenses/{id}/approve
- GET /expenses/kpis

### 6.6 Canales
- POST /channels/whatsapp/webhook
- POST /channels/sms/send-critical
- POST /channels/notify

### 6.7 IA operacional
- POST /ai/operations/interpret
- POST /ai/operations/recommend-actions
- POST /ai/operations/risk-score

## 7) Dashboard KPI requeridos
- tasa_accidentes = incidentes / total_horas_trabajadas
- riesgos_activos_por_nivel
- areas_mas_criticas
- cumplimiento_acciones = acciones_cerradas / acciones_totales
- coste_por_incidente = (directo + indirecto) / incidentes
- tiempo_promedio_cierre_incidente
- capacitacion_vencida_por_area

## 8) Quick Settings (ejecucion real)
Quick Settings debe ejecutar unidades frecuentes, no solo UI.

Acciones recomendadas:
- Reportar incidente
- Reportar condicion insegura
- Crear gasto de mitigacion
- Crear accion correctiva
- Escalar riesgo critico
- Abrir checklist de auditoria

## 9) Seguridad y control
Validar siempre por:
- tenant_id
- plan
- rol
- canal
- tipo de unidad

Reglas minimas:
- Starter: sin CRM, sin IA chat
- Team/viewer: no cierre de incidentes criticos ni aprobacion final de gastos
- SMS solo para eventos criticos autorizados

## 10) Integracion con Registro Central
Registrar todo evento en una bitacora dinamica comun:
- source_module
- source_id
- unit_id
- event_id
- actor
- channel
- severity
- timestamp

## 11) Flujos operativos ejemplo

### Caso A: Accidente reportado por WhatsApp
1. webhook recibe mensaje
2. IA interpreta: incidente tipo accidente
3. crea EVENT severity=high
4. crea registro en incidents
5. genera action_plan
6. notifica a responsable y RRHH
7. crea gasto potencial de atencion

### Caso B: Riesgo detectado en auditoria
1. auditor crea risk_assessment
2. score automatico >= 10
3. crea EVENT risk_detected
4. sugiere accion por IA
5. seguimiento en dashboard KPI

### Caso C: Gasto de viaje asociado a inspeccion
1. empleado crea expense category=travel
2. relaciona a evento de auditoria
3. pasa aprobacion por rol
4. impacta KPI coste por incidente/riesgo

## 12) Fases de implementacion recomendadas
Fase 1 (2-3 sprints):
- tablas base: operational_units, operational_events, risk_registry, incidents, action_plans
- endpoints v1 de riesgos/incidentes
- dashboard KPI inicial

Fase 2 (2 sprints):
- expense management completo
- integracion turnos + RRHH
- quick settings operativos

Fase 3 (2-3 sprints):
- WhatsApp Business API
- SMS critico
- IA operacional avanzada
- base para mobile nativo y voz

## 13) Decisiones tomadas para este requerimiento
- Starter queda sin CRM y sin IA (enforced en features)
- EOE se modela por Unidades Operativas + Eventos + Contexto
- Riesgos laborales y gastos no son modulos aislados: son dominios conectados por eventos
