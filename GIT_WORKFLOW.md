# 🔀 Git Workflow - AdminG

## 📋 Estado Actual del Repositorio

✅ Git ya está inicializado en este proyecto  
✅ `.gitignore` configurado para excluir:
- `node_modules/` (Frontend)
- `venv/` (Backend Python)
- `*.db` (Bases de datos SQLite)
- `.env.local` (Variables de entorno)
- `__pycache__/` y archivos compilados

---

## 🚀 Workflow Recomendado

### 1. **Commits Frecuentes en Feature Branch**

```bash
# Crear rama para nueva feature
git checkout -b feature/appointments-crud

# Hacer cambios...
# Commits pequeños y frecuentes
git add app/modules/appointments/
git commit -m "Add: GET /appointments endpoint"

git add tests/test_appointments.py
git commit -m "Add: appointments tests"

git add frontend/src/pages/AppointmentsPage.tsx
git commit -m "Add: appointments frontend page"
```

### 2. **Merge vs Rebase vs Squash**

#### **Git Merge** (Preserva toda la historia)
```bash
# Desde main
git checkout main
git merge feature/appointments-crud

# Crea un commit de merge
# ✅ Ventaja: Historia completa, bisect funciona
# ❌ Desventaja: Historial "ruidoso"
```

#### **Git Rebase** (Historia lineal limpia)
```bash
# Actualizar feature branch con cambios de main
git checkout feature/appointments-crud
git rebase main

# Resuelve conflictos si hay
# Luego merge fast-forward
git checkout main
git merge feature/appointments-crud

# ✅ Ventaja: Historia lineal, fácil de leer
# ❌ Desventaja: Reescribe historia (no usar en ramas públicas)
```

#### **Squash and Merge** (Un commit por feature)
```bash
# Opción 1: Squash manual antes de merge
git checkout feature/appointments-crud
git rebase -i main  # Marca commits como "squash"

# Opción 2: Merge con squash
git checkout main
git merge --squash feature/appointments-crud
git commit -m "Feature: Complete appointments CRUD with tests and frontend"

# ✅ Ventaja: Historia MUY limpia, un commit = feature completa
# ❌ Desventaja: Pierdes commits intermedios
```

---

## 📦 Commits Actuales Recomendados

### Para el trabajo de hoy:

```bash
# 1. Agregar cambios del frontend refactor
git add frontend/src/components/Layout.tsx
git add frontend/src/pages/LoginPage.tsx
git add frontend/src/pages/RegisterPage.tsx
git add frontend/src/pages/AppointmentsPage.tsx
git add frontend/src/pages/InventoryPage.tsx
git add frontend/src/pages/ReportsPage.tsx
git add frontend/src/pages/PaymentsPage.tsx
git add frontend/.env.local
git add .gitignore
git commit -m "Refactor: Fix Tailwind colors and add missing pages

- Replace primary-* with blue-* (Tailwind standard)
- Create AppointmentsPage with CRUD structure
- Create InventoryPage with low stock alerts
- Create ReportsPage with metrics display
- Create PaymentsPage with transactions table
- Add .env.local with VITE_API_URL
- Update .gitignore for node_modules"

# 2. Agregar documentación
git add SETUP_FRONTEND.md
git add DOCUMENTACION.md
git add RESUMEN_SESSION.md
git commit -m "Docs: Add comprehensive setup and session guides"
```

---

## 🎯 Para Este Proyecto Específico

### **Estrategia Recomendada: Merge Simple**

Razón:
- ✅ Solo tú trabajando (no hay conflictos de equipo)
- ✅ Historia completa útil para aprender
- ✅ No necesitas historia super limpia aún

```bash
# Workflow simple
git add .
git commit -m "Feature: descripción clara"
git push origin main
```

### **Si Trabajaras en Equipo:**

```bash
# Feature branch workflow
git checkout -b feature/payment-integration
# ... hacer cambios ...
git commit -m "Add: Stripe integration"

# Antes de merge, actualizar con main
git checkout main
git pull origin main
git checkout feature/payment-integration
git rebase main

# Resolver conflictos si hay
# Luego merge
git checkout main
git merge feature/payment-integration
git push origin main
```

---

## 📝 Mensajes de Commit Convencionales

Usa este formato para claridad:

```
<tipo>: <descripción corta>

<cuerpo opcional con más detalles>
```

### Tipos:
- `Feat:` Nueva feature
- `Fix:` Corrección de bug
- `Refactor:` Cambio de código sin cambiar funcionalidad
- `Docs:` Solo documentación
- `Test:` Agregar/actualizar tests
- `Chore:` Tareas de mantenimiento (deps, config)
- `Style:` Formato de código (no cambia lógica)

### Ejemplos:
```bash
git commit -m "Feat: Add customer CRUD endpoints"
git commit -m "Fix: Correct plan_id FK in User model"
git commit -m "Refactor: Replace get_password_hash with hash_password"
git commit -m "Docs: Update README with frontend setup"
git commit -m "Test: Add auth endpoint integration tests"
git commit -m "Chore: Update requirements.txt dependencies"
```

---

## 🔄 Comandos Git Útiles

```bash
# Ver estado
git status

# Ver commits recientes
git log --oneline -10

# Ver cambios no commiteados
git diff

# Ver cambios ya staged
git diff --staged

# Deshacer último commit (mantiene cambios)
git reset --soft HEAD~1

# Deshacer cambios en un archivo
git checkout -- archivo.py

# Ver ramas
git branch -a

# Crear y cambiar a rama
git checkout -b nueva-rama

# Eliminar rama
git branch -d rama-antigua

# Actualizar desde remoto
git pull origin main

# Subir a remoto
git push origin main

# Ver commits bonitos
git log --graph --oneline --all
```

---

## ⚠️ Cuándo NO Usar Rebase

**NUNCA** hagas rebase en:
1. Rama `main` después de push
2. Ramas compartidas con otros devs
3. Commits ya pusheados a remoto público

**Rebase es seguro solo en**:
- Ramas locales no pusheadas
- Feature branches privadas

---

## 🎓 Para Aprender Más

### Merge vs Rebase - Cuándo usar cada uno:

**Usa MERGE cuando:**
- Trabajas en equipo
- Quieres preservar contexto histórico
- No te importa historial con commits de merge

**Usa REBASE cuando:**
- Trabajas solo en feature branch
- Quieres historia lineal limpia
- Actualizas rama local con cambios de main

**Usa SQUASH cuando:**
- Quieres un commit limpio por feature
- Los commits intermedios no aportan valor
- Vas a hacer PR (Pull Request)

---

## ✅ Checklist Antes de Commit

- [ ] Código funciona (probado localmente)
- [ ] Tests pasan (`pytest`)
- [ ] Frontend compila sin errores (`npm run build`)
- [ ] No hay archivos sensibles (.env, passwords)
- [ ] .gitignore actualizado
- [ ] Mensaje de commit claro y descriptivo

---

## 🚦 Estado Actual del Proyecto

```bash
# Ver qué cambios hay pendientes
git status

# Ver archivos modificados
git diff --name-only

# Ver archivos nuevos
git ls-files --others --exclude-standard
```

**Archivos que probablemente están sin commitear:**
- `frontend/src/pages/AppointmentsPage.tsx` (nuevo)
- `frontend/src/pages/InventoryPage.tsx` (nuevo)
- `frontend/src/pages/ReportsPage.tsx` (nuevo)
- `frontend/src/pages/PaymentsPage.tsx` (nuevo)
- `frontend/src/components/Layout.tsx` (modificado)
- `frontend/src/pages/LoginPage.tsx` (modificado)
- `frontend/src/pages/RegisterPage.tsx` (modificado)
- `.gitignore` (modificado/nuevo)
- `SETUP_FRONTEND.md` (nuevo)
- `DOCUMENTACION.md` (nuevo)

---

**Recomendación para HOY**: Usa **merge simple** sin complicaciones. Cuando tengas experiencia o trabajes en equipo, explora rebase/squash.
