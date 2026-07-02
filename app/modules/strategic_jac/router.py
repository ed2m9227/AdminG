# filepath: app/modules/strategic_jac/router.py
"""
Fase 6 - Anticipación Estratégica (EOE)
Módulos: Strategic Anticipation + Early Warning + Contingency Planning
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/strategic-jac", tags=["strategic-jac"])

# ==================== SCHEMAS ====================

class RiskCreate(BaseModel):
    governance_entity_id: int
    nombre: str
    descripcion: Optional[str] = None
    categoria: str  # financiero, operativo, legal, reputacional, ambiental, seguridad
    nivel_impacto: str = "medio"  # bajo, medio, alto, critico
    nivel_probabilidad: str = "media"  # baja, media, alta
    factores: Optional[str] = None  # JSON array
    indicadores: Optional[str] = None  # JSON array
    plan_contingencia: Optional[str] = None
    responsable: Optional[str] = None
    estado: str = "identificado"

class RiskUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    nivel_impacto: Optional[str] = None
    nivel_probabilidad: Optional[str] = None
    factores: Optional[str] = None
    indicadores: Optional[str] = None
    plan_contingencia: Optional[str] = None
    responsable: Optional[str] = None
    estado: Optional[str] = None

class EarlyWarningCreate(BaseModel):
    governance_entity_id: int
    riesgo_id: int
    indicador: str
    umbral: float
    operador: str  # mayor, menor, igual
    frecuencia: str = "diaria"  # diaria, semanal, mensual
    estado: str = "activo"

class EarlyWarningUpdate(BaseModel):
    indicador: Optional[str] = None
    umbral: Optional[float] = None
    operador: Optional[str] = None
    frecuencia: Optional[str] = None
    estado: Optional[str] = None

class ScenarioCreate(BaseModel):
    governance_entity_id: int
    titulo: str
    descripcion: Optional[str] = None
    tipo: str  # optimista, pesimista, base, alternativo
    probabilidad: int  # 0-100
    impacto_estimado: Optional[float] = None
    acciones_preventivas: Optional[str] = None
    acciones_mitigacion: Optional[str] = None
    indicadores_seguimiento: Optional[str] = None
    estado: str = "borrador"

class ScenarioUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    probabilidad: Optional[int] = None
    impacto_estimado: Optional[float] = None
    acciones_preventivas: Optional[str] = None
    acciones_mitigacion: Optional[str] = None
    indicadores_seguimiento: Optional[str] = None
    estado: Optional[str] = None

class StrategicPlanCreate(BaseModel):
    governance_entity_id: int
    titulo: str
    horizonte: str  # corto (1 año), medio (3 años), largo (5 años)
    vision: Optional[str] = None
    objetivos_estrategicos: Optional[str] = None  # JSON array
    metas: Optional[str] = None  # JSON array
    recursos: Optional[str] = None
    indicadores: Optional[str] = None  # JSON array
    estado: str = "borrador"

class StrategicPlanUpdate(BaseModel):
    titulo: Optional[str] = None
    horizonte: Optional[str] = None
    vision: Optional[str] = None
    objetivos_estrategicos: Optional[str] = None
    metas: Optional[str] = None
    recursos: Optional[str] = None
    indicadores: Optional[str] = None
    estado: Optional[str] = None

# ==================== RISKS ENDPOINTS ====================

@router.post("/risks")
async def create_risk(risk: RiskCreate, owner_user_id: int = 1):
    """Crear nuevo riesgo"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO strategic_risks (
            owner_user_id, governance_entity_id, nombre, descripcion, categoria,
            nivel_impacto, nivel_probabilidad, factores, indicadores, plan_contingencia,
            responsable, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        owner_user_id, risk.governance_entity_id, risk.nombre, risk.descripcion,
        risk.categoria, risk.nivel_impacto, risk.nivel_probabilidad, risk.factores,
        risk.indicadores, risk.plan_contingencia, risk.responsable, risk.estado
    ))
    
    risk_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": risk_id, "message": "Riesgo creado exitosamente"}

@router.get("/risks")
async def list_risks(governance_entity_id: Optional[int] = None, categoria: Optional[str] = None):
    """Listar riesgos"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM strategic_risks WHERE 1=1"
    params = []
    
    if governance_entity_id:
        query += " AND governance_entity_id = ?"
        params.append(governance_entity_id)
    
    if categoria:
        query += " AND categoria = ?"
        params.append(categoria)
    
    query += " ORDER BY created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@router.get("/risks/{risk_id}")
async def get_risk(risk_id: int):
    """Obtener riesgo por ID"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM strategic_risks WHERE id = ?", (risk_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Riesgo no encontrado")
    
    return dict(row)

@router.put("/risks/{risk_id}")
async def update_risk(risk_id: int, risk: RiskUpdate):
    """Actualizar riesgo"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()

    data = risk.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    existing = cursor.execute("SELECT * FROM strategic_risks WHERE id = ?", (risk_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Riesgo no encontrado")

    updated_values = {
        "nombre": existing["nombre"],
        "descripcion": existing["descripcion"],
        "categoria": existing["categoria"],
        "nivel_impacto": existing["nivel_impacto"],
        "nivel_probabilidad": existing["nivel_probabilidad"],
        "factores": existing["factores"],
        "indicadores": existing["indicadores"],
        "plan_contingencia": existing["plan_contingencia"],
        "responsable": existing["responsable"],
        "estado": existing["estado"],
    }
    updated_values.update({key: value for key, value in data.items() if key in updated_values})

    cursor.execute(
        """
        UPDATE strategic_risks
        SET nombre = ?, descripcion = ?, categoria = ?, nivel_impacto = ?, nivel_probabilidad = ?,
            factores = ?, indicadores = ?, plan_contingencia = ?, responsable = ?, estado = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        [
            updated_values["nombre"],
            updated_values["descripcion"],
            updated_values["categoria"],
            updated_values["nivel_impacto"],
            updated_values["nivel_probabilidad"],
            updated_values["factores"],
            updated_values["indicadores"],
            updated_values["plan_contingencia"],
            updated_values["responsable"],
            updated_values["estado"],
            risk_id,
        ],
    )

    conn.commit()
    conn.close()

    return {"message": "Riesgo actualizado exitosamente"}

@router.delete("/risks/{risk_id}")
async def delete_risk(risk_id: int):
    """Eliminar riesgo"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM strategic_risks WHERE id = ?", (risk_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Riesgo eliminado exitosamente"}

@router.get("/risks/heatmap")
async def risk_heatmap(governance_entity_id: int):
    """Mapa de calor de riesgos"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT categoria, nivel_impacto, nivel_probabilidad, COUNT(*) as cantidad
        FROM strategic_risks
        WHERE governance_entity_id = ?
        GROUP BY categoria, nivel_impacto, nivel_probabilidad
    """, (governance_entity_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    # Calculate risk score
    impacto_map = {"bajo": 1, "medio": 2, "alto": 3, "critico": 4}
    probabilidad_map = {"baja": 1, "media": 2, "alta": 3}
    
    heatmap = []
    for row in rows:
        score = impacto_map.get(row["nivel_impacto"], 2) * probabilidad_map.get(row["nivel_probabilidad"], 2)
        heatmap.append({
            "categoria": row["categoria"],
            "impacto": row["nivel_impacto"],
            "probabilidad": row["nivel_probabilidad"],
            "cantidad": row["cantidad"],
            "riesgo_score": score
        })
    
    return sorted(heatmap, key=lambda x: x["riesgo_score"], reverse=True)

# ==================== EARLY WARNING ENDPOINTS ====================

@router.post("/early-warnings")
async def create_early_warning(warning: EarlyWarningCreate, owner_user_id: int = 1):
    """Crear alerta temprana"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO early_warnings (
            owner_user_id, governance_entity_id, riesgo_id, indicador, umbral,
            operador, frecuencia, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        owner_user_id, warning.governance_entity_id, warning.riesgo_id,
        warning.indicador, warning.umbral, warning.operador, warning.frecuencia,
        warning.estado
    ))
    
    warning_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": warning_id, "message": "Alerta temprana creada exitosamente"}

@router.get("/early-warnings")
async def list_early_warnings(governance_entity_id: Optional[int] = None):
    """Listar alertas tempranas"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if governance_entity_id:
        cursor.execute("""
            SELECT w.*, r.nombre as riesgo_nombre
            FROM early_warnings w
            LEFT JOIN strategic_risks r ON w.riesgo_id = r.id
            WHERE w.governance_entity_id = ?
            ORDER BY w.created_at DESC
        """, (governance_entity_id,))
    else:
        cursor.execute("""
            SELECT w.*, r.nombre as riesgo_nombre
            FROM early_warnings w
            LEFT JOIN strategic_risks r ON w.riesgo_id = r.id
            ORDER BY w.created_at DESC
        """)
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@router.get("/early-warnings/{warning_id}")
async def get_early_warning(warning_id: int):
    """Obtener alerta por ID"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT w.*, r.nombre as riesgo_nombre
        FROM early_warnings w
        LEFT JOIN strategic_risks r ON w.riesgo_id = r.id
        WHERE w.id = ?
    """, (warning_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    
    return dict(row)

@router.put("/early-warnings/{warning_id}")
async def update_early_warning(warning_id: int, warning: EarlyWarningUpdate):
    """Actualizar alerta"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()

    data = warning.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    existing = cursor.execute("SELECT * FROM early_warnings WHERE id = ?", (warning_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    updated_values = {
        "indicador": existing["indicador"],
        "umbral": existing["umbral"],
        "operador": existing["operador"],
        "frecuencia": existing["frecuencia"],
        "estado": existing["estado"],
    }
    updated_values.update({key: value for key, value in data.items() if key in updated_values})

    cursor.execute(
        """
        UPDATE early_warnings
        SET indicador = ?, umbral = ?, operador = ?, frecuencia = ?, estado = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        [updated_values["indicador"], updated_values["umbral"], updated_values["operador"], updated_values["frecuencia"], updated_values["estado"], warning_id],
    )

    conn.commit()
    conn.close()

    return {"message": "Alerta actualizada exitosamente"}

@router.delete("/early-warnings/{warning_id}")
async def delete_early_warning(warning_id: int):
    """Eliminar alerta"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM early_warnings WHERE id = ?", (warning_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Alerta eliminada exitosamente"}

@router.get("/early-warnings/active")
async def get_active_warnings(governance_entity_id: int):
    """Obtener alertas activas con trigger"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT w.*, r.nombre as riesgo_nombre
        FROM early_warnings w
        LEFT JOIN strategic_risks r ON w.riesgo_id = r.id
        WHERE w.governance_entity_id = ? AND w.estado = 'activo'
    """, (governance_entity_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    # Simulate warning triggers (in production, this would check actual metrics)
    warnings = []
    for row in rows:
        warnings.append({
            **dict(row),
            "triggered": False,  # Would be calculated from actual data
            "current_value": None
        })
    
    return warnings

# ==================== SCENARIOS ENDPOINTS ====================

@router.post("/scenarios")
async def create_scenario(scenario: ScenarioCreate, owner_user_id: int = 1):
    """Crear escenario"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO strategic_scenarios (
            owner_user_id, governance_entity_id, titulo, descripcion, tipo,
            probabilidad, impacto_estimado, acciones_preventivas, acciones_mitigacion,
            indicadores_seguimiento, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        owner_user_id, scenario.governance_entity_id, scenario.titulo,
        scenario.descripcion, scenario.tipo, scenario.probabilidad,
        scenario.impacto_estimado, scenario.acciones_preventivas,
        scenario.acciones_mitigacion, scenario.indicadores_seguimiento,
        scenario.estado
    ))
    
    scenario_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": scenario_id, "message": "Escenario creado exitosamente"}

@router.get("/scenarios")
async def list_scenarios(governance_entity_id: Optional[int] = None, tipo: Optional[str] = None):
    """Listar escenarios"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM strategic_scenarios WHERE 1=1"
    params = []
    
    if governance_entity_id:
        query += " AND governance_entity_id = ?"
        params.append(governance_entity_id)
    
    if tipo:
        query += " AND tipo = ?"
        params.append(tipo)
    
    query += " ORDER BY probabilidad DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@router.get("/scenarios/{scenario_id}")
async def get_scenario(scenario_id: int):
    """Obtener escenario por ID"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM strategic_scenarios WHERE id = ?", (scenario_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Escenario no encontrado")
    
    return dict(row)

@router.put("/scenarios/{scenario_id}")
async def update_scenario(scenario_id: int, scenario: ScenarioUpdate):
    """Actualizar escenario"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()

    data = scenario.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    existing = cursor.execute("SELECT * FROM strategic_scenarios WHERE id = ?", (scenario_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Escenario no encontrado")

    updated_values = {
        "titulo": existing["titulo"],
        "descripcion": existing["descripcion"],
        "tipo": existing["tipo"],
        "probabilidad": existing["probabilidad"],
        "impacto_estimado": existing["impacto_estimado"],
        "acciones_preventivas": existing["acciones_preventivas"],
        "acciones_mitigacion": existing["acciones_mitigacion"],
        "indicadores_seguimiento": existing["indicadores_seguimiento"],
        "estado": existing["estado"],
    }
    updated_values.update({key: value for key, value in data.items() if key in updated_values})

    cursor.execute(
        """
        UPDATE strategic_scenarios
        SET titulo = ?, descripcion = ?, tipo = ?, probabilidad = ?, impacto_estimado = ?,
            acciones_preventivas = ?, acciones_mitigacion = ?, indicadores_seguimiento = ?, estado = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        [
            updated_values["titulo"],
            updated_values["descripcion"],
            updated_values["tipo"],
            updated_values["probabilidad"],
            updated_values["impacto_estimado"],
            updated_values["acciones_preventivas"],
            updated_values["acciones_mitigacion"],
            updated_values["indicadores_seguimiento"],
            updated_values["estado"],
            scenario_id,
        ],
    )

    conn.commit()
    conn.close()

    return {"message": "Escenario actualizado exitosamente"}

@router.delete("/scenarios/{scenario_id}")
async def delete_scenario(scenario_id: int):
    """Eliminar escenario"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM strategic_scenarios WHERE id = ?", (scenario_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Escenario eliminado exitosamente"}

# ==================== STRATEGIC PLANS ENDPOINTS ====================

@router.post("/plans")
async def create_strategic_plan(plan: StrategicPlanCreate, owner_user_id: int = 1):
    """Crear plan estratégico"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO strategic_plans (
            owner_user_id, governance_entity_id, titulo, horizonte, vision,
            objetivos_estrategicos, metas, recursos, indicadores, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        owner_user_id, plan.governance_entity_id, plan.titulo, plan.horizonte,
        plan.vision, plan.objetivos_estrategicos, plan.metas, plan.recursos,
        plan.indicadores, plan.estado
    ))
    
    plan_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": plan_id, "message": "Plan estratégico creado exitosamente"}

@router.get("/plans")
async def list_strategic_plans(governance_entity_id: Optional[int] = None, horizonte: Optional[str] = None):
    """Listar planes estratégicos"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM strategic_plans WHERE 1=1"
    params = []
    
    if governance_entity_id:
        query += " AND governance_entity_id = ?"
        params.append(governance_entity_id)
    
    if horizonte:
        query += " AND horizonte = ?"
        params.append(horizonte)
    
    query += " ORDER BY created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@router.get("/plans/{plan_id}")
async def get_strategic_plan(plan_id: int):
    """Obtener plan por ID"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM strategic_plans WHERE id = ?", (plan_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    
    return dict(row)

@router.put("/plans/{plan_id}")
async def update_strategic_plan(plan_id: int, plan: StrategicPlanUpdate):
    """Actualizar plan"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()

    data = plan.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    existing = cursor.execute("SELECT * FROM strategic_plans WHERE id = ?", (plan_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    updated_values = {
        "titulo": existing["titulo"],
        "horizonte": existing["horizonte"],
        "vision": existing["vision"],
        "objetivos_estrategicos": existing["objetivos_estrategicos"],
        "metas": existing["metas"],
        "recursos": existing["recursos"],
        "indicadores": existing["indicadores"],
        "estado": existing["estado"],
    }
    updated_values.update({key: value for key, value in data.items() if key in updated_values})

    cursor.execute(
        """
        UPDATE strategic_plans
        SET titulo = ?, horizonte = ?, vision = ?, objetivos_estrategicos = ?, metas = ?, recursos = ?,
            indicadores = ?, estado = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        [
            updated_values["titulo"],
            updated_values["horizonte"],
            updated_values["vision"],
            updated_values["objetivos_estrategicos"],
            updated_values["metas"],
            updated_values["recursos"],
            updated_values["indicadores"],
            updated_values["estado"],
            plan_id,
        ],
    )

    conn.commit()
    conn.close()

    return {"message": "Plan actualizado exitosamente"}

@router.delete("/plans/{plan_id}")
async def delete_strategic_plan(plan_id: int):
    """Eliminar plan"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM strategic_plans WHERE id = ?", (plan_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Plan eliminado exitosamente"}

# ==================== DASHBOARD ====================

@router.get("/dashboard/summary")
async def strategic_dashboard(governance_entity_id: int):
    """Dashboard de anticipación estratégica"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Total riesgos
    cursor.execute(
        "SELECT COUNT(*) as total FROM strategic_risks WHERE governance_entity_id = ?",
        (governance_entity_id,)
    )
    total_riesgos = cursor.fetchone()["total"]
    
    # Riesgos por categoría
    cursor.execute("""
        SELECT categoria, COUNT(*) as cantidad 
        FROM strategic_risks 
        WHERE governance_entity_id = ? 
        GROUP BY categoria
    """, (governance_entity_id,))
    riesgos_por_categoria = [dict(row) for row in cursor.fetchall()]
    
    # Riesgos críticos
    cursor.execute("""
        SELECT COUNT(*) as total 
        FROM strategic_risks 
        WHERE governance_entity_id = ? AND nivel_impacto = 'critico'
    """, (governance_entity_id,))
    riesgos_criticos = cursor.fetchone()["total"]
    
    # Total escenarios
    cursor.execute(
        "SELECT COUNT(*) as total FROM strategic_scenarios WHERE governance_entity_id = ?",
        (governance_entity_id,)
    )
    total_escenarios = cursor.fetchone()["total"]
    
    # Escenarios por tipo
    cursor.execute("""
        SELECT tipo, COUNT(*) as cantidad, AVG(probabilidad) as prob_promedio
        FROM strategic_scenarios 
        WHERE governance_entity_id = ? 
        GROUP BY tipo
    """, (governance_entity_id,))
    escenarios_por_tipo = [dict(row) for row in cursor.fetchall()]
    
    # Planes estratégicos
    cursor.execute(
        "SELECT COUNT(*) as total FROM strategic_plans WHERE governance_entity_id = ?",
        (governance_entity_id,)
    )
    total_planes = cursor.fetchone()["total"]
    
    # Alertas activas
    cursor.execute("""
        SELECT COUNT(*) as total 
        FROM early_warnings 
        WHERE governance_entity_id = ? AND estado = 'activo'
    """, (governance_entity_id,))
    alertas_activas = cursor.fetchone()["total"]
    
    conn.close()
    
    return {
        "riesgos": {
            "total": total_riesgos,
            "por_categoria": riesgos_por_categoria,
            "criticos": riesgos_criticos
        },
        "escenarios": {
            "total": total_escenarios,
            "por_tipo": escenarios_por_tipo
        },
        "planes_estrategicos": total_planes,
        "alertas_activas": alertas_activas
    }