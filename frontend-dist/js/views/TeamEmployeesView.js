/**
 * Team Employees View - RRHH Empleados/Usuarios internos
 * Usa modal para crear/ver detalle (sin rerender de pantalla completa).
 */

import authService from '../services/auth.service.js';
import apiService from '../services/api.service.js';
import modal from '../components/Modal.js';

const BUSINESS_ROLE_LABELS = {
    veterinaria: { viewer: 'Assistant', manager: 'Veterinarian', admin: 'Administrator' },
    barberia: { viewer: 'Assistant', manager: 'Barber', admin: 'Manager' },
    salon: { viewer: 'Assistant', manager: 'Stylist', admin: 'Manager' },
    spa: { viewer: 'Assistant', manager: 'Therapist', admin: 'Manager' },
    consultorio: { viewer: 'Assistant', manager: 'Professional', admin: 'Director' },
    clinica: { viewer: 'Assistant', manager: 'Professional', admin: 'Director' },
    dentista: { viewer: 'Assistant', manager: 'Dentist', admin: 'Director' },
    dental: { viewer: 'Assistant', manager: 'Dentist', admin: 'Director' },
    nutricion: { viewer: 'Assistant', manager: 'Nutritionist', admin: 'Director' },
    fisioterapia: { viewer: 'Assistant', manager: 'Physiotherapist', admin: 'Director' },
    medicina_general: { viewer: 'Assistant', manager: 'Doctor', admin: 'Director' },
    propiedad_horizontal: { viewer: 'Assistant', manager: 'Supervisor', admin: 'Administrator' },
    general: { viewer: 'Internal user', manager: 'Internal user', admin: 'Manager' },
};

function hasFeature(feat) {
    return (authService.getFeatures() || []).includes(feat);
}

function lockBanner(featureName, planRequired = 'STARTER') {
    return `<div class="hr-lock-banner">
        <span>[LOCK]</span>
        <span>Esta funcion requiere <strong>${planRequired}</strong> o permiso <code>${featureName}</code>.</span>
    </div>`;
}

function getActorLabel(role = 'manager') {
    const user = authService.getCurrentUser();
    const bizType = user?.business_type || 'general';
    const labels = BUSINESS_ROLE_LABELS[bizType] || BUSINESS_ROLE_LABELS.general;
    return labels[role] || labels.manager;
}

class TeamEmployeesView {
    constructor() {
        this.employees = [];
        this.filteredEmployees = [];
    }

    render() {
        const canView = hasFeature('view_team');
        const canManage = hasFeature('manage_team_users');

        if (!canView) return lockBanner('view_team');

        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Equipo de Trabajo</h2>
                    ${canManage ? '<button class="btn btn-primary" id="btnNewEmployee">+ Crear Usuario Interno</button>' : ''}
                </div>
                <div class="card-body">
                    <div class="employees-filters" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
                        <input type="text" id="empSearch" class="form-control" placeholder="Buscar por nombre o email..." style="max-width:300px;" />
                        <select id="empRoleFilter" class="form-control" style="max-width:220px;">
                            <option value="">Todos los roles</option>
                            <option value="viewer">${getActorLabel('viewer')}</option>
                            <option value="editor">Editor</option>
                            <option value="manager">${getActorLabel('manager')}</option>
                            <option value="admin">${getActorLabel('admin')}</option>
                        </select>
                        <select id="empStatusFilter" class="form-control" style="max-width:220px;">
                            <option value="">Todos los estados</option>
                            <option value="active">Activos</option>
                            <option value="invited">Invitados</option>
                            <option value="suspended">Suspendidos</option>
                        </select>
                    </div>

                    <div id="employeesTable" class="employees-table-wrapper">
                        <p class="empty-state">Cargando empleados...</p>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        this._attachEvents();
        await this._loadEmployees();
        this._renderTable();
    }

    _attachEvents() {
        document.getElementById('btnNewEmployee')?.addEventListener('click', () => this._openCreateModal());

        document.getElementById('empSearch')?.addEventListener('input', () => {
            this._applyFilters();
            this._renderTable();
        });
        document.getElementById('empRoleFilter')?.addEventListener('change', () => {
            this._applyFilters();
            this._renderTable();
        });
        document.getElementById('empStatusFilter')?.addEventListener('change', () => {
            this._applyFilters();
            this._renderTable();
        });
    }

    async _loadEmployees() {
        try {
            const response = await apiService.get('/admin/team/members');
            const source = Array.isArray(response)
                ? response
                : (response?.members || response?.data || []);

            this.employees = source.map(emp => ({
                id: emp.id || emp.member_user_id,
                email: emp.email || emp.member_email || '',
                full_name: emp.full_name || emp.name || (emp.email ? emp.email.split('@')[0] : 'Usuario'),
                role_in_team: emp.role_in_team || emp.role || 'viewer',
                status: emp.status || 'active',
                joined_at: emp.joined_at || emp.created_at || null,
                ...emp,
            }));

            this._applyFilters();
        } catch (err) {
            this.employees = [];
            this.filteredEmployees = [];
            modal.showError('Error al cargar empleados: ' + (err?.detail || err?.message || 'Error desconocido'));
        }
    }

    _applyFilters() {
        const searchTerm = (document.getElementById('empSearch')?.value || '').toLowerCase();
        const roleFilter = document.getElementById('empRoleFilter')?.value || '';
        const statusFilter = document.getElementById('empStatusFilter')?.value || '';

        this.filteredEmployees = this.employees.filter(emp => {
            const email = (emp.email || '').toLowerCase();
            const name = (emp.full_name || '').toLowerCase();
            const matchesSearch = !searchTerm || email.includes(searchTerm) || name.includes(searchTerm);
            const matchesRole = !roleFilter || emp.role_in_team === roleFilter || emp.role === roleFilter;
            const matchesStatus = !statusFilter || emp.status === statusFilter;
            return matchesSearch && matchesRole && matchesStatus;
        });
    }

    _renderTable() {
        const canManage = hasFeature('manage_team_users');
        const table = document.getElementById('employeesTable');
        if (!table) return;

        if (!this.filteredEmployees.length) {
            table.innerHTML = '<p class="empty-state">No hay integrantes en el equipo aun.</p>';
            return;
        }

        const statusBadges = {
            active: { label: 'Activo', cls: 'badge-success' },
            invited: { label: 'Invitado', cls: 'badge-warning' },
            suspended: { label: 'Suspendido', cls: 'badge-danger' },
        };

        table.innerHTML = `
            <table class="data-table employees-table">
                <thead>
                    <tr>
                        <th>Nombre/Email</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Se unio</th>
                        ${canManage ? '<th>Acciones</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredEmployees.map(emp => {
                        const roleLabel = getActorLabel(emp.role_in_team);
                        const statusData = statusBadges[emp.status] || statusBadges.active;
                        return `
                            <tr>
                                <td>
                                    <strong>${emp.full_name || emp.email}</strong><br>
                                    <small>${emp.email}</small>
                                </td>
                                <td>${roleLabel}</td>
                                <td><span class="badge ${statusData.cls}">${statusData.label}</span></td>
                                <td>${emp.joined_at ? new Date(emp.joined_at).toLocaleDateString('es') : 'Pendiente'}</td>
                                ${canManage ? `
                                    <td style="display:flex; gap:6px; flex-wrap:wrap;">
                                        <button class="btn btn-sm btn-info" data-emp-action="view" data-emp-id="${emp.id}">Ver</button>
                                        ${emp.status === 'suspended'
                                            ? `<button class="btn btn-sm btn-success" data-emp-action="reactivate" data-emp-id="${emp.id}">Reactivar</button>`
                                            : `<button class="btn btn-sm btn-warning" data-emp-action="suspend" data-emp-id="${emp.id}">Suspender</button>`}
                                    </td>
                                ` : ''}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        table.querySelectorAll('[data-emp-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const empId = Number(btn.getAttribute('data-emp-id'));
                const action = btn.getAttribute('data-emp-action');
                const employee = this.employees.find(e => Number(e.id) === empId);
                if (!employee) return;

                if (action === 'view') {
                    this._openDetailModal(employee);
                    return;
                }
                if (action === 'suspend') {
                    await this._suspendEmployee(employee);
                    return;
                }
                if (action === 'reactivate') {
                    await this._reactivateEmployee(employee);
                }
            });
        });
    }

    _openCreateModal() {
        const content = `
            <div style="display:flex; gap:8px; margin-bottom:12px;">
                <button class="btn btn-primary btn-sm" data-tab-target="personal">Personal</button>
                <button class="btn btn-light btn-sm" data-tab-target="access">Acceso</button>
            </div>

            <div class="form-grid" data-tab-panel="personal" style="display:grid;">
                <div class="form-group">
                    <label>Nombre completo *</label>
                    <input type="text" id="empFullName" class="form-control" placeholder="Juan Perez" />
                </div>
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" id="empEmail" class="form-control" placeholder="john@example.com" />
                </div>
            </div>

            <div class="form-grid" data-tab-panel="access" style="display:none;">
                <div class="form-group">
                    <label>Rol *</label>
                    <select id="empRole" class="form-control">
                        <option value="viewer">${getActorLabel('viewer')} (Lectura)</option>
                        <option value="editor">Editor (Operativo)</option>
                        <option value="manager" selected>${getActorLabel('manager')} (Edicion)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Contrasena temporal *</label>
                    <input type="password" id="empPassword" class="form-control" minlength="8" placeholder="Minimo 8 caracteres" />
                    <small class="text-muted">Debes verla y guardarla antes de crear el usuario.</small>
                </div>
                <div class="form-group" style="grid-column: 1 / -1; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                    <button type="button" class="btn btn-light btn-sm" id="empGeneratePassword">Generar aleatoria</button>
                    <button type="button" class="btn btn-light btn-sm" id="empTogglePassword">Mostrar</button>
                    <button type="button" class="btn btn-light btn-sm" id="empCopyPassword">Copiar</button>
                    <span id="empPasswordHint" class="text-muted" style="font-size:12px;"></span>
                </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
                <button class="btn btn-light" data-close-modal>Cancelar</button>
                <button class="btn btn-primary" data-save-employee>Crear Usuario Interno</button>
            </div>
        `;

        const modalEl = modal.show({
            title: 'Crear Usuario Interno',
            content,
            size: 'large',
        });

        this._bindTabs(modalEl);

        const pwInput = modalEl.querySelector('#empPassword');
        const toggleBtn = modalEl.querySelector('#empTogglePassword');
        const hint = modalEl.querySelector('#empPasswordHint');

        modalEl.querySelector('#empGeneratePassword')?.addEventListener('click', () => {
            if (!pwInput) return;
            pwInput.value = this._generatePassword();
            pwInput.type = 'text';
            if (toggleBtn) toggleBtn.textContent = 'Ocultar';
            if (hint) hint.textContent = 'Contrasena generada y visible.';
        });

        toggleBtn?.addEventListener('click', () => {
            if (!pwInput) return;
            const isHidden = pwInput.type === 'password';
            pwInput.type = isHidden ? 'text' : 'password';
            toggleBtn.textContent = isHidden ? 'Ocultar' : 'Mostrar';
        });

        modalEl.querySelector('#empCopyPassword')?.addEventListener('click', async () => {
            if (!pwInput || !pwInput.value) {
                if (hint) hint.textContent = 'Primero genera o escribe una contrasena.';
                return;
            }
            try {
                await navigator.clipboard.writeText(pwInput.value);
                if (hint) hint.textContent = 'Contrasena copiada.';
            } catch (_err) {
                pwInput.select();
                document.execCommand('copy');
                if (hint) hint.textContent = 'Contrasena copiada.';
            }
        });

        modalEl.addEventListener('click', async e => {
            if (e.target.closest('[data-close-modal]')) {
                modal.close(modalEl);
                return;
            }
            if (!e.target.closest('[data-save-employee]')) return;

            const fullName = (modalEl.querySelector('#empFullName')?.value || '').trim();
            const email = (modalEl.querySelector('#empEmail')?.value || '').trim();
            const password = modalEl.querySelector('#empPassword')?.value || '';
            const role = modalEl.querySelector('#empRole')?.value || 'viewer';

            if (!fullName || !email || !password) {
                await modal.alert({ title: 'Validacion', message: 'Completa nombre, email y contrasena.', type: 'warning' });
                return;
            }

            try {
                // Backend endpoint expects query params, not JSON body.
                const url = `/admin/team/create?full_name=${encodeURIComponent(fullName)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&role=${encodeURIComponent(role)}`;
                await apiService.post(url, {});

                modal.close(modalEl);
                await modal.showSuccess('Usuario interno creado exitosamente.');
                await this._loadEmployees();
                this._renderTable();
            } catch (err) {
                const detail = err?.detail || err?.message || 'No se pudo crear el usuario interno';
                await modal.showError(`Error al crear empleado: ${detail}`);
            }
        });
    }

    _openDetailModal(employee) {
        const content = `
            <div class="detail-grid">
                <div class="detail-row">
                    <label style="display:block; font-weight:600; margin-bottom:6px;">Nombre</label>
                    <input type="text" id="empEditFullName" class="form-control" value="${employee.full_name || ''}" ${hasFeature('manage_team_users') ? '' : 'disabled'}>
                </div>
                <div class="detail-row"><strong>Email:</strong> ${employee.email || '-'}</div>
                <div class="detail-row"><strong>Rol:</strong> ${getActorLabel(employee.role_in_team)}</div>
                <div class="detail-row"><strong>Estado:</strong> ${employee.status || 'active'}</div>
                <div class="detail-row"><strong>Ingreso:</strong> ${employee.joined_at ? new Date(employee.joined_at).toLocaleDateString('es') : 'Pendiente'}</div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
                ${hasFeature('manage_team_users') ? '<button class="btn btn-primary" data-save-emp-name>Guardar nombre</button>' : ''}
                <button class="btn btn-light" data-close-modal>Cerrar</button>
            </div>
        `;

        const modalEl = modal.show({ title: 'Detalle Usuario Interno', content, size: 'medium' });
        modalEl.addEventListener('click', async e => {
            if (e.target.closest('[data-close-modal]')) {
                modal.close(modalEl);
                return;
            }
            if (!e.target.closest('[data-save-emp-name]')) return;

            const fullName = (modalEl.querySelector('#empEditFullName')?.value || '').trim();
            if (!fullName) {
                await modal.showWarning('Ingresa el nombre completo');
                return;
            }

            try {
                const response = await apiService.put(`/admin/team/members/${employee.id}`, { full_name: fullName });
                employee.full_name = response?.member?.full_name || fullName;
                this.employees = this.employees.map((item) => Number(item.id) === Number(employee.id)
                    ? { ...item, full_name: employee.full_name }
                    : item);
                this._applyFilters();
                this._renderTable();
                modal.close(modalEl);
                await modal.showSuccess('Nombre actualizado.');
            } catch (err) {
                await modal.showError(err?.detail || err?.message || 'No se pudo actualizar el nombre');
            }
        });
    }

    async _suspendEmployee(employee) {
        const yes = await modal.confirm({
            title: 'Confirmar',
            message: `Suspender a ${employee.full_name || employee.email}?`,
            confirmText: 'Suspender',
            cancelText: 'Cancelar',
        });
        if (!yes) return;

        try {
            await apiService.delete(`/admin/team/members/${employee.id}`);
            await modal.showSuccess('Empleado suspendido.');
            await this._loadEmployees();
            this._renderTable();
        } catch (err) {
            await modal.showError('Error: ' + (err?.detail || err?.message || 'No se pudo suspender'));
        }
    }

    async _reactivateEmployee(employee) {
        try {
            await apiService.request(`/admin/team/members/${employee.id}/activate`, 'PATCH', {});
            await modal.showSuccess('Empleado reactivado.');
            await this._loadEmployees();
            this._renderTable();
        } catch (err) {
            await modal.showError('Error: ' + (err?.detail || err?.message || 'No se pudo reactivar'));
        }
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

    _generatePassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
}

export default new TeamEmployeesView();
