// filepath: frontend-dist/js/views/StrategicView.js
/**
 * Fase 6 - Anticipación Estratégica (EOE)
 * Vista para gestión de riesgos, alertas tempranas y escenarios
 */
export class StrategicView {
    constructor() {
        this.currentTab = 'risks';
    }

    render() {
        return `
            <div class="view-header">
                <h1>🎯 Anticipación Estratégica</h1>
                <p>Gestión de riesgos, alertas tempranas y planificación estratégica</p>
            </div>
            
            <div class="view-tabs">
                <button class="tab-btn active" data-tab="risks">Riesgos</button>
                <button class="tab-btn" data-tab="warnings">Alertas</button>
                <button class="tab-btn" data-tab="scenarios">Escenarios</button>
                <button class="tab-btn" data-tab="plans">Planes</button>
                <button class="tab-btn" data-tab="dashboard">Dashboard</button>
            </div>
            
            <div class="tab-content active" id="risks-tab">
                ${this.renderRisks()}
            </div>
            
            <div class="tab-content" id="warnings-tab">
                ${this.renderWarnings()}
            </div>
            
            <div class="tab-content" id="scenarios-tab">
                ${this.renderScenarios()}
            </div>
            
            <div class="tab-content" id="plans-tab">
                ${this.renderPlans()}
            </div>
            
            <div class="tab-content" id="dashboard-tab">
                ${this.renderDashboard()}
            </div>
        `;
    }

    renderRisks() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Registro de Riesgos</h3>
                    <button class="btn btn-primary" onclick="strategicView.showRiskModal()">
                        + Nuevo Riesgo
                    </button>
                </div>
                <div class="card-body">
                    <div class="filters">
                        <select id="risk-filter" onchange="strategicView.filterRisks()">
                            <option value="">Todas las categorías</option>
                            <option value="financiero">Financiero</option>
                            <option value="operativo">Operativo</option>
                            <option value="legal">Legal</option>
                            <option value="reputacional">Reputacional</option>
                            <option value="ambiental">Ambiental</option>
                            <option value="seguridad">Seguridad</option>
                        </select>
                    </div>
                    <div id="risks-list" class="data-list">
                        <p class="text-muted">Cargando riesgos...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderWarnings() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Sistema de Alertas Tempranas</h3>
                    <button class="btn btn-primary" onclick="strategicView.showWarningModal()">
                        + Nueva Alerta
                    </button>
                </div>
                <div class="card-body">
                    <div id="warnings-list" class="alerts-container">
                        <p class="text-muted">Cargando alertas...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderScenarios() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Escenarios Prospectivos</h3>
                    <button class="btn btn-primary" onclick="strategicView.showScenarioModal()">
                        + Nuevo Escenario
                    </button>
                </div>
                <div class="card-body">
                    <div id="scenarios-list" class="data-list">
                        <p class="text-muted">Cargando escenarios...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderPlans() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Planes Estratégicos</h3>
                    <button class="btn btn-primary" onclick="strategicView.showPlanModal()">
                        + Nuevo Plan
                    </button>
                </div>
                <div class="card-body">
                    <div id="plans-list" class="data-list">
                        <p class="text-muted">Cargando planes...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderDashboard() {
        return `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-value" id="total-risks">-</div>
                    <div class="stat-label">Riesgos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🔴</div>
                    <div class="stat-value" id="critical-risks">-</div>
                    <div class="stat-label">Riesgos Críticos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-value" id="total-scenarios">-</div>
                    <div class="stat-label">Escenarios</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📋</div>
                    <div class="stat-value" id="total-plans">-</div>
                    <div class="stat-label">Planes</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Mapa de Calor de Riesgos</h3>
                </div>
                <div class="card-body">
                    <div id="risk-heatmap" class="heatmap-container">
                        <p class="text-muted">Cargando mapa de calor...</p>
                    </div>
                </div>
            </div>
        `;
    }

    showRiskModal(risk = null) {
        const isEdit = risk ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nuevo'} Riesgo</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="risk-form" onsubmit="strategicView.saveRisk(event)">
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
                                <option value="financiero">Financiero</option>
                                <option value="operativo">Operativo</option>
                                <option value="legal">Legal</option>
                                <option value="reputacional">Reputacional</option>
                                <option value="ambiental">Ambiental</option>
                                <option value="seguridad">Seguridad</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Nivel de Impacto</label>
                            <select name="nivel_impacto">
                                <option value="bajo">Bajo</option>
                                <option value="medio" selected>Medio</option>
                                <option value="alto">Alto</option>
                                <option value="critico">Crítico</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Nivel de Probabilidad</label>
                            <select name="nivel_probabilidad">
                                <option value="baja">Baja</option>
                                <option value="media" selected>Media</option>
                                <option value="alta">Alta</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Factores (JSON)</label>
                            <textarea name="factores" rows="2" placeholder='["factor1", "factor2"]'></textarea>
                        </div>
                        <div class="form-group">
                            <label>Indicadores (JSON)</label>
                            <textarea name="indicadores" rows="2" placeholder='["indicador1", "indicador2"]'></textarea>
                        </div>
                        <div class="form-group">
                            <label>Plan de Contingencia</label>
                            <textarea name="plan_contingencia" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Responsable</label>
                            <input type="text" name="responsable">
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado">
                                <option value="identificado">Identificado</option>
                                <option value="mitigado">Mitigado</option>
                                <option value="transferred">Transferido</option>
                                <option value="aceptado">Aceptado</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${risk ? `<input type="hidden" name="id" value="${risk.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    showWarningModal(warning = null) {
        const isEdit = warning ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nueva'} Alerta Temprana</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="warning-form" onsubmit="strategicView.saveWarning(event)">
                        <div class="form-group">
                            <label>Riesgo Asociado *</label>
                            <select name="riesgo_id" required>
                                <option value="">Seleccionar riesgo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Indicador *</label>
                            <input type="text" name="indicador" required placeholder="Ej: Indicador de liquidez">
                        </div>
                        <div class="form-group">
                            <label>Umbral *</label>
                            <input type="number" name="umbral" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Operador</label>
                            <select name="operador">
                                <option value="mayor">Mayor que</option>
                                <option value="menor">Menor que</option>
                                <option value="igual">Igual a</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Frecuencia</label>
                            <select name="frecuencia">
                                <option value="diaria">Diaria</option>
                                <option value="semanal">Semanal</option>
                                <option value="mensual">Mensual</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado">
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${warning ? `<input type="hidden" name="id" value="${warning.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    showScenarioModal(scenario = null) {
        const isEdit = scenario ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nuevo'} Escenario</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="scenario-form" onsubmit="strategicView.saveScenario(event)">
                        <div class="form-group">
                            <label>Título *</label>
                            <input type="text" name="titulo" required>
                        </div>
                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea name="descripcion" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Tipo *</label>
                            <select name="tipo" required>
                                <option value="">Seleccionar</option>
                                <option value="optimista">Optimista</option>
                                <option value="pesimista">Pesimista</option>
                                <option value="base">Base</option>
                                <option value="alternativo">Alternativo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Probabilidad (%)</label>
                            <input type="number" name="probabilidad" min="0" max="100">
                        </div>
                        <div class="form-group">
                            <label>Impacto Estimado</label>
                            <input type="number" name="impacto_estimado" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Acciones Preventivas</label>
                            <textarea name="acciones_preventivas" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Acciones de Mitigación</label>
                            <textarea name="acciones_mitigacion" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Indicadores de Seguimiento (JSON)</label>
                            <textarea name="indicadores_seguimiento" rows="2" placeholder='["indicador1", "indicador2"]'></textarea>
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado">
                                <option value="borrador">Borrador</option>
                                <option value="activo">Activo</option>
                                <option value="archivado">Archivado</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${scenario ? `<input type="hidden" name="id" value="${scenario.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    showPlanModal(plan = null) {
        const isEdit = plan ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nuevo'} Plan Estratégico</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="plan-form" onsubmit="strategicView.savePlan(event)">
                        <div class="form-group">
                            <label>Título *</label>
                            <input type="text" name="titulo" required>
                        </div>
                        <div class="form-group">
                            <label>Horizonte *</label>
                            <select name="horizonte" required>
                                <option value="">Seleccionar</option>
                                <option value="corto">Corto (1 año)</option>
                                <option value="medio">Medio (3 años)</option>
                                <option value="largo">Largo (5 años)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Visión</label>
                            <textarea name="vision" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Objetivos Estratégicos (JSON)</label>
                            <textarea name="objetivos_estrategicos" rows="2" placeholder='["obj1", "obj2"]'></textarea>
                        </div>
                        <div class="form-group">
                            <label>Metas (JSON)</label>
                            <textarea name="metas" rows="2" placeholder='["meta1", "meta2"]'></textarea>
                        </div>
                        <div class="form-group">
                            <label>Recursos</label>
                            <textarea name="recursos" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Indicadores (JSON)</label>
                            <textarea name="indicadores" rows="2" placeholder='["indicador1", "indicador2"]'></textarea>
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado">
                                <option value="borrador">Borrador</option>
                                <option value="aprobado">Aprobado</option>
                                <option value="en_ejecucion">En Ejecución</option>
                                <option value="completado">Completado</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${plan ? `<input type="hidden" name="id" value="${plan.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    async loadData() {
        try {
            const [risksRes, warningsRes, scenariosRes, plansRes, dashRes, heatmapRes] = await Promise.all([
                fetch('/strategic-jac/risks'),
                fetch('/strategic-jac/early-warnings'),
                fetch('/strategic-jac/scenarios'),
                fetch('/strategic-jac/plans'),
                fetch('/strategic-jac/dashboard/summary'),
                fetch('/strategic-jac/risks/heatmap')
            ]);
            
            const risks = await risksRes.json();
            const warnings = await warningsRes.json();
            const scenarios = await scenariosRes.json();
            const plans = await plansRes.json();
            const dashboard = await dashRes.json();
            const heatmap = await heatmapRes.json();
            
            this.renderRisksList(risks);
            this.renderWarningsList(warnings);
            this.renderScenariosList(scenarios);
            this.renderPlansList(plans);
            this.renderDashboardData(dashboard);
            this.renderHeatmap(heatmap);
        } catch (error) {
            console.error('Error loading strategic data:', error);
        }
    }

    renderRisksList(risks) {
        const container = document.getElementById('risks-list');
        if (!risks || risks.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay riesgos registrados</p>';
            return;
        }
        
        container.innerHTML = risks.map(r => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${r.nombre}</h4>
                    <p>${r.categoria} - ${r.descripcion || ''}</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${r.nivel_impacto === 'critico' ? 'danger' : r.nivel_impacto === 'alto' ? 'warning' : 'success'}">${r.nivel_impacto}</span>
                    <span>${r.nivel_probabilidad}</span>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-sm" onclick="strategicView.showRiskModal(${JSON.stringify(r).replace(/"/g, '&quot;')})">Editar</button>
                </div>
            </div>
        `).join('');
    }

    renderWarningsList(warnings) {
        const container = document.getElementById('warnings-list');
        if (!warnings || warnings.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay alertas configuradas</p>';
            return;
        }
        
        container.innerHTML = warnings.map(w => `
            <div class="alert-item alert-${w.triggered ? 'danger' : 'info'}">
                <strong>${w.indicador}</strong>
                <p>Umbral: ${w.umbral} (${w.operador})</p>
                <span class="badge badge-${w.estado === 'activo' ? 'success' : 'secondary'}">${w.estado}</span>
            </div>
        `).join('');
    }

    renderScenariosList(scenarios) {
        const container = document.getElementById('scenarios-list');
        if (!scenarios || scenarios.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay escenarios registrados</p>';
            return;
        }
        
        container.innerHTML = scenarios.map(s => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${s.titulo}</h4>
                    <p>${s.tipo} - ${s.probabilidad}% probabilidad</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${s.tipo === 'pesimista' ? 'danger' : s.tipo === 'optimista' ? 'success' : 'info'}">${s.tipo}</span>
                    <span>Impacto: ${formatCurrency(s.impacto_estimado || 0)}</span>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-sm" onclick="strategicView.showScenarioModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">Editar</button>
                </div>
            </div>
        `).join('');
    }

    renderPlansList(plans) {
        const container = document.getElementById('plans-list');
        if (!plans || plans.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay planes estratégicos</p>';
            return;
        }
        
        container.innerHTML = plans.map(p => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${p.titulo}</h4>
                    <p>${p.horizonte} - ${p.vision || 'Sin visión'}</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${p.estado === 'en_ejecucion' ? 'primary' : 'warning'}">${p.estado}</span>
                </div>
                <div class="data-item-actions">
                    <button class="btn btn-sm" onclick="strategicView.showPlanModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">Editar</button>
                </div>
            </div>
        `).join('');
    }

    renderDashboardData(dashboard) {
        document.getElementById('total-risks').textContent = dashboard.riesgos?.total || 0;
        document.getElementById('critical-risks').textContent = dashboard.riesgos?.criticos || 0;
        document.getElementById('total-scenarios').textContent = dashboard.escenarios?.total || 0;
        document.getElementById('total-plans').textContent = dashboard.planes_estrategicos || 0;
    }

    renderHeatmap(heatmap) {
        const container = document.getElementById('risk-heatmap');
        if (!heatmap || heatmap.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay datos de riesgos</p>';
            return;
        }
        
        container.innerHTML = heatmap.map(h => `
            <div class="heatmap-item heatmap-${h.riesgo_score >= 9 ? 'high' : h.riesgo_score >= 6 ? 'medium' : 'low'}">
                <strong>${h.categoria}</strong>
                <p>Impacto: ${h.impacto} | Prob: ${h.probabilidad}</p>
                <span>${h.cantidad} riesgos</span>
            </div>
        `).join('');
    }

    async saveRisk(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/strategic-jac/risks/${data.id}` : '/strategic-jac/risks';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Riesgo guardado exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving risk:', error);
        }
    }

    async saveWarning(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const res = await fetch('/strategic-jac/early-warnings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Alerta guardada exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving warning:', error);
        }
    }

    async saveScenario(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/strategic-jac/scenarios/${data.id}` : '/strategic-jac/scenarios';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Escenario guardado exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving scenario:', error);
        }
    }

    async savePlan(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/strategic-jac/plans/${data.id}` : '/strategic-jac/plans';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Plan guardado exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving plan:', error);
        }
    }

    filterRisks() {
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

const strategicView = new StrategicView();
export default strategicView;