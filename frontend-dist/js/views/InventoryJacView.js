// filepath: frontend-dist/js/views/InventoryJacView.js
/**
 * Fase 5 - Inventario y Relaciones Externas
 * Vista para gestión de activos y entidades externas
 */
export class InventoryJacView {
    constructor() {
        this.currentTab = 'assets';
    }

    render() {
        return `
            <div class="view-header">
                <h1>📦 Inventario y Relaciones</h1>
                <p>Gestión de activos, inventario y relaciones externas</p>
            </div>
            
            <div class="view-tabs">
                <button class="tab-btn active" data-tab="assets">Activos</button>
                <button class="tab-btn" data-tab="entities">Entidades Externas</button>
                <button class="tab-btn" data-tab="relationships">Relaciones</button>
                <button class="tab-btn" data-tab="dashboard">Dashboard</button>
            </div>
            
            <div class="tab-content active" id="assets-tab">
                ${this.renderAssets()}
            </div>
            
            <div class="tab-content" id="entities-tab">
                ${this.renderEntities()}
            </div>
            
            <div class="tab-content" id="relationships-tab">
                ${this.renderRelationships()}
            </div>
            
            <div class="tab-content" id="dashboard-tab">
                ${this.renderDashboard()}
            </div>
        `;
    }

    renderAssets() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Activos y Bienes</h3>
                    <button class="btn btn-primary" onclick="inventoryJacView.showAssetModal()">
                        + Nuevo Activo
                    </button>
                </div>
                <div class="card-body">
                    <div class="filters">
                        <select id="asset-filter" onchange="inventoryJacView.filterAssets()">
                            <option value="">Todas las categorías</option>
                            <option value="equipo">Equipo</option>
                            <option value="mobiliario">Mobiliario</option>
                            <option value="vehículo">Vehículo</option>
                            <option value="herramienta">Herramienta</option>
                        </select>
                    </div>
                    <div id="assets-list" class="data-list">
                        <p class="text-muted">Cargando activos...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderEntities() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Entidades Externas</h3>
                    <button class="btn btn-primary" onclick="inventoryJacView.showEntityModal()">
                        + Nueva Entidad
                    </button>
                </div>
                <div class="card-body">
                    <div id="entities-list" class="data-list">
                        <p class="text-muted">Cargando entidades...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderRelationships() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Convenios y Alianzas</h3>
                    <button class="btn btn-primary" onclick="inventoryJacView.showRelationshipModal()">
                        + Nueva Relación
                    </button>
                </div>
                <div class="card-body">
                    <div id="relationships-list" class="data-list">
                        <p class="text-muted">Cargando relaciones...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderDashboard() {
        return `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div class="stat-value" id="total-assets">-</div>
                    <div class="stat-label">Activos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-value" id="asset-value">-</div>
                    <div class="stat-label">Valor Total</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🏢</div>
                    <div class="stat-value" id="total-entities">-</div>
                    <div class="stat-label">Entidades</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🤝</div>
                    <div class="stat-value" id="active-relationships">-</div>
                    <div class="stat-label">Alianzas Activas</div>
                </div>
            </div>
        `;
    }

    showAssetModal(asset = null) {
        const isEdit = asset ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nuevo'} Activo</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="asset-form" onsubmit="inventoryJacView.saveAsset(event)">
                        <div class="form-group">
                            <label>Nombre *</label>
                            <input type="text" name="nombre" required>
                        </div>
                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea name="descripcion" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Categoría *</label>
                            <select name="categoria" required>
                                <option value="">Seleccionar</option>
                                <option value="equipo">Equipo</option>
                                <option value="mobiliario">Mobiliario</option>
                                <option value="vehículo">Vehículo</option>
                                <option value="herramienta">Herramienta</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado">
                                <option value="bueno">Bueno</option>
                                <option value="regular">Regular</option>
                                <option value="malo">Malo</option>
                                <option value="en_reparacion">En Reparación</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Ubicación</label>
                            <input type="text" name="ubicacion">
                        </div>
                        <div class="form-group">
                            <label>Fecha de Adquisición</label>
                            <input type="date" name="fecha_adquisicion">
                        </div>
                        <div class="form-group">
                            <label>Valor de Adquisición</label>
                            <input type="number" name="valor_adquisicion" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Vida Útil (años)</label>
                            <input type="number" name="vida_util_anios">
                        </div>
                        <div class="form-group">
                            <label>Proveedor</label>
                            <input type="text" name="proveedor">
                        </div>
                        <div class="form-group">
                            <label>Número Serial</label>
                            <input type="text" name="numero_serial">
                        </div>
                        <div class="form-group">
                            <label>Observaciones</label>
                            <textarea name="observaciones" rows="2"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${asset ? `<input type="hidden" name="id" value="${asset.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    showEntityModal(entity = null) {
        const isEdit = entity ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nueva'} Entidad Externa</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="entity-form" onsubmit="inventoryJacView.saveEntity(event)">
                        <div class="form-group">
                            <label>Nombre *</label>
                            <input type="text" name="nombre" required>
                        </div>
                        <div class="form-group">
                            <label>Tipo *</label>
                            <select name="tipo" required>
                                <option value="">Seleccionar</option>
                                <option value="gubernamental">Gubernamental</option>
                                <option value="ong">ONG</option>
                                <option value="otra_jac">Otra JAC</option>
                                <option value="empresa">Empresa</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Nivel</label>
                            <select name="nivel">
                                <option value="municipal">Municipal</option>
                                <option value="departamental">Departamental</option>
                                <option value="nacional">Nacional</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>NIT</label>
                            <input type="text" name="nit">
                        </div>
                        <div class="form-group">
                            <label>Dirección</label>
                            <input type="text" name="direccion">
                        </div>
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" name="telefono">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email">
                        </div>
                        <div class="form-group">
                            <label>Nombre de Contacto</label>
                            <input type="text" name="contacto_nombre">
                        </div>
                        <div class="form-group">
                            <label>Cargo del Contacto</label>
                            <input type="text" name="contacto_cargo">
                        </div>
                        <div class="form-group">
                            <label>Teléfono de Contacto</label>
                            <input type="tel" name="contacto_telefono">
                        </div>
                        <div class="form-group">
                            <label>Observaciones</label>
                            <textarea name="observaciones" rows="2"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${entity ? `<input type="hidden" name="id" value="${entity.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    showRelationshipModal(rel = null) {
        const isEdit = rel ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nueva'} Relación</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="relationship-form" onsubmit="inventoryJacView.saveRelationship(event)">
                        <div class="form-group">
                            <label>Entidad Externa *</label>
                            <select name="entidad_externa_id" required>
                                <option value="">Seleccionar entidad</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Tipo de Relación *</label>
                            <select name="tipo_relacion" required>
                                <option value="">Seleccionar</option>
                                <option value="alianza">Alianza</option>
                                <option value="convenio">Convenio</option>
                                <option value="coordinación">Coordinación</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Objeto *</label>
                            <textarea name="objeto" rows="2" required></textarea>
                        </div>
                        <div class="form-group">
                            <label>Fecha Inicio</label>
                            <input type="date" name="fecha_inicio">
                        </div>
                        <div class="form-group">
                            <label>Fecha Fin</label>
                            <input type="date" name="fecha_fin">
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado">
                                <option value="activa">Activa</option>
                                <option value="inactiva">Inactiva</option>
                                <option value="en_negociacion">En Negociación</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Beneficios</label>
                            <textarea name="beneficios" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Obligaciones</label>
                            <textarea name="obligaciones" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Observaciones</label>
                            <textarea name="observaciones" rows="2"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${rel ? `<input type="hidden" name="id" value="${rel.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    async loadData() {
        try {
            const [assetsRes, entitiesRes, relsRes, dashRes] = await Promise.all([
                fetch('/inventory-jac/assets'),
                fetch('/inventory-jac/entities'),
                fetch('/inventory-jac/relationships'),
                fetch('/inventory-jac/assets/dashboard/summary')
            ]);
            
            const assets = await assetsRes.json();
            const entities = await entitiesRes.json();
            const relationships = await relationshipsRes.json();
            const dashboard = await dashRes.json();
            
            this.renderAssetsList(assets);
            this.renderEntitiesList(entities);
            this.renderRelationshipsList(relationships);
            this.renderDashboardData(dashboard);
        } catch (error) {
            console.error('Error loading inventory data:', error);
        }
    }

    renderAssetsList(assets) {
        const container = document.getElementById('assets-list');
        if (!assets || assets.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay activos registrados</p>';
            return;
        }
        
        container.innerHTML = assets.map(a => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${a.nombre}</h4>
                    <p>${a.categoria} - ${a.ubicacion || 'Sin ubicación'}</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${a.estado === 'bueno' ? 'success' : a.estado === 'en_reparacion' ? 'warning' : 'danger'}">${a.estado}</span>
                    <span>${formatCurrency(a.valor_adquisicion || 0)}</span>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-sm" onclick="inventoryJacView.showAssetModal(${JSON.stringify(a).replace(/"/g, '&quot;')})">Editar</button>
                </div>
            </div>
        `).join('');
    }

    renderEntitiesList(entities) {
        const container = document.getElementById('entities-list');
        if (!entities || entities.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay entidades registradas</p>';
            return;
        }
        
        container.innerHTML = entities.map(e => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${e.nombre}</h4>
                    <p>${e.tipo} - ${e.nivel}</p>
                </div>
                <div class="data-item-meta">
                    <span>${e.contacto_nombre || 'Sin contacto'}</span>
                    <span>${e.telefono || ''}</span>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-sm" onclick="inventoryJacView.showEntityModal(${JSON.stringify(e).replace(/"/g, '&quot;')})">Editar</button>
                </div>
            </div>
        `).join('');
    }

    renderRelationshipsList(relationships) {
        const container = document.getElementById('relationships-list');
        if (!relationships || relationships.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay relaciones registradas</p>';
            return;
        }
        
        container.innerHTML = relationships.map(r => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${r.entidad_nombre}</h4>
                    <p>${r.tipo_relacion} - ${r.objeto}</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${r.estado === 'activa' ? 'success' : 'secondary'}">${r.estado}</span>
                    <span>${r.fecha_inicio || ''} - ${r.fecha_fin || 'Indefinido'}</span>
                </div>
            </div>
        `).join('');
    }

    renderDashboardData(dashboard) {
        document.getElementById('total-assets').textContent = dashboard.total_activos || 0;
        document.getElementById('asset-value').textContent = formatCurrency(dashboard.valor_total || 0);
    }

    async saveAsset(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/inventory-jac/assets/${data.id}` : '/inventory-jac/assets';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Activo guardado exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving asset:', error);
        }
    }

    async saveEntity(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/inventory-jac/entities/${data.id}` : '/inventory-jac/entities';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Entidad guardada exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving entity:', error);
        }
    }

    async saveRelationship(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/inventory-jac/relationships/${data.id}` : '/inventory-jac/relationships';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Relación guardada exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving relationship:', error);
        }
    }

    filterAssets() {
        // Filter implementation
    }

    init() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`${e.target.dataset.tab}-tab`).classList.add('active');
            });
        });
        
        this.loadData();
    }
}

const inventoryJacView = new InventoryJacView();
export default inventoryJacView;