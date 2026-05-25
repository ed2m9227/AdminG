// filepath: frontend-dist/js/views/GovernanceView.js
/**
 * Fase 1 - Identidad y Dignatarios
 * Vista para gestión de entidades legales y dignatarios JAC
 */
export class GovernanceView {
    constructor() {
        this.currentEntity = null;
        this.currentTab = 'entities';
    }

    render() {
        return `
            <div class="view-header">
                <h1>🏛️ Gobernanza JAC</h1>
                <p>Gestión de identidad y dignatarios de la Junta de Acción Comunal</p>
            </div>
            
            <div class="view-tabs">
                <button class="tab-btn active" data-tab="entities">Entidades Legales</button>
                <button class="tab-btn" data-tab="dignitaries">Dignatarios</button>
                <button class="tab-btn" data-tab="dashboard">Dashboard</button>
            </div>
            
            <div class="tab-content active" id="entities-tab">
                ${this.renderEntities()}
            </div>
            
            <div class="tab-content" id="dignitaries-tab">
                ${this.renderDignitaries()}
            </div>
            
            <div class="tab-content" id="dashboard-tab">
                ${this.renderDashboard()}
            </div>
        `;
    }

    renderEntities() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Entidades Legales</h3>
                    <button class="btn btn-primary" onclick="governanceView.showEntityModal()">
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

    renderDignitaries() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Dignatarios</h3>
                    <button class="btn btn-primary" onclick="governanceView.showDignitaryModal()">
                        + Nuevo Dignatario
                    </button>
                </div>
                <div class="card-body">
                    <div class="filters">
                        <select id="dignitary-filter" onchange="governanceView.filterDignitaries()">
                            <option value="">Todos los cargos</option>
                            <option value="presidente">Presidente</option>
                            <option value="vicepresidente">Vicepresidente</option>
                            <option value="secretario">Secretario</option>
                            <option value="tesorero">Tesorero</option>
                            <option value="fiscal">Fiscal</option>
                            <option value="vocal">Vocal</option>
                            <option value="suplente">Suplente</option>
                        </select>
                    </div>
                    <div id="dignitaries-list" class="data-list">
                        <p class="text-muted">Cargando dignatarios...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderDashboard() {
        return `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-icon">🏛️</div>
                    <div class="stat-value" id="total-entities">-</div>
                    <div class="stat-label">Entidades Legales</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-value" id="total-dignitaries">-</div>
                    <div class="stat-label">Dignatarios</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-value" id="active-entities">-</div>
                    <div class="stat-label">Entidades Activas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-value" id="expiring-entities">-</div>
                    <div class="stat-label">Por Vencer</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Semáforo de Cumplimiento</h3>
                </div>
                <div class="card-body">
                    <div class="semaphore-container" id="semaphore">
                        <div class="semaphore-item">
                            <div class="semaphore-light green"></div>
                            <span>Legal</span>
                        </div>
                        <div class="semaphore-item">
                            <div class="semaphore-light green"></div>
                            <span>Contable</span>
                        </div>
                        <div class="semaphore-item">
                            <div class="semaphore-light green"></div>
                            <span>Fiscal</span>
                        </div>
                        <div class="semaphore-item">
                            <div class="semaphore-light yellow"></div>
                            <span>Documental</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showEntityModal(entity = null) {
        const isEdit = entity ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nueva'} Entidad Legal</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="entity-form" onsubmit="governanceView.saveEntity(event)">
                        <div class="form-group">
                            <label>Nombre de la Entidad *</label>
                            <input type="text" name="entity_name" required value="${entity?.entity_name || ''}">
                        </div>
                        <div class="form-group">
                            <label>NIT *</label>
                            <input type="text" name="nit" required value="${entity?.nit || ''}">
                        </div>
                        <div class="form-group">
                            <label>Personería Jurídica</label>
                            <input type="text" name="personeria_juridica" value="${entity?.personeria_juridica || ''}">
                        </div>
                        <div class="form-group">
                            <label>Resolución de Reconocimiento</label>
                            <input type="text" name="resolucion_reconocimiento" value="${entity?.resolucion_reconocimiento || ''}">
                        </div>
                        <div class="form-group">
                            <label>Fecha de Vencimiento</label>
                            <input type="date" name="fecha_vencimiento" value="${entity?.fecha_vencimiento || ''}">
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado">
                                <option value="activa" ${entity?.estado === 'activa' ? 'selected' : ''}>Activa</option>
                                <option value="inactiva" ${entity?.estado === 'inactiva' ? 'selected' : ''}>Inactiva</option>
                                <option value="en_proceso" ${entity?.estado === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Libros</label>
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="libro_actas" ${entity?.libro_actas ? 'checked' : ''}> Libro de Actas</label>
                                <label><input type="checkbox" name="libro_asociados" ${entity?.libro_asociados ? 'checked' : ''}> Libro de Asociados</label>
                                <label><input type="checkbox" name="libro_financiero" ${entity?.libro_financiero ? 'checked' : ''}> Libro Financiero</label>
                            </div>
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

    showDignitaryModal(dignitary = null) {
        const isEdit = dignitary ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nuevo'} Dignatario</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="dignitary-form" onsubmit="governanceView.saveDignitary(event)">
                        <div class="form-group">
                            <label>Cargo *</label>
                            <select name="cargo" required>
                                <option value="">Seleccionar cargo</option>
                                <option value="presidente" ${dignitary?.cargo === 'presidente' ? 'selected' : ''}>Presidente</option>
                                <option value="vicepresidente" ${dignitary?.cargo === 'vicepresidente' ? 'selected' : ''}>Vicepresidente</option>
                                <option value="secretario" ${dignitary?.cargo === 'secretario' ? 'selected' : ''}>Secretario</option>
                                <option value="tesorero" ${dignitary?.cargo === 'tesorero' ? 'selected' : ''}>Tesorero</option>
                                <option value="fiscal" ${dignitary?.cargo === 'fiscal' ? 'selected' : ''}>Fiscal</option>
                                <option value="vocal" ${dignitary?.cargo === 'vocal' ? 'selected' : ''}>Vocal</option>
                                <option value="suplente" ${dignitary?.cargo === 'suplente' ? 'selected' : ''}>Suplente</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Nombre Completo *</label>
                            <input type="text" name="nombre_completo" required value="${dignitary?.nombre_completo || ''}">
                        </div>
                        <div class="form-group">
                            <label>Documento de Identidad</label>
                            <input type="text" name="documento" value="${dignitary?.documento || ''}">
                        </div>
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" name="telefono" value="${dignitary?.telefono || ''}">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value="${dignitary?.email || ''}">
                        </div>
                        <div class="form-group">
                            <label>Período Inicio *</label>
                            <input type="date" name="periodo_inicio" required value="${dignitary?.periodo_inicio || ''}">
                        </div>
                        <div class="form-group">
                            <label>Período Fin *</label>
                            <input type="date" name="periodo_fin" required value="${dignitary?.periodo_fin || ''}">
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado">
                                <option value="activo" ${dignitary?.estado === 'activo' ? 'selected' : ''}>Activo</option>
                                <option value="inactivo" ${dignitary?.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${dignitary ? `<input type="hidden" name="id" value="${dignitary.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    async loadData() {
        try {
            // Load entities
            const entitiesRes = await fetch('/identity/legal');
            const entities = await entitiesRes.json();
            this.renderEntitiesList(entities);
            
            // Load dignitaries
            const dignitariesRes = await fetch('/identity/dignitaries');
            const dignitaries = await dignitariesRes.json();
            this.renderDignitariesList(dignitaries);
            
            // Load dashboard
            const dashRes = await fetch('/identity/dashboard');
            const dashboard = await dashRes.json();
            this.renderDashboardData(dashboard);
        } catch (error) {
            console.error('Error loading governance data:', error);
        }
    }

    renderEntitiesList(entities) {
        const container = document.getElementById('entities-list');
        if (!entities || entities.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay entidades legales registradas</p>';
            return;
        }
        
        container.innerHTML = entities.map(entity => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${entity.entity_name}</h4>
                    <p>NIT: ${entity.nit}</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${entity.estado === 'activa' ? 'success' : 'warning'}">${entity.estado}</span>
                    <span>${entity.personeria_juridica || 'Sin personería'}</span>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-sm" onclick="governanceView.showEntityModal(${JSON.stringify(entity).replace(/"/g, '&quot;')})">Editar</button>
                </div>
            </div>
        `).join('');
    }

    renderDignitariesList(dignitaries) {
        const container = document.getElementById('dignitaries-list');
        if (!dignitaries || dignitaries.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay dignatarios registrados</p>';
            return;
        }
        
        container.innerHTML = dignitaries.map(d => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${d.nombre_completo}</h4>
                    <p>${d.cargo_label || d.cargo}</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${d.estado === 'activo' ? 'success' : 'secondary'}">${d.estado}</span>
                    <span>${d.periodo_inicio} - ${d.periodo_fin}</span>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-sm" onclick="governanceView.showDignitaryModal(${JSON.stringify(d).replace(/"/g, '&quot;')})">Editar</button>
                </div>
            </div>
        `).join('');
    }

    renderDashboardData(dashboard) {
        document.getElementById('total-entities').textContent = dashboard.total_entities || 0;
        document.getElementById('total-dignitaries').textContent = dashboard.total_dignitaries || 0;
        document.getElementById('active-entities').textContent = dashboard.active_entities || 0;
        document.getElementById('expiring-entities').textContent = dashboard.expiring_soon || 0;
    }

    async saveEntity(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Convert checkboxes
        data.libro_actas = form.querySelector('[name="libro_actas"]').checked;
        data.libro_asociados = form.querySelector('[name="libro_asociados"]').checked;
        data.libro_financiero = form.querySelector('[name="libro_financiero"]').checked;
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/identity/legal/${data.id}` : '/identity/legal';
            
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
            showNotification('Error al guardar entidad', 'error');
        }
    }

    async saveDignitary(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/identity/dignitaries/${data.id}` : '/identity/dignitaries';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Dignatario guardado exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving dignitary:', error);
            showNotification('Error al guardar dignitario', 'error');
        }
    }

    filterDignitaries() {
        // Filter implementation
    }

    init() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`${e.target.dataset.tab}-tab`).classList.add('active');
                this.currentTab = e.target.dataset.tab;
            });
        });
        
        this.loadData();
    }
}

const governanceView = new GovernanceView();
export default governanceView;