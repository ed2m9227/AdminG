// filepath: frontend-dist/js/views/AssemblyView.js
/**
 * Fase 3 - Asambleas
 * Vista para gestión de assemblies y documentos institucionales
 */
export class AssemblyView {
    constructor() {
        this.currentTab = 'assemblies';
    }

    render() {
        return `
            <div class="view-header">
                <h1>🗳️ Asambleas y Documentos</h1>
                <p>Gestión de assemblies y documentación institucional</p>
            </div>
            
            <div class="view-tabs">
                <button class="tab-btn active" data-tab="assemblies">Asambleas</button>
                <button class="tab-btn" data-tab="documents">Documentos</button>
                <button class="tab-btn" data-tab="dashboard">Dashboard</button>
            </div>
            
            <div class="tab-content active" id="assemblies-tab">
                ${this.renderAssemblies()}
            </div>
            
            <div class="tab-content" id="documents-tab">
                ${this.renderDocuments()}
            </div>
            
            <div class="tab-content" id="dashboard-tab">
                ${this.renderDashboard()}
            </div>
        `;
    }

    renderAssemblies() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Asambleas</h3>
                    <button class="btn btn-primary" onclick="assemblyView.showAssemblyModal()">
                        + Nueva Asamblea
                    </button>
                </div>
                <div class="card-body">
                    <div class="filters">
                        <select id="assembly-filter" onchange="assemblyView.filterAssemblies()">
                            <option value="">Todos los tipos</option>
                            <option value="ordinaria">Ordinaria</option>
                            <option value="extraordinaria">Extraordinaria</option>
                        </select>
                    </div>
                    <div id="assemblies-list" class="data-list">
                        <p class="text-muted">Cargando assemblies...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderDocuments() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Documentos Institucionales</h3>
                    <button class="btn btn-primary" onclick="assemblyView.showDocumentModal()">
                        + Nuevo Documento
                    </button>
                </div>
                <div class="card-body">
                    <div id="documents-list" class="data-list">
                        <p class="text-muted">Cargando documentos...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderDashboard() {
        return `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-icon">🗳️</div>
                    <div class="stat-value" id="total-assemblies">-</div>
                    <div class="stat-label">Asambleas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📄</div>
                    <div class="stat-value" id="total-documents">-</div>
                    <div class="stat-label">Documentos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📋</div>
                    <div class="stat-value" id="pending-approvals">-</div>
                    <div class="stat-label">Por Aprobar</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-value" id="expiring-docs">-</div>
                    <div class="stat-label">Por Vencer</div>
                </div>
            </div>
        `;
    }

    showAssemblyModal(assembly = null) {
        const isEdit = assembly ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nueva'} Asamblea</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="assembly-form" onsubmit="assemblyView.saveAssembly(event)">
                        <div class="form-group">
                            <label>Tipo de Asamblea *</label>
                            <select name="tipo_asamblea" required>
                                <option value="">Seleccionar</option>
                                <option value="ordinaria">Ordinaria</option>
                                <option value="extraordinaria">Extraordinaria</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Número de Asamblea</label>
                            <input type="text" name="numero_asamblea">
                        </div>
                        <div class="form-group">
                            <label>Fecha *</label>
                            <input type="datetime-local" name="fecha" required>
                        </div>
                        <div class="form-group">
                            <label>Lugar</label>
                            <input type="text" name="lugar">
                        </div>
                        <div class="form-group">
                            <label>Hora de Convocatoria</label>
                            <input type="time" name="hora_convocatoria">
                        </div>
                        <div class="form-group">
                            <label>Orden del Día</label>
                            <textarea name="orden_dia" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado">
                                <option value="convocada">Convocada</option>
                                <option value="realizada">Realizada</option>
                                <option value="cancelada">Cancelada</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${assembly ? `<input type="hidden" name="id" value="${assembly.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    showDocumentModal(document = null) {
        const isEdit = document ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nuevo'} Documento</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="document-form" onsubmit="assemblyView.saveDocument(event)">
                        <div class="form-group">
                            <label>Tipo de Documento *</label>
                            <select name="tipo_documento" required>
                                <option value="">Seleccionar</option>
                                <option value="acta">Acta</option>
                                <option value="resolucion">Resolución</option>
                                <option value="acuerdo">Acuerdo</option>
                                <option value="contrato">Contrato</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Número de Documento *</label>
                            <input type="text" name="numero_documento" required>
                        </div>
                        <div class="form-group">
                            <label>Título *</label>
                            <input type="text" name="titulo" required>
                        </div>
                        <div class="form-group">
                            <label>Entidad que Emite</label>
                            <input type="text" name="entidad_emite">
                        </div>
                        <div class="form-group">
                            <label>Fecha del Documento</label>
                            <input type="date" name="fecha_documento">
                        </div>
                        <div class="form-group">
                            <label>Fecha de Vencimiento</label>
                            <input type="date" name="fecha_vencimiento">
                        </div>
                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea name="descripcion" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Importancia</label>
                            <select name="importancia">
                                <option value="baja">Baja</option>
                                <option value="media" selected>Media</option>
                                <option value="alta">Alta</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${document ? `<input type="hidden" name="id" value="${document.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    async loadData() {
        try {
            const [assembliesRes, documentsRes, dashRes] = await Promise.all([
                fetch('/assembly/assemblies'),
                fetch('/assembly/documents'),
                fetch('/assembly/dashboard')
            ]);
            
            const assemblies = await assembliesRes.json();
            const documents = await documentsRes.json();
            const dashboard = await dashRes.json();
            
            this.renderAssembliesList(assemblies);
            this.renderDocumentsList(documents);
            this.renderDashboardData(dashboard);
        } catch (error) {
            console.error('Error loading assembly data:', error);
        }
    }

    renderAssembliesList(assemblies) {
        const container = document.getElementById('assemblies-list');
        if (!assemblies || assemblies.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay assemblies registradas</p>';
            return;
        }
        
        container.innerHTML = assemblies.map(a => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${a.tipo_asambleia} ${a.numero_asambleia || ''}</h4>
                    <p>${a.lugar || 'Sin lugar'} - ${a.fecha}</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${a.estado === 'realizada' ? 'success' : 'warning'}">${a.estado}</span>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-sm" onclick="assemblyView.showAssemblyModal(${JSON.stringify(a).replace(/"/g, '&quot;')})">Editar</button>
                </div>
            </div>
        `).join('');
    }

    renderDocumentsList(documents) {
        const container = document.getElementById('documents-list');
        if (!documents || documents.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay documentos registrados</p>';
            return;
        }
        
        container.innerHTML = documents.map(d => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${d.titulo}</h4>
                    <p>${d.tipo_documento} #${d.numero_documento}</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${d.importancia === 'alta' ? 'danger' : d.importancia === 'media' ? 'warning' : 'success'}">${d.importancia}</span>
                    <span>${d.entidad_emite || 'Sin entidad'}</span>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-sm" onclick="assemblyView.showDocumentModal(${JSON.stringify(d).replace(/"/g, '&quot;')})">Editar</button>
                </div>
            </div>
        `).join('');
    }

    renderDashboardData(dashboard) {
        document.getElementById('total-assemblies').textContent = dashboard.total_assemblies || 0;
        document.getElementById('total-documents').textContent = dashboard.total_documents || 0;
        document.getElementById('pending-approvals').textContent = dashboard.pending_approvals || 0;
        document.getElementById('expiring-docs').textContent = dashboard.expiring_soon || 0;
    }

    async saveAssembly(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/assembly/assemblies/${data.id}` : '/assembly/assemblies';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Asamblea guardada exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving assembly:', error);
        }
    }

    async saveDocument(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/assembly/documents/${data.id}` : '/assembly/documents';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Documento guardado exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving document:', error);
        }
    }

    filterAssemblies() {
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

const assemblyView = new AssemblyView();
export default assemblyView;