# Database Reset Instructions / Instrucciones de Reset de BD

## Problema / Problem
La base de datos tiene un schema antiguo y falta la columna `business_type` en la tabla `users`.
The database has old schema and is missing the `business_type` column in users table.

Error: `sqlite3.OperationalError: no such column: users.business_type`

## Solución / Solution

### Opción 1: Reset Manual (Recomendado / Recommended)

En una terminal en el directorio raíz del proyecto:

```bash
python manual_reset_db.py
```

Esto va a:
1. Eliminar app.db
2. Crear las tablas nuevas con el schema correcto
3. Configurar los planes (Free, Basic, Plus, Start, Max)

Luego reinicia el servidor:
```bash
cd app
python -m uvicorn main:app --reload
```

---

### Opción 2: Reset Automático con POST

Si el servidor está corriendo:

```bash
curl -X POST http://127.0.0.1:8000/admin/reset-db
```

O desde el navegador:
1. Abre: http://127.0.0.1:8000/admin/reset-db
2. (Si es URL directo, verás JSON response)

Luego `Control+C` en terminal y reinicia:
```bash
cd app && python -m uvicorn main:app --reload
```

---

### Opción 3: Restart del Servidor

El startup_event fue actualizado para recrear tablas automáticamente, así que simplemente:

1. Elimina `app.db` manualmente
2. Reinicia el servidor:
```bash
cd app
python -m uvicorn main:app --reload
```

---

## Verificación / Verification

Una vez que el servidor esté corriendo, intenta registrarte en:
```
http://127.0.0.1:8000/register
```

O haz test:
```bash
python quick_test.py
```

---

## Cambios Realizados / Changes Made

✓ Updated `app/main.py` startup_event para recrear tablas automáticamente
✓ Created `manual_reset_db.py` para manual reset
✓ Created `/admin/reset-db` endpoint para remote reset
✓ Updated User model con `business_type` y `parent_user_id` fields

---

## Próximos Pasos / Next Steps

1. Ejecuta reset: `python manual_reset_db.py`
2. Reinicia servidor: `cd app && python -m uvicorn main:app --reload`
3. Intenta registrar nuevo usuario en http://127.0.0.1:8000/register
4. Ejecuta tests: `python quick_test.py`
