# Sistema SKU - Gestión de Inventario AdminG/AdminPro

## 📦 ¿Qué es un SKU?

**SKU** = **S**tock **K**eeping **U**nit (Unidad de Mantenimiento de Stock)

Es un **código único e irrepetible** que identifica cada producto en tu inventario. Piensa en él como el "DNI" o "cédula" de cada producto.

## 🎯 ¿Para qué sirve?

### **Sin SKU** (Problema):
```
Tienes 3 productos llamados "Shampoo":
- Shampoo para perros (500ml)
- Shampoo para gatos (250ml)  
- Shampoo medicado (500ml)

¿Cómo los diferencias en reportes? ¿Cómo sabes cuál vendiste?
```

### **Con SKU** (Solución):
```
SHMP-DOG-500    → Shampoo para perros 500ml
SHMP-CAT-250    → Shampoo para gatos 250ml
SHMP-MED-500    → Shampoo medicado 500ml

¡Ahora cada uno es único e identificable!
```

## 📋 Formato de SKU Recomendado

### **Estructura Básica**:
```
[CATEGORÍA]-[TIPO]-[VARIANTE]-[#]

Ejemplos:
ALM-GAT-500-001  → Alimento para gatos 500g #1
TOX-LOX-200-001  → Toxina botulínica 200u #1
SRV-COR-STD-001  → Servicio corte estándar #1
```

### **Componentes**:

1. **Categoría** (3-4 letras):
   - `ALM` = Alimento
   - `TOX` = Toxina/Tratamiento
   - `SRV` = Servicio
   - `PROD` = Producto general
   - `ACC` = Accesorio

2. **Tipo/Subtipo** (3-4 letras):
   - `GAT` = Gato
   - `PER` = Perro
   - `LOX` = Loxica (marca)
   - `COR` = Corte
   - `UÑA` = Uñas

3. **Variante** (3 letras/números):
   - `500` = 500 gramos/ml
   - `STD` = Estándar
   - `PRE` = Premium
   - `MED` = Mediano

4. **Número Secuencial** (3 dígitos):
   - `001`, `002`, `003`...

## 🏢 Ejemplos por Industria

### **Veterinaria**:
```
ALM-PER-500-001  → Alimento perro 500g
ALM-PER-1KG-002  → Alimento perro 1kg
MED-ANT-CPS-001  → Medicamento antibiótico cápsulas
SRV-CON-GEN-001  → Servicio consulta general
SRV-CIR-EST-001  → Servicio cirugía esterilización
VAC-RAB-001-001  → Vacuna rabia dosis 1
```

### **Spa de Uñas**:
```
SRV-UÑA-GEL-001  → Servicio uñas gel
SRV-UÑA-ACR-002  → Servicio uñas acrílicas
PROD-ESM-010-001 → Producto esmalte 010ml
PROD-REM-100-001 → Producto removedor 100ml
ACC-LIM-SET-001  → Accesorio set de limas
DEC-CAL-FLO-001  → Decoración calcomanías flores
```

### **Barbería**:
```
SRV-COR-CLÁ-001  → Servicio corte clásico
SRV-COR-MOD-002  → Servicio corte moderno
SRV-BAR-COM-001  → Servicio barba completa
PROD-CEA-250-001 → Producto cera 250g
PROD-SHP-500-001 → Producto shampoo 500ml
PROD-AFT-100-001 → Producto aftershave 100ml
```

### **Fundación/ONG**:
```
DON-ALI-KIT-001  → Donación kit alimentos
DON-VES-ADU-001  → Donación vestimenta adulto
SRV-AYU-LEG-001  → Servicio ayuda legal
SRV-EDU-TAL-001  → Servicio educación taller
EVT-CAR-ABR-001  → Evento caridad abril
```

### **Propiedad Horizontal (PH)**:
```
SRV-MAN-ELE-001  → Servicio mantenimiento eléctrico
SRV-LIM-COM-001  → Servicio limpieza común
PROD-LIM-DET-001 → Producto limpieza detergente
EQP-HER-TAL-001  → Equipo herramientas taladro
GAS-GUA-ARR-001  → Gasto guardia arriendo
```

## ⚙️ Cómo Funciona en AdminG

### **1. Campo SKU es OPCIONAL pero RECOMENDADO**
```
Al crear producto:
- Si NO ingresas SKU → AdminG genera uno automático (PROD-001, PROD-002, etc.)
- Si SÍ ingresas SKU → Usa el tuyo (debe ser único)
```

### **2. Validación de Unicidad**
```python
# Backend valida que no existan 2 productos con mismo SKU
existing = db.query(InventoryItem).filter(InventoryItem.sku == "ALM-GAT-500-001").first()
if existing:
    raise HTTPException(400, "SKU ya existe")
```

### **3. Búsqueda Rápida**
```
En caja registradora o inventario:
- Escanea código de barras (si tienes lector) → busca por SKU
- Escribe "ALM-GAT" → encuentra todos los alimentos para gatos
- Busca "500" → encuentra todos los productos de 500ml/g
```

### **4. Reportes Mejorados**
```
Ventas del mes:
SKU              | Producto           | Cantidad | Total
-----------------|--------------------|----------|-------
ALM-PER-500-001  | Alimento perro     | 45 unid  | $450
SRV-COR-CLÁ-001  | Corte clásico      | 120 svc  | $2400
TOX-LOX-200-001  | Toxina 200u        | 8 unid   | $1600
```

## 🚀 Workflow Recomendado

### **Paso 1: Definir Categorías**
```
Lista tus 3-5 categorías principales:
Veterinaria → ALM (alimento), MED (medicina), SRV (servicio), ACC (accesorio)
```

### **Paso 2: Crear Convención**
```
Documenta tu sistema:
"Todos los SKUs de alimentos empiezan con ALM-
Siguen con PER (perro) o GAT (gato)
Terminan con peso-número"
```

### **Paso 3: Aplicar Consistentemente**
```
Cada vez que agregues producto:
1. Identifica categoría
2. Identifica tipo
3. Identifica variante
4. Asigna número secuencial
```

### **Paso 4: Mantener Registro**
```
Guarda una hoja Excel paralela con:
SKU | Nombre Completo | Categoría | Precio | Proveedor
```

## 💡 Tips y Mejores Prácticas

### ✅ **Buenas Prácticas**:
- Usa MAYÚSCULAS para mejor legibilidad
- Usa guiones `-` para separar componentes
- Mantén longitud consistente (10-15 caracteres)
- Documenta tu convención en un lugar visible
- No uses caracteres especiales (á, ñ, /, \)
- Usa códigos memorables (`GAT` mejor que `CTG`)

### ❌ **Evita**:
- SKUs demasiado largos: `ALIMENTO-PARA-GATOS-SABOR-POLLO-500G-001` ❌
- SKUs sin estructura: `12345`, `ABC`, `PROD1` ❌
- Espacios: `ALM GAT 500` ❌ (usa `ALM-GAT-500`)
- Números al comenzar: `001-ALM-GAT` ❌ (dificulta ordenar)
- Repetir nombres: `SHAMPOO-SHAMPOO-500` ❌

## 📊 Integración con Código de Barras

### **Si tienes impresora de etiquetas**:
```
1. Creas producto con SKU: ALM-GAT-500-001
2. AdminG genera código de barras automático
3. Imprimes etiqueta
4. Pegas en producto
5. En caja, escaneas y se carga automáticamente
```

### **Formato de código de barras**:
```
EAN-13 (13 dígitos):
7501234567890

UPC-A (12 dígitos):
012345678905

Code 39 (alfanumérico):
*ALM-GAT-500-001*
```

## 🔧 Configuración en AdminG

### **Al crear producto**:
```
┌─────────────────────────────────────┐
│ Nuevo Producto                      │
├─────────────────────────────────────┤
│ SKU: ALM-GAT-500-001                │ ← Aquí escribes tu SKU
│ Nombre: Alimento para gatos 500g   │
│ Categoría: Alimentos                │
│ Precio: $10.00                      │
│ Stock: 50                           │
└─────────────────────────────────────┘
```

### **Si dejas SKU vacío**:
```
AdminG genera automáticamente:
PROD-001, PROD-002, PROD-003...

Problema: No indica qué es el producto
Mejor: Escribe tu propio SKU
```

## 📈 Beneficios del Sistema SKU

1. **Trazabilidad**: Sabes exactamente qué producto se vendió
2. **Control de stock**: Alertas automáticas por SKU específico
3. **Reporting**: Reportes detallados por categoría/tipo/variante
4. **Velocidad**: Búsqueda rápida en caja (escribe 3 letras)
5. **Escalabilidad**: Puedes tener 10,000+ productos organizados
6. **Integraciones**: Compatible con lectores de código de barras
7. **Evita errores**: No confundes productos con nombres similares
8. **Profesionalismo**: Sistema estándar usado mundialmente

## 🎓 Ejemplo Completo: Veterinaria

```
Inventario Inicial:
┌────────────────┬──────────────────────────────┬────────┬────────┐
│ SKU            │ Producto                     │ Precio │ Stock  │
├────────────────┼──────────────────────────────┼────────┼────────┤
│ ALM-PER-500-001│ Alimento perro adulto 500g   │ $8.50  │ 120    │
│ ALM-PER-1KG-002│ Alimento perro adulto 1kg    │ $15.00 │ 80     │
│ ALM-GAT-500-001│ Alimento gato adulto 500g    │ $9.00  │ 95     │
│ MED-ANT-CPS-001│ Antibiótico cefalexina 10cps │ $25.00 │ 40     │
│ SRV-CON-GEN-001│ Consulta general             │ $30.00 │ ∞      │
│ SRV-VAC-RAB-001│ Vacuna antirrábica           │ $18.00 │ ∞      │
│ ACC-COL-MED-001│ Collar mediano ajustable     │ $12.00 │ 25     │
└────────────────┴──────────────────────────────┴────────┴────────┘

Venta del día:
Cliente compra:
- 1x ALM-PER-500-001 (escanea código)
- 1x ACC-COL-MED-001 (busca "COL")

Reporte al final del día:
"Vendidos: 1 ALM-PER-500-001, 1 ACC-COL-MED-001"
¡No hay confusión!
```

## 🚀 Conclusión

El sistema SKU es **ESENCIAL** para negocios que manejan inventario. Aunque AdminG lo hace opcional por simplicidad, **ÚSALO desde el inicio** para:

- Evitar dolores de cabeza futuros
- Tener reportes precisos
- Escalar tu negocio profesionalmente
- Integrarte con sistemas de código de barras

**Recomendación**: Dedica 30 minutos a definir tu convención de SKU ANTES de empezar a cargar productos.

---

**Última actualización**: 19 Feb 2026  
**Versión**: 1.0  
**Estado**: Guía oficial AdminG
