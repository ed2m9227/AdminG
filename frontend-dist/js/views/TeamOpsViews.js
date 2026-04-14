import apiService from '../services/api.service.js';
import modal from '../components/Modal.js';

function formatMoney(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}

export class TeamRisksView {
    constructor() {
        this.risks = [];
        this.incidents = [];
        this.kpis = null;
    }

    render() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Riesgos Laborales (EOE)</h2>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn btn-primary" id="btnOpenRiskModal">+ Nuevo Riesgo</button>
                        <button class="btn btn-danger" id="btnOpenIncidentModal">+ Nuevo Incidente</button>
                    </div>
                </div>
            </div>

            <div class="stats-grid" id="riskKpis"></div>

            <div class="card">
                <div class="card-header"><h3 class="card-title">Riesgos activos</h3></div>
                <div id="risksTable"></div>
            </div>

            <div class="card">
                <div class="card-header"><h3 class="card-title">Incidentes recientes</h3></div>
                <div id="incidentsTable"></div>
            </div>
        `;
    }

    async init() {
        await this.reloadData();

        document.getElementById('btnOpenRiskModal')?.addEventListener('click', () => this.openRiskModal());
        document.getElementById('btnOpenIncidentModal')?.addEventListener('click', () => this.openIncidentModal());
    }

    _bindTabs(modalEl) {
        const tabs = modalEl.querySelectorAll('[data-tab-target]');
        const panels = modalEl.querySelectorAll('[data-tab-panel]');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab-target');
                tabs.forEach(t => t.classList.remove('btn-primary'));
                tabs.forEach(t => t.classList.add('btn-light'));
                tab.classList.add('btn-primary');
                tab.classList.remove('btn-light');

                panels.forEach(p => {
                    p.style.display = p.getAttribute('data-tab-panel') === target ? 'grid' : 'none';
                });
            });
        });
    }

    openRiskModal() {
        const content = `
            <div style="display:flex; gap:8px; margin-bottom:12px;">
                <button class="btn btn-primary btn-sm" data-tab-target="general">General</button>
                <button class="btn btn-light btn-sm" data-tab-target="detalle">Detalle</button>
            </div>

            <div class="form-grid" data-tab-panel="general" style="display:grid;">
                <div class="form-group">
                    <label>Area *</label>
                    <input id="riskArea" class="form-control" placeholder="Ej: Bodega" />
                </div>
                <div class="form-group">
                    <label>Tipo de riesgo *</label>
                    <input id="riskType" class="form-control" placeholder="Ej: Biologico" />
                </div>
                <div class="form-group">
                    <label>Probabilidad (1-5)</label>
                    <input id="riskProb" class="form-control" type="number" min="1" max="5" value="3" />
                </div>
                <div class="form-group">
                    <label>Impacto (1-5)</label>
                    <input id="riskImpact" class="form-control" type="number" min="1" max="5" value="3" />
                </div>
            </div>

            <div class="form-grid" data-tab-panel="detalle" style="display:none;">
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label>Descripción *</label>
                    <textarea id="riskDescription" class="form-control" rows="4" placeholder="Describe el riesgo"></textarea>
                </div>
                <div class="form-group">
                    <label>Responsable (opcional)</label>
                    <input id="riskOwner" class="form-control" type="number" min="1" placeholder="ID usuario" />
                </div>
                <div class="form-group">
                    <label>Acción preventiva (opcional)</label>
                    <input id="riskAction" class="form-control" placeholder="Ej: Señalizar zona" />
                </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
                <button class="btn btn-light" data-close-modal>Cancelar</button>
                <button class="btn btn-primary" data-save-risk>Guardar riesgo</button>
            </div>
        `;

        const modalEl = modal.show({ title: '🦺 Nuevo Riesgo', content, size: 'large' });
        this._bindTabs(modalEl);

        modalEl.addEventListener('click', async (e) => {
            if (e.target.closest('[data-close-modal]')) {
                modal.close(modalEl);
                return;
            }
            if (!e.target.closest('[data-save-risk]')) return;

            try {
                const payload = {
                    area: modalEl.querySelector('#riskArea')?.value?.trim(),
                    risk_type: modalEl.querySelector('#riskType')?.value?.trim(),
                    description: modalEl.querySelector('#riskDescription')?.value?.trim(),
                    probability_level: Number(modalEl.querySelector('#riskProb')?.value || 1),
                    impact_level: Number(modalEl.querySelector('#riskImpact')?.value || 1),
                    owner_user_id: modalEl.querySelector('#riskOwner')?.value ? Number(modalEl.querySelector('#riskOwner').value) : null,
                };

                if (!payload.area || !payload.risk_type || !payload.description) {
                    await modal.alert({ title: 'Validación', message: 'Completa Area, Tipo y Descripción', type: 'warning' });
                    return;
                }

                await apiService.post('/operations/risks', payload);
                modal.close(modalEl);
                await modal.alert({ title: 'Listo', message: 'Riesgo creado correctamente', type: 'success' });
                await this.reloadData();
            } catch (error) {
                await modal.alert({ title: 'Error', message: error.message || 'No se pudo crear el riesgo', type: 'error' });
            }
        });
    }

    openIncidentModal() {
        const content = `
            <div style="display:flex; gap:8px; margin-bottom:12px;">
                <button class="btn btn-primary btn-sm" data-tab-target="general">General</button>
                <button class="btn btn-light btn-sm" data-tab-target="costos">Costos y Detalle</button>
            </div>

            <div class="form-grid" data-tab-panel="general" style="display:grid;">
                <div class="form-group">
                    <label>Area *</label>
                    <input id="incidentArea" class="form-control" placeholder="Ej: Recepcion" />
                </div>
                <div class="form-group">
                    <label>Tipo incidente *</label>
                    <select id="incidentType" class="form-control">
                        <option value="near_miss">Near miss</option>
                        <option value="accident">Accidente</option>
                        <option value="unsafe_condition">Condición insegura</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Personas lesionadas</label>
                    <input id="incidentInjured" class="form-control" type="number" min="0" value="0" />
                </div>
                <div class="form-group">
                    <label>Días perdidos</label>
                    <input id="incidentLostDays" class="form-control" type="number" min="0" value="0" />
                </div>
            </div>

            <div class="form-grid" data-tab-panel="costos" style="display:none;">
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label>Descripción *</label>
                    <textarea id="incidentDescription" class="form-control" rows="3" placeholder="Describe el incidente"></textarea>
                </div>
                <div class="form-group">
                    <label>Costo directo</label>
                    <input id="incidentDirectCost" class="form-control" type="number" min="0" step="0.01" value="0" />
                </div>
                <div class="form-group">
                    <label>Costo indirecto</label>
                    <input id="incidentIndirectCost" class="form-control" type="number" min="0" step="0.01" value="0" />
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label>Causa raíz (opcional)</label>
                    <input id="incidentRootCause" class="form-control" placeholder="Ej: Piso mojado sin señalización" />
                </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
                <button class="btn btn-light" data-close-modal>Cancelar</button>
                <button class="btn btn-danger" data-save-incident>Registrar incidente</button>
            </div>
        `;

        const modalEl = modal.show({ title: '🚨 Nuevo Incidente', content, size: 'large' });
        this._bindTabs(modalEl);

        modalEl.addEventListener('click', async (e) => {
            if (e.target.closest('[data-close-modal]')) {
                modal.close(modalEl);
                return;
            }
            if (!e.target.closest('[data-save-incident]')) return;

            try {
                const payload = {
                    area: modalEl.querySelector('#incidentArea')?.value?.trim(),
                    incident_type: modalEl.querySelector('#incidentType')?.value,
                    injured_people_count: Number(modalEl.querySelector('#incidentInjured')?.value || 0),
                    lost_days: Number(modalEl.querySelector('#incidentLostDays')?.value || 0),
                    direct_cost: Number(modalEl.querySelector('#incidentDirectCost')?.value || 0),
                    indirect_cost: Number(modalEl.querySelector('#incidentIndirectCost')?.value || 0),
                    description: modalEl.querySelector('#incidentDescription')?.value?.trim(),
                    root_cause: modalEl.querySelector('#incidentRootCause')?.value?.trim() || null,
                    report_channel: 'web',
                };

                if (!payload.area || !payload.description) {
                    await modal.alert({ title: 'Validación', message: 'Completa Area y Descripción', type: 'warning' });
                    return;
                }

                await apiService.post('/operations/incidents', payload);
                modal.close(modalEl);
                await modal.alert({ title: 'Listo', message: 'Incidente registrado', type: 'success' });
                await this.reloadData();
            } catch (error) {
                await modal.alert({ title: 'Error', message: error.message || 'No se pudo registrar el incidente', type: 'error' });
            }
        });
    }

    async reloadData() {
        const [risks, incidents, kpis] = await Promise.all([
            apiService.get('/operations/risks').catch(() => []),
            apiService.get('/operations/incidents').catch(() => []),
            apiService.get('/operations/kpis').catch(() => null),
        ]);

        this.risks = Array.isArray(risks) ? risks : [];
        this.incidents = Array.isArray(incidents) ? incidents : [];
        this.kpis = kpis;

        this.renderKpis();
        this.renderRisks();
        this.renderIncidents();
    }

    renderKpis() {
        const el = document.getElementById('riskKpis');
        if (!el || !this.kpis) return;
        const k = this.kpis;
        el.innerHTML = `
            <div class="stat-card"><h3>Incidentes</h3><div class="value">${k.incidents_count || 0}</div></div>
            <div class="stat-card"><h3>Riesgos criticos</h3><div class="value">${k.active_risks_critical || 0}</div></div>
            <div class="stat-card"><h3>Cumplimiento acciones</h3><div class="value">${Number(k.action_compliance_pct || 0).toFixed(1)}%</div></div>
            <div class="stat-card"><h3>Costo por incidente</h3><div class="value">${formatMoney(k.cost_per_incident || 0)}</div></div>
        `;
    }

    renderRisks() {
        const el = document.getElementById('risksTable');
        if (!el) return;
        if (!this.risks.length) {
            el.innerHTML = '<p>No hay riesgos registrados.</p>';
            return;
        }
        el.innerHTML = `
            <div class="table-responsive">
                <table class="table">
                    <thead><tr><th>Area</th><th>Tipo</th><th>Nivel</th><th>Categoria</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${this.risks.map(r => `<tr>
                            <td>${r.area}</td>
                            <td>${r.risk_type}</td>
                            <td>${r.risk_level_auto}</td>
                            <td>${r.category}</td>
                            <td>${r.status}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderIncidents() {
        const el = document.getElementById('incidentsTable');
        if (!el) return;
        if (!this.incidents.length) {
            el.innerHTML = '<p>No hay incidentes registrados.</p>';
            return;
        }
        el.innerHTML = `
            <div class="table-responsive">
                <table class="table">
                    <thead><tr><th>Area</th><th>Tipo</th><th>Lesionados</th><th>Dias perdidos</th><th>Descripcion</th></tr></thead>
                    <tbody>
                        ${this.incidents.map(i => `<tr>
                            <td>${i.area}</td>
                            <td>${i.incident_type}</td>
                            <td>${i.injured_people_count}</td>
                            <td>${i.lost_days}</td>
                            <td>${i.description}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
}

export class TeamExpensesView {
    constructor() {
        this.expenses = [];
    }

    render() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">💸 Gastos Operativos</h2>
                    <button class="btn btn-primary" id="btnOpenExpenseModal">+ Nuevo Gasto</button>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3 class="card-title">Gastos registrados</h3></div>
                <div id="expensesTable"></div>
            </div>
        `;
    }

    async init() {
        await this.reloadData();

        document.getElementById('btnOpenExpenseModal')?.addEventListener('click', () => this.openExpenseModal());
    }

    _bindTabs(modalEl) {
        const tabs = modalEl.querySelectorAll('[data-tab-target]');
        const panels = modalEl.querySelectorAll('[data-tab-panel]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab-target');
                tabs.forEach(t => t.classList.remove('btn-primary'));
                tabs.forEach(t => t.classList.add('btn-light'));
                tab.classList.add('btn-primary');
                tab.classList.remove('btn-light');
                panels.forEach(p => {
                    p.style.display = p.getAttribute('data-tab-panel') === target ? 'grid' : 'none';
                });
            });
        });
    }

    openExpenseModal() {
        const content = `
            <div style="display:flex; gap:8px; margin-bottom:12px;">
                <button class="btn btn-primary btn-sm" data-tab-target="general">General</button>
                <button class="btn btn-light btn-sm" data-tab-target="detalle">Detalle</button>
            </div>

            <div class="form-grid" data-tab-panel="general" style="display:grid;">
                <div class="form-group">
                    <label>Categoria *</label>
                    <select id="expenseCategory" class="form-control">
                        <option value="travel">Travel</option>
                        <option value="operational">Operational</option>
                        <option value="safety">Safety</option>
                        <option value="medical">Medical</option>
                        <option value="equipment">Equipment</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Monto *</label>
                    <input id="expenseAmount" class="form-control" type="number" min="0" step="0.01" />
                </div>
                <div class="form-group">
                    <label>Moneda</label>
                    <input id="expenseCurrency" class="form-control" value="COP" maxlength="10" />
                </div>
                <div class="form-group">
                    <label>Incidente relacionado (ID)</label>
                    <input id="expenseIncidentId" class="form-control" type="number" min="1" />
                </div>
            </div>

            <div class="form-grid" data-tab-panel="detalle" style="display:none;">
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label>Notas</label>
                    <textarea id="expenseNotes" class="form-control" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>URL de soporte/recibo (opcional)</label>
                    <input id="expenseReceipt" class="form-control" placeholder="https://..." />
                </div>
                <div class="form-group">
                    <label>ID Empleado (opcional)</label>
                    <input id="expenseEmployeeId" class="form-control" type="number" min="1" />
                </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
                <button class="btn btn-light" data-close-modal>Cancelar</button>
                <button class="btn btn-primary" data-save-expense>Registrar gasto</button>
            </div>
        `;

        const modalEl = modal.show({ title: '💸 Nuevo Gasto', content, size: 'large' });
        this._bindTabs(modalEl);

        modalEl.addEventListener('click', async (e) => {
            if (e.target.closest('[data-close-modal]')) {
                modal.close(modalEl);
                return;
            }
            if (!e.target.closest('[data-save-expense]')) return;

            try {
                const relatedIncidentRaw = modalEl.querySelector('#expenseIncidentId')?.value;
                const employeeRaw = modalEl.querySelector('#expenseEmployeeId')?.value;
                const payload = {
                    category: modalEl.querySelector('#expenseCategory')?.value,
                    amount: Number(modalEl.querySelector('#expenseAmount')?.value || 0),
                    currency: modalEl.querySelector('#expenseCurrency')?.value?.trim() || 'COP',
                    related_incident_id: relatedIncidentRaw ? Number(relatedIncidentRaw) : null,
                    employee_id: employeeRaw ? Number(employeeRaw) : null,
                    receipt_url: modalEl.querySelector('#expenseReceipt')?.value?.trim() || null,
                    notes: modalEl.querySelector('#expenseNotes')?.value?.trim() || null,
                    channel_origin: 'web',
                };

                if (!payload.category || payload.amount <= 0) {
                    await modal.alert({ title: 'Validación', message: 'Ingresa una categoría y un monto mayor a 0', type: 'warning' });
                    return;
                }

                await apiService.post('/operations/expenses', payload);
                modal.close(modalEl);
                await modal.alert({ title: 'Listo', message: 'Gasto registrado', type: 'success' });
                await this.reloadData();
            } catch (error) {
                await modal.alert({ title: 'Error', message: error.message || 'No se pudo registrar el gasto', type: 'error' });
            }
        });
    }

    async reloadData() {
        this.expenses = await apiService.get('/operations/expenses').catch(() => []);
        this.renderExpenses();
    }

    renderExpenses() {
        const el = document.getElementById('expensesTable');
        if (!el) return;
        if (!this.expenses.length) {
            el.innerHTML = '<p>No hay gastos registrados.</p>';
            return;
        }
        el.innerHTML = `
            <div class="table-responsive">
                <table class="table">
                    <thead><tr><th>Fecha</th><th>Categoria</th><th>Monto</th><th>Estado</th><th>Incidente</th></tr></thead>
                    <tbody>
                        ${this.expenses.map(e => `<tr>
                            <td>${new Date(e.expense_date).toLocaleDateString('es-CO')}</td>
                            <td>${e.category}</td>
                            <td>${formatMoney(e.amount)}</td>
                            <td>${e.status}</td>
                            <td>${e.related_incident_id || '-'}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
}

export const teamRisksView = new TeamRisksView();
export const teamExpensesView = new TeamExpensesView();
