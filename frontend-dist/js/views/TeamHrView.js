/**
 * Team HR Views - RRHH (Recursos Humanos)
 * Modal-first UX for Payroll, Requests and Tracking actions.
 */

import authService from '../services/auth.service.js';
import apiService from '../services/api.service.js';
import modal from '../components/Modal.js';

function hasFeature(feat) {
    return (authService.getFeatures() || []).includes(feat);
}

function lockBanner(featureName, planRequired = 'MAX') {
    return `<div class="hr-lock-banner">
        <span>[LOCK]</span>
        <span>Esta funcion requiere plan <strong>${planRequired}</strong> o el permiso <code>${featureName}</code>.</span>
    </div>`;
}

class TeamPayrollView {
    constructor() {
        this._payments = [];
        this._employees = [];
    }

    render() {
        const canView = hasFeature('view_payroll');
        const canManage = hasFeature('manage_payroll');

        if (!canView) return lockBanner('view_payroll');

        const currentMonthPayments = this._getCurrentMonthPayments();
        const totalMonth = currentMonthPayments.reduce((acc, p) => acc + Number(p.net_amount || 0), 0);
        const pending = this._payments.filter(p => p.status === 'pending').length;

        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Nomina</h2>
                    ${canManage ? `<button class="btn btn-primary" id="btnNewPayroll">+ Pago empleado</button>` : ''}
                </div>
                <div class="card-body">
                    <div class="hr-stats-row" id="payrollStats">
                        <div class="hr-stat-card">
                            <span class="hr-stat-label">Empleados activos</span>
                            <span class="hr-stat-value" id="payrollEmployeeCount">${this._employees.length || 0}</span>
                        </div>
                        <div class="hr-stat-card">
                            <span class="hr-stat-label">Total nomina (mes)</span>
                            <span class="hr-stat-value" id="payrollTotal">$ ${totalMonth.toFixed(2)}</span>
                        </div>
                        <div class="hr-stat-card">
                            <span class="hr-stat-label">Pagos pendientes</span>
                            <span class="hr-stat-value" id="payrollPending">${pending}</span>
                        </div>
                    </div>

                    <div id="payrollTable" class="hr-table-wrapper">
                        ${this._renderPayrollTable()}
                    </div>
                </div>
            </div>
        `;
    }

    _renderPayrollTable() {
        if (!this._payments.length) {
            return '<p class="empty-state">No hay pagos registrados.</p>';
        }

        return `<table class="data-table">
            <thead>
                <tr>
                    <th>Empleado</th>
                    <th>Periodo</th>
                    <th>Base</th>
                    <th>Neto</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                </tr>
            </thead>
            <tbody>
                ${this._payments.map(p => `
                    <tr>
                        <td>${p.employee_name}</td>
                        <td>${p.period}</td>
                        <td>$ ${Number(p.base_salary).toFixed(2)}</td>
                        <td>$ ${Number(p.net_amount).toFixed(2)}</td>
                        <td>${p.status === 'pending' ? 'Pendiente' : 'Pagado'}</td>
                        <td>${new Date(p.paid_at || p.created_at).toLocaleDateString('es')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    }

    async init() {
        await this._loadEmployees();
        await this._loadPayments();
        this._attachEvents();
        this._refreshStatsAndTable();
    }

    async _loadEmployees() {
        try {
            const response = await apiService.get('/admin/team/members');
            const source = Array.isArray(response) ? response : (response?.members || response?.data || []);
            this._employees = source.map(e => ({
                id: e.id || e.member_user_id,
                email: e.email || '',
                name: e.full_name || e.name || e.email || 'Empleado',
                relationship_type: e.relationship_type || 'internal_user',
                status: e.status || 'active',
            })).filter(e => e.status !== 'suspended' && e.relationship_type === 'internal_user');
        } catch (_err) {
            this._employees = [];
        }
    }

    async _loadPayments() {
        try {
            const response = await apiService.get('/admin/team/payroll');
            this._payments = Array.isArray(response) ? response : (response?.data || []);
        } catch (_err) {
            this._payments = [];
        }
    }

    _attachEvents() {
        document.getElementById('btnNewPayroll')?.addEventListener('click', () => this._openPayrollModal());
    }

    _openPayrollModal() {
        const employeeOptions = this._employees.length
            ? this._employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')
            : '<option value="">Sin empleados disponibles</option>';

        const content = `
            <div style="display:flex; gap:8px; margin-bottom:12px;">
                <button class="btn btn-primary btn-sm" data-tab-target="general">General</button>
                <button class="btn btn-light btn-sm" data-tab-target="valores">Valores</button>
            </div>

            <div class="form-grid" data-tab-panel="general" style="display:grid;">
                <div class="form-group">
                    <label>Empleado *</label>
                    <select id="payrollEmployeeId" class="form-control" ${this._employees.length ? '' : 'disabled'}>
                        ${employeeOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Periodo *</label>
                    <input type="month" id="payrollPeriod" class="form-control" />
                </div>
            </div>

            <div class="form-grid" data-tab-panel="valores" style="display:none;">
                <div class="form-group">
                    <label>Salario base *</label>
                    <input type="number" id="payrollBase" class="form-control" min="0" step="0.01" />
                </div>
                <div class="form-group">
                    <label>Bonificaciones</label>
                    <input type="number" id="payrollBonus" class="form-control" min="0" step="0.01" value="0" />
                </div>
                <div class="form-group">
                    <label>Deducciones</label>
                    <input type="number" id="payrollDeductions" class="form-control" min="0" step="0.01" value="0" />
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select id="payrollStatus" class="form-control">
                        <option value="paid" selected>Pagado</option>
                        <option value="pending">Pendiente</option>
                    </select>
                </div>
                <div class="form-group" style="grid-column:1 / -1;">
                    <label>Notas</label>
                    <textarea id="payrollNotes" class="form-control" rows="2"></textarea>
                </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
                <button class="btn btn-light" data-close-modal>Cancelar</button>
                <button class="btn btn-primary" data-save-payroll>Guardar pago</button>
            </div>
        `;

        const modalEl = modal.show({ title: 'Pago a empleado', content, size: 'large' });
        this._bindTabs(modalEl);

        modalEl.addEventListener('click', async (e) => {
            if (e.target.closest('[data-close-modal]')) {
                modal.close(modalEl);
                return;
            }
            if (!e.target.closest('[data-save-payroll]')) return;

            const employeeId = Number(modalEl.querySelector('#payrollEmployeeId')?.value || 0);
            const period = modalEl.querySelector('#payrollPeriod')?.value || '';
            const base = Number(modalEl.querySelector('#payrollBase')?.value || 0);
            const bonus = Number(modalEl.querySelector('#payrollBonus')?.value || 0);
            const deductions = Number(modalEl.querySelector('#payrollDeductions')?.value || 0);
            const status = modalEl.querySelector('#payrollStatus')?.value || 'paid';
            const notes = modalEl.querySelector('#payrollNotes')?.value?.trim() || '';

            if (!employeeId || !period || base <= 0) {
                await modal.alert({ title: 'Validacion', message: 'Empleado, periodo y salario base son obligatorios.', type: 'warning' });
                return;
            }

            try {
                const created = await apiService.post('/admin/team/payroll', {
                    employee_id: employeeId,
                    period,
                    base_salary: base,
                    bonus,
                    deductions,
                    status,
                    notes,
                });

                this._payments.unshift(created);

                modal.close(modalEl);
                this._refreshStatsAndTable();
                await modal.showSuccess('Pago registrado.');
            } catch (error) {
                await modal.showError(error?.detail || error?.message || 'No se pudo registrar el pago');
            }
        });
    }

    _refreshStatsAndTable() {
        const currentMonthPayments = this._getCurrentMonthPayments();
        const totalMonth = currentMonthPayments.reduce((acc, p) => acc + Number(p.net_amount || 0), 0);
        const pending = this._payments.filter(p => p.status === 'pending').length;

        const employeeCount = document.getElementById('payrollEmployeeCount');
        const total = document.getElementById('payrollTotal');
        const pendingEl = document.getElementById('payrollPending');
        const table = document.getElementById('payrollTable');

        if (employeeCount) employeeCount.textContent = String(this._employees.length || 0);
        if (total) total.textContent = `$ ${totalMonth.toFixed(2)}`;
        if (pendingEl) pendingEl.textContent = String(pending);
        if (table) table.innerHTML = this._renderPayrollTable();
    }

    _getCurrentMonthPayments() {
        const now = new Date();
        const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return this._payments.filter(payment => (payment.period || '').startsWith(currentPeriod));
    }

    _bindTabs(modalEl) {
        const tabs = modalEl.querySelectorAll('[data-tab-target]');
        const panels = modalEl.querySelectorAll('[data-tab-panel]');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab-target');
                tabs.forEach(t => {
                    t.classList.remove('btn-primary');
                    t.classList.add('btn-light');
                });
                tab.classList.remove('btn-light');
                tab.classList.add('btn-primary');
                panels.forEach(p => {
                    p.style.display = p.getAttribute('data-tab-panel') === target ? 'grid' : 'none';
                });
            });
        });
    }
}

const REQUEST_TYPES = [
    { value: 'vacation', label: 'Vacaciones' },
    { value: 'permission', label: 'Permiso' },
    { value: 'sick_leave', label: 'Incapacidad' },
    { value: 'advance', label: 'Adelanto de salario' },
    { value: 'certificate', label: 'Certificado laboral' },
    { value: 'other', label: 'Otro' },
];

const STATUS_LABELS = {
    pending: { label: 'Pendiente', cls: 'badge-warning' },
    approved: { label: 'Aprobado', cls: 'badge-success' },
    rejected: { label: 'Rechazado', cls: 'badge-danger' },
};

class TeamHrRequestsView {
    constructor() {
        this._requests = [];
    }

    _getScopeOwnerId() {
        const user = this._getCurrentUser();
        return user.parent_user_id || user.id || 'global';
    }

    _getStorageKey() {
        return `hr_requests_scope_${this._getScopeOwnerId()}`;
    }

    _loadRequestsFromStorage() {
        try {
            const raw = localStorage.getItem(this._getStorageKey());
            this._requests = raw ? JSON.parse(raw) : [];
        } catch (_err) {
            this._requests = [];
        }
    }

    _saveRequestsToStorage() {
        try {
            localStorage.setItem(this._getStorageKey(), JSON.stringify(this._requests));
        } catch (_err) {
            // ignore storage failures
        }
    }

    _getCurrentUser() {
        return authService.getCurrentUser() || {};
    }

    _isChildUser() {
        return !!this._getCurrentUser().parent_user_id;
    }

    _canCreateRequest() {
        const canView = hasFeature('view_hr_requests');
        const canManage = hasFeature('manage_hr_requests');
        const user = this._getCurrentUser();
        const isInternalViewer = this._isChildUser() && (user.role === 'viewer' || user.role === 'editor');
        return canView && (canManage || isInternalViewer || user.role === 'manager' || user.role === 'admin');
    }

    _getVisibleRequests() {
        const user = this._getCurrentUser();
        const canManage = hasFeature('manage_hr_requests');
        const isChild = this._isChildUser();

        if (canManage || !isChild) {
            return this._requests;
        }

        return this._requests.filter(r => Number(r.requester_user_id) === Number(user.id));
    }

    render() {
        const canView = hasFeature('view_hr_requests');
        const canManage = hasFeature('manage_hr_requests');
        const canCreate = this._canCreateRequest();

        if (!canView) return lockBanner('view_hr_requests');

        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Solicitudes RRHH</h2>
                    ${canCreate ? '<button class="btn btn-primary" id="btnNewHrRequest">+ Nueva Solicitud</button>' : ''}
                </div>
                <div class="card-body">
                    <div class="hr-filters">
                        <select id="hrReqFilter" class="form-control" style="max-width:180px;">
                            <option value="">Todos los estados</option>
                            <option value="pending">Pendientes</option>
                            <option value="approved">Aprobados</option>
                            <option value="rejected">Rechazados</option>
                        </select>
                    </div>
                    <div id="hrRequestsTable">${this._renderRequestsTable(canManage)}</div>
                </div>
            </div>
        `;
    }

    _renderRequestsTable(canManage) {
        const visible = this._getVisibleRequests();
        if (!visible.length) return '<p class="empty-state">No hay solicitudes registradas.</p>';

        return `<table class="data-table">
            <thead><tr>
                <th>Solicitante</th><th>Tipo</th><th>Descripcion</th><th>Estado</th><th>Fecha</th>
                ${canManage ? '<th>Acciones</th>' : ''}
            </tr></thead>
            <tbody>
                ${visible.map(r => {
                    const s = STATUS_LABELS[r.status] || STATUS_LABELS.pending;
                    const typeLabel = REQUEST_TYPES.find(t => t.value === r.type)?.label || r.type;
                    return `<tr>
                        <td>${r.requester_name || '-'}</td>
                        <td>${typeLabel}</td>
                        <td>${r.description}</td>
                        <td><span class="badge ${s.cls}">${s.label}</span></td>
                        <td>${r.created_at ? new Date(r.created_at).toLocaleDateString('es') : '-'}</td>
                        ${canManage ? `<td>
                            <button class="btn btn-sm btn-success" data-approve="${r.id}">Aprobar</button>
                            <button class="btn btn-sm btn-danger" data-reject="${r.id}">Rechazar</button>
                        </td>` : ''}
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    }

    async init() {
        this._loadRequestsFromStorage();
        this._attachEvents();
        const table = document.getElementById('hrRequestsTable');
        if (table) table.innerHTML = this._renderRequestsTable(hasFeature('manage_hr_requests'));
        this._bindActionButtons();
    }

    _attachEvents() {
        document.getElementById('btnNewHrRequest')?.addEventListener('click', () => this._openRequestModal());

        document.getElementById('hrReqFilter')?.addEventListener('change', () => {
            const filter = document.getElementById('hrReqFilter')?.value || '';
            const canManage = hasFeature('manage_hr_requests');
            const base = !filter ? this._requests : this._requests.filter(r => r.status === filter);
            const backup = this._requests;
            this._requests = base;
            document.getElementById('hrRequestsTable').innerHTML = this._renderRequestsTable(canManage);
            this._requests = backup;
            this._bindActionButtons();
        });

        this._bindActionButtons();
    }

    _bindActionButtons() {
        document.querySelectorAll('[data-approve]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.getAttribute('data-approve'));
                const req = this._requests.find(r => Number(r.id) === id);
                if (!req) return;
                req.status = 'approved';
                this._saveRequestsToStorage();
                document.getElementById('hrRequestsTable').innerHTML = this._renderRequestsTable(hasFeature('manage_hr_requests'));
                this._bindActionButtons();
            });
        });

        document.querySelectorAll('[data-reject]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.getAttribute('data-reject'));
                const req = this._requests.find(r => Number(r.id) === id);
                if (!req) return;
                req.status = 'rejected';
                this._saveRequestsToStorage();
                document.getElementById('hrRequestsTable').innerHTML = this._renderRequestsTable(hasFeature('manage_hr_requests'));
                this._bindActionButtons();
            });
        });
    }

    _openRequestModal() {
        const content = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Tipo de solicitud *</label>
                    <select id="hrReqType" class="form-control">
                        <option value="">-- Selecciona --</option>
                        ${REQUEST_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Fecha inicio</label>
                    <input type="date" id="hrReqStart" class="form-control" />
                </div>
                <div class="form-group">
                    <label>Fecha fin</label>
                    <input type="date" id="hrReqEnd" class="form-control" />
                </div>
                <div class="form-group" style="grid-column:1 / -1;">
                    <label>Descripcion *</label>
                    <textarea id="hrReqDescription" class="form-control" rows="3" placeholder="Describe detalladamente tu solicitud..."></textarea>
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
                <button class="btn btn-light" data-close-modal>Cancelar</button>
                <button class="btn btn-primary" data-save-request>Guardar solicitud</button>
            </div>
        `;

        const modalEl = modal.show({ title: 'Nueva Solicitud RRHH', content, size: 'large' });

        modalEl.addEventListener('click', async (e) => {
            if (e.target.closest('[data-close-modal]')) {
                modal.close(modalEl);
                return;
            }
            if (!e.target.closest('[data-save-request]')) return;

            const type = modalEl.querySelector('#hrReqType')?.value || '';
            const description = modalEl.querySelector('#hrReqDescription')?.value?.trim() || '';
            const start = modalEl.querySelector('#hrReqStart')?.value || null;
            const end = modalEl.querySelector('#hrReqEnd')?.value || null;
            const user = this._getCurrentUser();

            if (!type || !description) {
                await modal.alert({ title: 'Validacion', message: 'Tipo y descripcion son obligatorios.', type: 'warning' });
                return;
            }

            this._requests.unshift({
                id: Date.now(),
                type,
                description,
                start_date: start,
                end_date: end,
                status: 'pending',
                requester_user_id: user.id,
                requester_name: user.email || 'Usuario interno',
                created_at: new Date().toISOString(),
            });
            this._saveRequestsToStorage();

            modal.close(modalEl);
            document.getElementById('hrRequestsTable').innerHTML = this._renderRequestsTable(hasFeature('manage_hr_requests'));
            this._bindActionButtons();
            await modal.showSuccess('Solicitud registrada.');
        });
    }
}

class TeamHrTrackingView {
    constructor() {
        this._evaluations = [];
        this._trainings = [];
    }

    render() {
        const canView = hasFeature('view_hr_tracking');
        if (!canView) return lockBanner('view_hr_tracking', 'PRO/MAX');

        const canManage = hasFeature('manage_hr');

        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Seguimiento RRHH</h2>
                </div>
                <div class="card-body">
                    <div class="hr-tracking-grid">
                        <div class="hr-tracking-section">
                            <h4>Asistencia y Puntualidad</h4>
                            <div class="hr-stats-row">
                                <div class="hr-stat-card"><span class="hr-stat-label">Presentes hoy</span><span class="hr-stat-value" id="trackPresent">-</span></div>
                                <div class="hr-stat-card"><span class="hr-stat-label">Ausentes</span><span class="hr-stat-value" id="trackAbsent">-</span></div>
                                <div class="hr-stat-card"><span class="hr-stat-label">Tardanzas (mes)</span><span class="hr-stat-value" id="trackLate">-</span></div>
                            </div>
                        </div>

                        <div class="hr-tracking-section">
                            <h4>Desempeno del Equipo</h4>
                            <div class="hr-performance-placeholder">
                                <p>Metricas de evaluacion.</p>
                                ${canManage ? `<button class="btn btn-primary btn-sm" id="btnEvaluation">+ Iniciar evaluacion</button>` : ''}
                            </div>
                            <div id="evaluationList" class="hr-table-wrapper" style="margin-top:8px;">
                                ${this._renderEvaluationList()}
                            </div>
                        </div>

                        <div class="hr-tracking-section">
                            <h4>Capacitaciones y Certificaciones</h4>
                            <div id="trainingList" class="hr-table-wrapper">${this._renderTrainingList()}</div>
                            ${canManage ? `<button class="btn btn-primary btn-sm" id="btnNewTraining" style="margin-top:8px;">+ Programar Capacitacion</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _renderEvaluationList() {
        if (!this._evaluations.length) return '<p class="empty-state">Sin evaluaciones iniciadas.</p>';
        return `<table class="data-table">
            <thead><tr><th>Empleado</th><th>Periodo</th><th>Objetivo</th><th>Estado</th></tr></thead>
            <tbody>
                ${this._evaluations.map(e => `<tr>
                    <td>${e.employee}</td>
                    <td>${e.period}</td>
                    <td>${e.goal}</td>
                    <td>${e.status}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    }

    _renderTrainingList() {
        if (!this._trainings.length) return '<p class="empty-state">Sin capacitaciones programadas.</p>';
        return `<table class="data-table">
            <thead><tr><th>Tema</th><th>Fecha</th><th>Responsable</th><th>Modalidad</th></tr></thead>
            <tbody>
                ${this._trainings.map(t => `<tr>
                    <td>${t.topic}</td>
                    <td>${t.date}</td>
                    <td>${t.owner}</td>
                    <td>${t.mode}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    }

    async init() {
        const el = (id) => document.getElementById(id);
        if (el('trackPresent')) el('trackPresent').textContent = '-';
        if (el('trackAbsent')) el('trackAbsent').textContent = '-';
        if (el('trackLate')) el('trackLate').textContent = '-';

        document.getElementById('btnEvaluation')?.addEventListener('click', () => this._openEvaluationModal());
        document.getElementById('btnNewTraining')?.addEventListener('click', () => this._openTrainingModal());
    }

    _openEvaluationModal() {
        const content = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Empleado</label>
                    <input id="evalEmployee" class="form-control" placeholder="Nombre empleado" />
                </div>
                <div class="form-group">
                    <label>Periodo</label>
                    <input id="evalPeriod" class="form-control" type="month" />
                </div>
                <div class="form-group" style="grid-column:1 / -1;">
                    <label>Objetivo</label>
                    <textarea id="evalGoal" class="form-control" rows="2" placeholder="Objetivo de la evaluacion"></textarea>
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
                <button class="btn btn-light" data-close-modal>Cancelar</button>
                <button class="btn btn-primary" data-save-eval>Crear evaluacion</button>
            </div>
        `;

        const modalEl = modal.show({ title: 'Iniciar evaluacion', content, size: 'large' });
        modalEl.addEventListener('click', async (e) => {
            if (e.target.closest('[data-close-modal]')) {
                modal.close(modalEl);
                return;
            }
            if (!e.target.closest('[data-save-eval]')) return;

            const employee = modalEl.querySelector('#evalEmployee')?.value?.trim() || '';
            const period = modalEl.querySelector('#evalPeriod')?.value || '';
            const goal = modalEl.querySelector('#evalGoal')?.value?.trim() || '';

            if (!employee || !period || !goal) {
                await modal.alert({ title: 'Validacion', message: 'Empleado, periodo y objetivo son obligatorios.', type: 'warning' });
                return;
            }

            this._evaluations.unshift({ employee, period, goal, status: 'Abierta' });
            modal.close(modalEl);
            const list = document.getElementById('evaluationList');
            if (list) list.innerHTML = this._renderEvaluationList();
            await modal.showSuccess('Evaluacion iniciada.');
        });
    }

    _openTrainingModal() {
        const content = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Tema</label>
                    <input id="trainTopic" class="form-control" placeholder="Tema de capacitacion" />
                </div>
                <div class="form-group">
                    <label>Fecha</label>
                    <input id="trainDate" class="form-control" type="date" />
                </div>
                <div class="form-group">
                    <label>Responsable</label>
                    <input id="trainOwner" class="form-control" placeholder="Responsable" />
                </div>
                <div class="form-group">
                    <label>Modalidad</label>
                    <select id="trainMode" class="form-control">
                        <option value="Presencial">Presencial</option>
                        <option value="Virtual">Virtual</option>
                        <option value="Hibrida">Hibrida</option>
                    </select>
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
                <button class="btn btn-light" data-close-modal>Cancelar</button>
                <button class="btn btn-primary" data-save-training>Programar</button>
            </div>
        `;

        const modalEl = modal.show({ title: 'Programar capacitacion', content, size: 'large' });
        modalEl.addEventListener('click', async (e) => {
            if (e.target.closest('[data-close-modal]')) {
                modal.close(modalEl);
                return;
            }
            if (!e.target.closest('[data-save-training]')) return;

            const topic = modalEl.querySelector('#trainTopic')?.value?.trim() || '';
            const date = modalEl.querySelector('#trainDate')?.value || '';
            const owner = modalEl.querySelector('#trainOwner')?.value?.trim() || '';
            const mode = modalEl.querySelector('#trainMode')?.value || 'Presencial';

            if (!topic || !date || !owner) {
                await modal.alert({ title: 'Validacion', message: 'Tema, fecha y responsable son obligatorios.', type: 'warning' });
                return;
            }

            this._trainings.unshift({ topic, date, owner, mode });
            modal.close(modalEl);
            const list = document.getElementById('trainingList');
            if (list) list.innerHTML = this._renderTrainingList();
            await modal.showSuccess('Capacitacion programada.');
        });
    }
}

export const teamPayrollView = new TeamPayrollView();
export const teamHrRequestsView = new TeamHrRequestsView();
export const teamHrTrackingView = new TeamHrTrackingView();
