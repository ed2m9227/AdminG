# Servicios, Inventario y Homogeneizacion UI

Fecha: 2026-02-20

## Objetivo
Centralizar el modulo de servicios (lo que el cliente brinda) y conectarlo con inventario, pagos, caja y reportes. Definir un sistema de categorias unificado para SKU y servicios. Homogeneizar avisos, acciones en tablas y formatos numericos (reportes, caja, totales, IVA). Dejar un plan claro para evitar perdida por procesos de Git o seguridad.

## Estado actual (referencias)
- Servicio (modelo): app/models/service.py
- Citas consumen servicios: app/modules/appointments/router.py
- Inventario con SKU y categorias: app/modules/inventory/router.py
- Reportes tienen placeholder de top services: app/modules/reports/router.py
- UI (frontend-dist) usa inventario y clientes sin un modulo de servicios dedicado.

## 1) Servicios como eje
### Requerimientos
- CRUD de servicios (crear, editar, desactivar, listar).
- Limites por plan y control por rol.
- Cada servicio puede:
  - Definir precio base.
  - Asociar categoria (compartida con SKU).
  - Opcional: asociar insumos (items de inventario) para consumo automatico.
- Citas deben permitir seleccionar servicio y heredar precio/duracion.
- Pagos deben registrar referencia a servicio (directo o via cita).

### Integraciones
- Inventario: consumo de insumos al cerrar cita/pago.
- Caja: registrar ingreso por servicio.
- Reportes: top servicios, ingresos por servicio, margen si hay costo de insumos.

### Implementacion (fase 1)
- Modelo services con user_id, description e is_active.
- Endpoints: /services (CRUD, soft-delete).
- Limites por plan (basic/plus/start/max/admin).

## 2) Categorias unificadas (SKU y Servicios)
### Reglas
- Crear un modelo de categoria comun (ej. CatalogCategory) con tipo opcional.
- Permitir usar la misma categoria para:
  - Productos (SKU)
  - Servicios
- Mantener validacion de SKU unica solo para productos.

### Impacto
- Migracion para mover InventoryCategory a categoria comun.
- Actualizar endpoints de inventario y futuros endpoints de servicios.

## 3) Homogeneizacion UI
### Alertas
- Un solo estilo y copy:
  - Error: "No se pudo completar la accion"
  - Plan: "Funcion no disponible en tu plan"
- Reusar componente Modal/Alert

### Acciones en tablas
- Botones con mismos tamaños, iconos y orden (Editar, Eliminar, Ver)
- Mantener mismo color por accion

### Formatos numericos
- Formateador unico para moneda (es-CO o es-ES), cantidades e IVA
- Reusar en:
  - Dashboard
  - Caja
  - Reportes
  - Inventario

## 4) Seguridad y proceso Git
### Flujo recomendado
- Una feature por branch
- Commits pequenos con mensajes claros
- No versionar app.db
- Documentar decisiones clave en este archivo

### Checklist antes de merge
- Backend: tests o smoke en /docs
- Frontend: revisar alertas y tablas en 3 modulos
- Confirmar formateo numerico

## Backlog priorizado
1. Crear router de servicios (CRUD + validaciones)
2. Crear modelo de categoria comun (migracion y backfill)
3. Conectar servicios a inventario (insumos por servicio)
4. Ajustar reportes (top servicios, ingresos por servicio)
5. Homogeneizar alertas y acciones UI
6. Formateo numerico centralizado

## Notas
- Este documento es la fuente unica de verdad para esta linea de trabajo.
