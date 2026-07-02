# filepath: app/modules/inventory_jac/router.py
"""
Fase 5 - Inventario y Relaciones Externas
Módulos: Inventory Management + External Relations
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/inventory-jac", tags=["inventory-jac"])

# ==================== SCHEMAS ====================

class AssetCreate(BaseModel):
    governance_entity_id: int
    nombre: str
    descripcion: Optional[str] = None
    categoria: str  # equipo, mobiliario, vehículo, herramienta, otro
    estado: str = "bueno"  # bueno, regular, malo, en_reparacion
    ubicacion: Optional[str] = None
    fecha_adquisicion: Optional[datetime] = None
    valor_adquisicion: Optional[float] = None
    vida_util_anios: Optional[int] = None
    proveedor: Optional[str] = None
    numero_serial: Optional[str] = None
    observaciones: Optional[str] = None

class AssetUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    estado: Optional[str] = None
    ubicacion: Optional[str] = None
    fecha_adquisicion: Optional[datetime] = None
    valor_adquisicion: Optional[float] = None
    vida_util_anios: Optional[int] = None
    proveedor: Optional[str] = None
    numero_serial: Optional[str] = None
    observaciones: Optional[str] = None

class ExternalEntityCreate(BaseModel):
    governance_entity_id: int
    nombre: str
    tipo: str  # gubernamental, ong, otra_jac, empresa, otro
    nivel: str = "municipal"  # municipal, departamental, nacional
    nit: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    contacto_nombre: Optional[str] = None
    contacto_cargo: Optional[str] = None
    contacto_telefono: Optional[str] = None
    observaciones: Optional[str] = None

class ExternalEntityUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    nivel: Optional[str] = None
    nit: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    contacto_nombre: Optional[str] = None
    contacto_cargo: Optional[str] = None
    contacto_telefono: Optional[str] = None
    observaciones: Optional[str] = None

class RelationshipCreate(BaseModel):
    governance_entity_id: int
    entidad_externa_id: int
    tipo_relacion: str  # alianza, convenio, coordinación, otro
    objeto: str
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    estado: str = "activa"  # activa, inactiva, en_negociacion
    beneficios: Optional[str] = None
    obligaciones: Optional[str] = None
    observaciones: Optional[str] = None

class RelationshipUpdate(BaseModel):
    tipo_relacion: Optional[str] = None
    objeto: Optional[str] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    estado: Optional[str] = None
    beneficios: Optional[str] = None
    obligaciones: Optional[str] = None
    observaciones: Optional[str] = None

# ==================== ASSETS ENDPOINTS ====================

@router.post("/assets")
async def create_asset(asset: AssetCreate, owner_user_id: int = 1):
    """Crear nuevo activo/bien"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO jac_assets (
            owner_user_id, governance_entity_id, nombre, descripcion, categoria,
            estado, ubicacion, fecha_adquisicion, valor_adquisicion, vida_util_anios,
            proveedor, numero_serial, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        owner_user_id, asset.governance_entity_id, asset.nombre, asset.descripcion,
        asset.categoria, asset.estado, asset.ubicacion, asset.fecha_adquisicion,
        asset.valor_adquisicion, asset.vida_util_anios, asset.proveedor,
        asset.numero_serial, asset.observaciones
    ))
    
    asset_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": asset_id, "message": "Activo creado exitosamente"}

@router.get("/assets")
async def list_assets(governance_entity_id: Optional[int] = None):
    """Listar activos"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if governance_entity_id:
        cursor.execute(
            "SELECT * FROM jac_assets WHERE governance_entity_id = ? ORDER BY created_at DESC",
            (governance_entity_id,)
        )
    else:
        cursor.execute("SELECT * FROM jac_assets ORDER BY created_at DESC")
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@router.get("/assets/{asset_id}")
async def get_asset(asset_id: int):
    """Obtener activo por ID"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM jac_assets WHERE id = ?", (asset_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    
    return dict(row)

@router.put("/assets/{asset_id}")
async def update_asset(asset_id: int, asset: AssetUpdate):
    """Actualizar activo"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()

    data = asset.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    existing = cursor.execute("SELECT * FROM jac_assets WHERE id = ?", (asset_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Activo no encontrado")

    updated_values = {
        "nombre": existing["nombre"],
        "descripcion": existing["descripcion"],
        "categoria": existing["categoria"],
        "estado": existing["estado"],
        "ubicacion": existing["ubicacion"],
        "fecha_adquisicion": existing["fecha_adquisicion"],
        "valor_adquisicion": existing["valor_adquisicion"],
        "vida_util_anios": existing["vida_util_anios"],
        "proveedor": existing["proveedor"],
        "numero_serial": existing["numero_serial"],
        "observaciones": existing["observaciones"],
    }
    updated_values.update({key: value for key, value in data.items() if key in updated_values})

    cursor.execute(
        """
        UPDATE jac_assets
        SET nombre = ?, descripcion = ?, categoria = ?, estado = ?, ubicacion = ?,
            fecha_adquisicion = ?, valor_adquisicion = ?, vida_util_anios = ?,
            proveedor = ?, numero_serial = ?, observaciones = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        [
            updated_values["nombre"],
            updated_values["descripcion"],
            updated_values["categoria"],
            updated_values["estado"],
            updated_values["ubicacion"],
            updated_values["fecha_adquisicion"],
            updated_values["valor_adquisicion"],
            updated_values["vida_util_anios"],
            updated_values["proveedor"],
            updated_values["numero_serial"],
            updated_values["observaciones"],
            asset_id,
        ],
    )

    conn.commit()
    conn.close()

    return {"message": "Activo actualizado exitosamente"}

@router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: int):
    """Eliminar activo"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM jac_assets WHERE id = ?", (asset_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Activo eliminado exitosamente"}

@router.get("/assets/{asset_id}/depreciation")
async def calculate_depreciation(asset_id: int):
    """Calcular depreciación de activo"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM jac_assets WHERE id = ?", (asset_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    
    asset = dict(row)
    
    if not asset.get("valor_adquisicion") or not asset.get("vida_util_anios"):
        return {"message": "No hay datos suficientes para calcular depreciación"}
    
    valor = asset["valor_adquisicion"]
    vida_util = asset["vida_util_anios"]
    fecha_adq = asset.get("fecha_adquisicion")
    
    if fecha_adq:
        from datetime import datetime
        try:
            fecha_adq_dt = datetime.strptime(fecha_adq, "%Y-%m-%d %H:%M:%S")
            anos_transcurridos = (datetime.now() - fecha_adq_dt).days / 365
            anos_transcurridos = min(anos_transcurridos, vida_util)
        except:
            anos_transcurridos = 0
    else:
        anos_transcurridos = 0
    
    depreciacion_anual = valor / vida_util
    depreciacion_acumulada = depreciacion_anual * anos_transcurridos
    valor_actual = max(valor - depreciacion_acumulada, 0)
    
    return {
        "asset_id": asset_id,
        "valor_original": valor,
        "vida_util_anios": vida_util,
        "anos_transcurridos": round(anos_transcurridos, 2),
        "depreciacion_anual": round(depreciacion_anual, 2),
        "depreciacion_acumulada": round(depreciacion_acumulada, 2),
        "valor_actual": round(valor_actual, 2)
    }

@router.get("/assets/dashboard/summary")
async def assets_dashboard(governance_entity_id: int):
    """Dashboard de activos"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Total activos
    cursor.execute(
        "SELECT COUNT(*) as total FROM jac_assets WHERE governance_entity_id = ?",
        (governance_entity_id,)
    )
    total = cursor.fetchone()["total"]
    
    # Por estado
    cursor.execute("""
        SELECT estado, COUNT(*) as cantidad 
        FROM jac_assets 
        WHERE governance_entity_id = ? 
        GROUP BY estado
    """, (governance_entity_id,))
    por_estado = [dict(row) for row in cursor.fetchall()]
    
    # Por categoría
    cursor.execute("""
        SELECT categoria, COUNT(*) as cantidad 
        FROM jac_assets 
        WHERE governance_entity_id = ? 
        GROUP BY categoria
    """, (governance_entity_id,))
    por_categoria = [dict(row) for row in cursor.fetchall()]
    
    # Valor total
    cursor.execute("""
        SELECT SUM(valor_adquisicion) as valor_total 
        FROM jac_assets 
        WHERE governance_entity_id = ? AND valor_adquisicion IS NOT NULL
    """, (governance_entity_id,))
    valor_total = cursor.fetchone()["valor_total"] or 0
    
    conn.close()
    
    return {
        "total_activos": total,
        "por_estado": por_estado,
        "por_categoria": por_categoria,
        "valor_total": valor_total
    }

# ==================== EXTERNAL ENTITIES ENDPOINTS ====================

@router.post("/entities")
async def create_entity(entity: ExternalEntityCreate, owner_user_id: int = 1):
    """Crear entidad externa"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO external_entities (
            owner_user_id, governance_entity_id, nombre, tipo, nivel, nit,
            direccion, telefono, email, contacto_nombre, contacto_cargo,
            contacto_telefono, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        owner_user_id, entity.governance_entity_id, entity.nombre, entity.tipo,
        entity.nivel, entity.nit, entity.direccion, entity.telefono, entity.email,
        entity.contacto_nombre, entity.contacto_cargo, entity.contacto_telefono,
        entity.observaciones
    ))
    
    entity_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": entity_id, "message": "Entidad externa creada exitosamente"}

@router.get("/entities")
async def list_entities(governance_entity_id: Optional[int] = None, tipo: Optional[str] = None):
    """Listar entidades externas"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM external_entities WHERE 1=1"
    params = []
    
    if governance_entity_id:
        query += " AND governance_entity_id = ?"
        params.append(governance_entity_id)
    
    if tipo:
        query += " AND tipo = ?"
        params.append(tipo)
    
    query += " ORDER BY created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@router.get("/entities/{entity_id}")
async def get_entity(entity_id: int):
    """Obtener entidad por ID"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM external_entities WHERE id = ?", (entity_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")
    
    return dict(row)

@router.put("/entities/{entity_id}")
async def update_entity(entity_id: int, entity: ExternalEntityUpdate):
    """Actualizar entidad externa"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()

    data = entity.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    existing = cursor.execute("SELECT * FROM external_entities WHERE id = ?", (entity_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    updated_values = {
        "nombre": existing["nombre"],
        "tipo": existing["tipo"],
        "nivel": existing["nivel"],
        "nit": existing["nit"],
        "direccion": existing["direccion"],
        "telefono": existing["telefono"],
        "email": existing["email"],
        "contacto_nombre": existing["contacto_nombre"],
        "contacto_cargo": existing["contacto_cargo"],
        "contacto_telefono": existing["contacto_telefono"],
        "observaciones": existing["observaciones"],
    }
    updated_values.update({key: value for key, value in data.items() if key in updated_values})

    cursor.execute(
        """
        UPDATE external_entities
        SET nombre = ?, tipo = ?, nivel = ?, nit = ?, direccion = ?, telefono = ?,
            email = ?, contacto_nombre = ?, contacto_cargo = ?, contacto_telefono = ?,
            observaciones = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        [
            updated_values["nombre"],
            updated_values["tipo"],
            updated_values["nivel"],
            updated_values["nit"],
            updated_values["direccion"],
            updated_values["telefono"],
            updated_values["email"],
            updated_values["contacto_nombre"],
            updated_values["contacto_cargo"],
            updated_values["contacto_telefono"],
            updated_values["observaciones"],
            entity_id,
        ],
    )

    conn.commit()
    conn.close()

    return {"message": "Entidad actualizada exitosamente"}

@router.delete("/entities/{entity_id}")
async def delete_entity(entity_id: int):
    """Eliminar entidad externa"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM external_entities WHERE id = ?", (entity_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Entidad eliminada exitosamente"}

# ==================== RELATIONSHIPS ENDPOINTS ====================

@router.post("/relationships")
async def create_relationship(relationship: RelationshipCreate, owner_user_id: int = 1):
    """Crear relación con entidad externa"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO external_relationships (
            owner_user_id, governance_entity_id, entidad_externa_id, tipo_relacion,
            objeto, fecha_inicio, fecha_fin, estado, beneficios, obligaciones, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        owner_user_id, relationship.governance_entity_id, relationship.entidad_externa_id,
        relationship.tipo_relacion, relationship.objeto, relationship.fecha_inicio,
        relationship.fecha_fin, relationship.estado, relationship.beneficios,
        relationship.obligaciones, relationship.observaciones
    ))
    
    rel_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": rel_id, "message": "Relación creada exitosamente"}

@router.get("/relationships")
async def list_relationships(governance_entity_id: Optional[int] = None):
    """Listar relaciones"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if governance_entity_id:
        cursor.execute("""
            SELECT r.*, e.nombre as entidad_nombre, e.tipo as entidad_tipo
            FROM external_relationships r
            LEFT JOIN external_entities e ON r.entidad_externa_id = e.id
            WHERE r.governance_entity_id = ?
            ORDER BY r.created_at DESC
        """, (governance_entity_id,))
    else:
        cursor.execute("""
            SELECT r.*, e.nombre as entidad_nombre, e.tipo as entidad_tipo
            FROM external_relationships r
            LEFT JOIN external_entities e ON r.entidad_externa_id = e.id
            ORDER BY r.created_at DESC
        """)
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@router.get("/relationships/{relationship_id}")
async def get_relationship(relationship_id: int):
    """Obtener relación por ID"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT r.*, e.nombre as entidad_nombre, e.tipo as entidad_tipo
        FROM external_relationships r
        LEFT JOIN external_entities e ON r.entidad_externa_id = e.id
        WHERE r.id = ?
    """, (relationship_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Relación no encontrada")
    
    return dict(row)

@router.put("/relationships/{relationship_id}")
async def update_relationship(relationship_id: int, relationship: RelationshipUpdate):
    """Actualizar relación"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()

    data = relationship.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    existing = cursor.execute("SELECT * FROM external_relationships WHERE id = ?", (relationship_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Relación no encontrada")

    updated_values = {
        "tipo_relacion": existing["tipo_relacion"],
        "objeto": existing["objeto"],
        "fecha_inicio": existing["fecha_inicio"],
        "fecha_fin": existing["fecha_fin"],
        "estado": existing["estado"],
        "beneficios": existing["beneficios"],
        "obligaciones": existing["obligaciones"],
        "observaciones": existing["observaciones"],
    }
    updated_values.update({key: value for key, value in data.items() if key in updated_values})

    cursor.execute(
        """
        UPDATE external_relationships
        SET tipo_relacion = ?, objeto = ?, fecha_inicio = ?, fecha_fin = ?, estado = ?,
            beneficios = ?, obligaciones = ?, observaciones = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        [
            updated_values["tipo_relacion"],
            updated_values["objeto"],
            updated_values["fecha_inicio"],
            updated_values["fecha_fin"],
            updated_values["estado"],
            updated_values["beneficios"],
            updated_values["obligaciones"],
            updated_values["observaciones"],
            relationship_id,
        ],
    )

    conn.commit()
    conn.close()

    return {"message": "Relación actualizada exitosamente"}

@router.delete("/relationships/{relationship_id}")
async def delete_relationship(relationship_id: int):
    """Eliminar relación"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM external_relationships WHERE id = ?", (relationship_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Relación eliminada exitosamente"}

@router.get("/relationships/dashboard/summary")
async def relationships_dashboard(governance_entity_id: int):
    """Dashboard de relaciones externas"""
    import sqlite3
    conn = sqlite3.connect("app.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Total entidades
    cursor.execute(
        "SELECT COUNT(*) as total FROM external_entities WHERE governance_entity_id = ?",
        (governance_entity_id,)
    )
    total_entidades = cursor.fetchone()["total"]
    
    # Por tipo
    cursor.execute("""
        SELECT tipo, COUNT(*) as cantidad 
        FROM external_entities 
        WHERE governance_entity_id = ? 
        GROUP BY tipo
    """, (governance_entity_id,))
    por_tipo = [dict(row) for row in cursor.fetchall()]
    
    # Relaciones activas
    cursor.execute("""
        SELECT COUNT(*) as total 
        FROM external_relationships 
        WHERE governance_entity_id = ? AND estado = 'activa'
    """, (governance_entity_id,))
    relaciones_activas = cursor.fetchone()["total"]
    
    # Por estado de relación
    cursor.execute("""
        SELECT estado, COUNT(*) as cantidad 
        FROM external_relationships 
        WHERE governance_entity_id = ? 
        GROUP BY estado
    """, (governance_entity_id,))
    por_estado = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "total_entidades": total_entidades,
        "entidades_por_tipo": por_tipo,
        "relaciones_activas": relaciones_activas,
        "relaciones_por_estado": por_estado
    }