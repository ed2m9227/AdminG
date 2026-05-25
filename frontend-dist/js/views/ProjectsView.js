// filepath: frontend-dist/js/views/ProjectsView.js
/**
 * Fase 4 - Proyectos y Participación
 * Vista para gestión de proyectos, PQRS y votaciones
 */
export class ProjectsView {
    constructor() {
        this.currentTab = 'projects';
    }

    render() {
        return `
            <div class="view-header">
                <h1>📋 Proyectos y Participación</h1>
                <p>Gestión de proyectos comunitarios, PQRS y votaciones</p>
            </div>
            
            <div class="view-tabs">
                <button class="tab-btn active" data-tab="projects">Proyectos</button>
                <button class="tab-btn" data-tab="petitions">PQRS</button>
                <button class="tab-btn" data-tab="votes">Votaciones</button>
                <button class="tab-btn" data-tab="dashboard">Dashboard</button>
            </div>
            
            <div class="tab-content active" id="projects-tab">
                ${this.renderProjects()}
            </div>
            
            <div class="tab-content" id="petitions-tab">
                ${this.renderPetitions()}
            </div>
            
            <div class="tab-content" id="votes-tab">
                ${this.renderVotes()}
            </div>
            
            <div class="tab-content" id="dashboard-tab">
                ${this.renderDashboard()}
            </div>
        `;
    }

    renderProjects() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Proyectos Comunitarios</h3>
                    <button class="btn btn-primary" onclick="projectsView.showProjectModal()">
                        + Nuevo Proyecto
                    </button>
                </div>
                <div class="card-body">
                    <div id="projects-list" class="data-list">
                        <p class="text-muted">Cargando proyectos...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderPetitions() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>PQRS - Peticiones, Quejas y Reclamos</h3>
                    <button class="btn btn-primary" onclick="projectsView.showPetitionModal()">
                        + Nueva PQRS
                    </button>
                </div>
                <div class="card-body">
                    <div class="filters">
                        <select id="petition-filter" onchange="projectsView.filterPetitions()">
                            <option value="">Todos los tipos</option>
                            <option value="peticion">Petición</option>
                            <option value="queja">Queja</option>
                            <option value="reclamo">Reclamo</option>
                            <option value="sugerencia">Sugerencia</option>
                        </select>
                    </div>
                    <div id="petitions-list" class="data-list">
                        <p class="text-muted">Cargando PQRS...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderVotes() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Votaciones y Consultas</h3>
                    <button class="btn btn-primary" onclick="projectsView.showVoteModal()">
                        + Nueva Votación
                    </button>
                </div>
                <div class="card-body">
                    <div id="votes-list" class="data-list">
                        <p class="text-muted">Cargando votaciones...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderDashboard() {
        return `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-icon">📁</div>
                    <div class="stat-value" id="total-projects">-</div>
                    <div class="stat-label">Proyectos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📝</div>
                    <div class="stat-value" id="total-petitions">-</div>
                    <div class="stat-label">PQRS</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🗳️</div>
                    <div class="stat-value" id="active-votes">-</div>
                    <div class="stat-label">Votaciones Activas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-value" id="completed-projects">-</div>
                    <div class="stat-label">Proyectos Completados</div>
                </div>
            </div>
        `;
    }

    showProjectModal(project = null) {
        const isEdit = project ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nuevo'} Proyecto</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="project-form" onsubmit="projectsView.saveProject(event)">
                        <div class="form-group">
                            <label>Nombre del Proyecto *</label>
                            <input type="text" name="nombre" required>
                        </div>
                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea name="descripcion" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Tipo de Proyecto</label>
                            <select name="tipo_proyecto">
                                <option value="">Seleccionar</option>
                                <option value="infraestructura">Infraestructura</option>
                                <option value="social">Social</option>
                                <option value="ambiental">Ambiental</option>
                                <option value="cultural">Cultural</option>
                                <option value="deportivo">Deportivo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Problema</label>
                            <textarea name="problema" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Propuesta</label>
                            <textarea name="propuesta" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Presupuesto</label>
                            <input type="number" name="presupuesto" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Fuente de Financiación</label>
                            <input type="text" name="fuente_financiacion">
                        </div>
                        <div class="form-group">
                            <label>Fecha Inicio Previsto</label>
                            <input type="date" name="fecha_inicio_previsto">
                        </div>
                        <div class="form-group">
                            <label>Fecha Fin Previsto</label>
                            <input type="date" name="fecha_fin_previsto">
                        </div>
                        <div class="form-group">
                            <label>Responsable</label>
                            <input type="text" name="responsable">
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado">
                                <option value="propuesta">Propuesta</option>
                                <option value="aprobado">Aprobado</option>
                                <option value="en_ejecucion">En Ejecución</option>
                                <option value="suspendido">Suspendido</option>
                                <option value="completado">Completado</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${project ? `<input type="hidden" name="id" value="${project.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    showPetitionModal(petition = null) {
        const isEdit = petition ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nueva'} PQRS</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="petition-form" onsubmit="projectsView.savePetition(event)">
                        <div class="form-group">
                            <label>Tipo *</label>
                            <select name="tipo" required>
                                <option value="">Seleccionar</option>
                                <option value="peticion">Petición</option>
                                <option value="queja">Queja</option>
                                <option value="reclamo">Reclamo</option>
                                <option value="sugerencia">Sugerencia</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Categoría</label>
                            <select name="categoria">
                                <option value="">Seleccionar</option>
                                <option value="administrativa">Administrativa</option>
                                <option value="financiera">Financiera</option>
                                <option value="servicios">Servicios</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Título *</label>
                            <input type="text" name="titulo" required>
                        </div>
                        <div class="form-group">
                            <label>Descripción *</label>
                            <textarea name="descripcion" rows="4" required></textarea>
                        </div>
                        <div class="form-group">
                            <label>Prioridad</label>
                            <select name="prioridad">
                                <option value="baja">Baja</option>
                                <option value="normal" selected>Normal</option>
                                <option value="alta">Alta</option>
                                <option value="urgente">Urgente</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><input type="checkbox" name="anonimo"> Enviar de forma anónima</label>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${petition ? `<input type="hidden" name="id" value="${petition.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    showVoteModal(vote = null) {
        const isEdit = vote ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nueva'} Votación</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="vote-form" onsubmit="projectsView.saveVote(event)">
                        <div class="form-group">
                            <label>Tipo de Votación *</label>
                            <select name="tipo_votacion" required>
                                <option value="">Seleccionar</option>
                                <option value="consulta">Consulta Comunitaria</option>
                                <option value="eleccion">Elección de Cargos</option>
                                <option value="aprobacion">Aprobación de Proyectos</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Título *</label>
                            <input type="text" name="titulo" required>
                        </div>
                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea name="descripcion" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Opciones (una por línea) *</label>
                            <textarea name="opciones" rows="4" placeholder="Opción 1&#10;Opción 2&#10;Opción 3" required></textarea>
                        </div>
                        <div class="form-group">
                            <label>Fecha de Cierre</label>
                            <input type="datetime-local" name="fecha_cierre">
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado">
                                <option value="borrador">Borrador</option>
                                <option value="abierta">Abierta</option>
                                <option value="cerrada">Cerrada</option>
                                <option value="cancelada">Cancelada</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${vote ? `<input type="hidden" name="id" value="${vote.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    async loadData() {
        try {
            const [projectsRes, petitionsRes, votesRes, dashRes] = await Promise.all([
                fetch('/projects/'),
                fetch('/projects/petitions'),
                fetch('/projects/votes'),
                fetch('/projects/dashboard')
            ]);
            
            const projects = await projectsRes.json();
            const petitions = await petitionsRes.json();
            const votes = await votesRes.json();
            const dashboard = await dashRes.json();
            
            this.renderProjectsList(projects);
            this.renderPetitionsList(petitions);
            this.renderVotesList(votes);
            this.renderDashboardData(dashboard);
        } catch (error) {
            console.error('Error loading projects data:', error);
        }
    }

    renderProjectsList(projects) {
        const container = document.getElementById('projects-list');
        if (!projects || projects.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay proyectos registrados</p>';
            return;
        }
        
        container.innerHTML = projects.map(p => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${p.nombre}</h4>
                    <p>${p.tipo_proyecto || 'Sin tipo'} - ${formatCurrency(p.presupuesto || 0)}</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${p.estado === 'completado' ? 'success' : p.estado === 'en_ejecucion' ? 'primary' : 'warning'}">${p.estado}</span>
                    <span>${p.avance || 0}% avance</span>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-sm" onclick="projectsView.showProjectModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">Editar</button>
                </div>
            </div>
        `).join('');
    }

    renderPetitionsList(petitions) {
        const container = document.getElementById('petitions-list');
        if (!petitions || petitions.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay PQRS registradas</p>';
            return;
        }
        
        container.innerHTML = petitions.map(p => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${p.titulo}</h4>
                    <p>${p.tipo} - ${p.categoria || 'Sin categoría'}</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${p.estado === 'resuelto' ? 'success' : p.prioridad === 'urgente' ? 'danger' : 'warning'}">${p.estado}</span>
                    <span>${p.created_at}</span>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-sm" onclick="projectsView.showPetitionModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">Ver</button>
                </div>
            </div>
        `).join('');
    }

    renderVotesList(votes) {
        const container = document.getElementById('votes-list');
        if (!votes || votes.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay votaciones registradas</p>';
            return;
        }
        
        container.innerHTML = votes.map(v => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${v.titulo}</h4>
                    <p>${v.tipo_votacion} - ${v.quorum || 0} votos</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${v.estado === 'abierta' ? 'success' : 'secondary'}">${v.estado}</span>
                    <span>${v.fecha_cierre || 'Sin fecha'}</span>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-sm" onclick="projectsView.showVoteModal(${JSON.stringify(v).replace(/"/g, '&quot;')})">Editar</button>
                </div>
            </div>
        `).join('');
    }

    renderDashboardData(dashboard) {
        document.getElementById('total-projects').textContent = dashboard.total_projects || 0;
        document.getElementById('total-petitions').textContent = dashboard.total_petitions || 0;
        document.getElementById('active-votes').textContent = dashboard.active_votes || 0;
        document.getElementById('completed-projects').textContent = dashboard.completed_projects || 0;
    }

    async saveProject(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/projects/${data.id}` : '/projects/';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Proyecto guardado exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving project:', error);
        }
    }

    async savePetition(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const res = await fetch('/projects/petitions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('PQRS enviada exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving petition:', error);
        }
    }

    async saveVote(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Convert opciones to array
        data.opciones = data.opciones.split('\n').filter(o => o.trim());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/projects/votes/${data.id}` : '/projects/votes';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Votación guardada exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving vote:', error);
        }
    }

    filterPetitions() {
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

const projectsView = new ProjectsView();
export default projectsView;