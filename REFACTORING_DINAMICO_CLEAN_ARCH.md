# Refactor Dinamico por Tipo de Negocio + Clean Architecture

Fecha: 2026-04-01
Proyecto: AdminG

## Objetivo

Hacer que toda la aplicacion (incluyendo CRM e IA) sea dinamica por tipo de negocio, reduciendo logica hardcodeada y alineando el codigo con principios de Clean Architecture, Clean Code y SOLID.

## Resumen Ejecutivo

Se implemento una arquitectura basada en un registro central de tipo de negocio (backend + frontend) y se extrajo la IA a un modulo transversal, desacoplado de CRM.

Antes:
- Reglas de negocio duplicadas entre backend y frontend.
- IA limitada al modulo CRM.
- Filtros por tipo de negocio hardcodeados en varios lugares.

Despues:
- Unica fuente de verdad para comportamiento por tipo de negocio.
- IA transversal para cualquier tipo de negocio, con intents dinamicos por negocio.
- Routers y componentes consumen abstracciones de dominio en lugar de listas hardcodeadas.

## Principios Aplicados

### SOLID

1. Single Responsibility (SRP)
- app/core/business_registry.py: solo configura comportamiento por tipo de negocio.
- app/modules/ai/interpreter.py: solo interpreta intencion.
- app/modules/ai/query_builder.py: solo construye/ejecuta consultas seguras.
- app/modules/ai/response_formatter.py: solo formatea respuesta.

2. Open/Closed (OCP)
- Nuevo tipo de negocio o nuevo intent se agrega por extension:
  - tipo de negocio: nueva entrada en BUSINESS_REGISTRY
  - intent IA: nuevo handler + registro
- No requiere modificar logica central existente.

3. Liskov (LSP)
- Todas las configuraciones de negocio mantienen el mismo contrato: vocabulario, features bloqueadas, intents IA.

4. Interface Segregation (ISP)
- Cada modulo expone API acotada y especifica (ej. get_ai_intents, filter_features, format_answer).

5. Dependency Inversion (DIP)
- Routers y componentes dependen de abstracciones (registry) y no de condiciones hardcodeadas.

### Clean Architecture / Clean Code

- Reglas de negocio en capa core (business_registry).
- Adaptadores HTTP (routers) delegan logica de dominio.
- Separacion clara entre interpretacion, query y presentacion de IA.
- Reduccion de duplicidad y de condicionales por tipo de negocio.

## Cambios Realizados

## 1) Backend: Registro Central de Negocio

Archivo nuevo:
- app/core/business_registry.py

Incluye:
- BusinessTypeConfig (dataclass inmutable)
- BUSINESS_REGISTRY como fuente de verdad
- Grupos de intents IA:
  - SHARED_INTENTS
  - HEALTHCARE_INTENTS
  - VETERINARY_INTENTS
- Bloqueo de features por tipo de negocio
- API publica:
  - get_config(business_type)
  - filter_features(features, business_type)
  - get_ai_intents(business_type)
  - get_vocabulary(business_type, key)
  - is_feature_allowed(feature, business_type)

## 2) Backend: Features dinamicas por negocio

Archivo modificado:
- app/core/features.py

Cambios:
- Nueva feature transversal:
  - USE_AI_CHAT = "use_ai_chat"
- Agregada en planes starter/pro/max/admin
- Nueva funcion:
  - filter_for_business_type(features, business_type)
  - delega en business_registry.filter_features

Resultado:
- El filtrado por tipo de negocio deja de estar disperso.

## 3) Backend: Users router desacoplado

Archivo modificado:
- app/modules/users/router.py

Cambios:
- Eliminado hardcode:
  - HEALTHCARE_BUSINESS_TYPES
  - _filter_features_by_business_type(...) local
- Integrado:
  - from app.core.features import filter_for_business_type
  - features = filter_for_business_type(features, user.business_type)

Resultado:
- Menos duplicidad y mayor coherencia con el dominio.

## 4) Backend: IA transversal (no solo CRM)

Archivos nuevos:
- app/modules/ai/__init__.py
- app/modules/ai/schemas.py
- app/modules/ai/interpreter.py
- app/modules/ai/query_builder.py
- app/modules/ai/response_formatter.py
- app/modules/ai/router.py

### Endpoints nuevos

- POST /ai/chat
- GET /ai/examples
- GET /ai/config

### Comportamiento

- Intents disponibles se derivan de business_registry.get_ai_intents(user.business_type)
- Query builder usa SQLAlchemy (sin SQL raw)
- Compatible con multi-tenant por scope de usuarios
- Mantiene compatibilidad con CRM

## 5) Backend: CRM reutiliza IA compartida

Archivo modificado:
- app/modules/crm/router.py

Cambios:
- Reemplazo de imports de IA local por IA compartida:
  - app.modules.ai.interpreter
  - app.modules.ai.query_builder
  - app.modules.ai.response_formatter
- crm chat ahora invoca:
  - detect_intent(question, VETERINARY_INTENTS)
  - run_query_for_intent(..., business_type="veterinaria")

Resultado:
- CRM deja de acoplarse a su propia implementacion IA duplicada.

## 6) Backend: Registro de router IA

Archivo modificado:
- app/main.py

Cambios:
- import ai_router
- app.include_router(ai_router)

## 7) Frontend: Registro Central de Negocio

Archivo nuevo:
- frontend-dist/js/core/businessRegistry.js

Incluye:
- Configuracion de tipos de negocio
- Vocabulario dinamico por tipo
- Filtrado de features por tipo
- Intents IA por tipo
- API publica para componentes:
  - getConfig
  - getVocabulary
  - filterFeatures
  - getAIIntents
  - isHealthcare
  - isVeterinary

## 8) Frontend: Sidebar data-driven

Archivo modificado:
- frontend-dist/js/components/Sidebar.js

Cambios:
- Importa businessRegistry
- getDefaultLabelsByBusinessType usa registry (sin mapas hardcodeados)
- Filtro de features usa businessRegistry.filterFeatures(...)
- Plan fallback incluye use_ai_chat
- Eliminada logica duplicada de healthcare/veterinary hardcodeada

Resultado:
- Sidebar dinamico y extensible por negocio.

## 9) Frontend: Guards de rutas mas limpios

Archivo modificado:
- frontend-dist/js/app.js

Cambios:
- Rutas documents/authorizations/crm simplificadas
- Validacion de acceso unificada via routeFeatureMap en beforeNavigate
- routeFeatureMap ahora incluye:
  - documents -> view_documents
  - authorizations -> view_authorizations
  - crm -> view_crm

Resultado:
- Menos duplicidad en guards por ruta.

## 10) Frontend: API service para IA transversal

Archivo modificado:
- frontend-dist/js/services/api.service.js

Metodos nuevos:
- aiChat(question)
- getAiExamples()
- getAiConfig()

## Validacion

- Se verificaron errores en todos los archivos tocados.
- Resultado: No errors found en backend ni frontend para los archivos modificados.

## Impacto Funcional

1. Dinamismo por tipo de negocio
- Labels, features y IA se adaptan por business_type de usuario.

2. IA transversal
- Ya no depende exclusivamente del modulo CRM.
- CRM usa la misma capa IA compartida.

3. Escalabilidad
- Agregar un nuevo tipo de negocio o nuevos intents no implica tocar routers o componentes.

## Como extender a futuro

### Agregar nuevo tipo de negocio

Backend:
- Agregar entrada en app/core/business_registry.py (BUSINESS_REGISTRY)

Frontend:
- Agregar entrada equivalente en frontend-dist/js/core/businessRegistry.js

### Agregar nuevo intent IA

1. Agregar patrones en app/modules/ai/interpreter.py
2. Crear handler en app/modules/ai/query_builder.py
3. Registrar formatter en app/modules/ai/response_formatter.py
4. Incluir intent en grupo correspondiente en business_registry

## Consideraciones

- Se mantuvo compatibilidad de features CRM existentes.
- El endpoint /crm/ai/chat sigue operativo para el flujo veterinario.
- Ahora coexiste con /ai/chat para IA general por negocio.

## Siguientes pasos recomendados

1. Unificar totalmente el frontend fallback de plan/features con una respuesta backend canonical (evitar drift).
2. Añadir pruebas unitarias para:
   - business_registry (backend)
   - interpreter/query_builder/response_formatter
   - filtros por tipo de negocio en /users/me/features
3. Migrar la vista CRM para consumir /ai/chat y no /crm/ai/chat (si quieres una sola puerta de IA).
4. Exponer endpoint backend de registry publico (solo lectura) para eliminar cualquier duplicidad frontend/backend de configuracion.
