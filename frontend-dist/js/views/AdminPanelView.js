/**
 * Admin Views - Master Admin Panel y Team Management
 * Responsabilidad: Interfaces para administración y gestión de equipos
 */

import apiService from '../services/api.service.js';
import modal from '../components/Modal.js';
import table from '../components/Table.js';

// ========== MASTER ADMIN VIEW ==========
export class MasterAdminView {
    constructor() {
        this.statistics = {};
        this.users = [];
    }

    render() {
        return `
            <div id="masterAdminContainer">
                <div class="admin-header">
                    <h2>🔐 Panel Maestro de Administración</h2>
                    <p class="admin-subtitle">Gestión completa del sistema, planes y usuarios</p>
                </div>

                <!-- Estadísticas del Sistema -->
                <div class="stats-grid" id="statsContainer">
                    <div class="stat-card">
                        <div class="stat-label">Usuarios del Sistema</div>
                        <div class="stat-value" id="totalUsers">0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Usuarios Activos</div>
                        <div class="stat-value" id="activeUsers">0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Plans Distribuidos</div>
                        <div class="stat-value" id="plansCount">0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Administradores</div>
                        <div class="stat-value" id="adminCount">0</div>
                    </div>
                </div>

                <!-- Distribución por Plan -->
                <div class="card">
                    <div class="card-header">
                        <h3>Distribución de Planes</h3>
                    </div>
                    <div id="planDistribution" class="card-body">
                        <!-- Se llena con JavaScript -->
                    </div>
                </div>

                <!-- Lista de Usuarios -->
                <div class="card">
                    <div class="card-header">
                        <h3>Gestión de Usuarios</h3>
                        <input type="text" id="userSearch" placeholder="Buscar usuario..." 
                               style="width: 300px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="card-body" id="usersTableContainer">
                        <!-- Se llena con tabla de usuarios -->
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            // Cargar dashboard
            const response = await apiService.request('/admin/master/dashboard', 'GET');
            this.statistics = response.statistics;
            this.updateStatistics();

            // Cargar usuarios
            const usersRes = await apiService.request('/admin/master/users', 'GET');
            this.usersAll = usersRes.users || [];
            this.users = [...this.usersAll];
            this.renderUsersTable();

            // Event listeners
            this.attachEventListeners();
        } catch (error) {
            console.error('Error loading master admin:', error);
            modal.alert({
                title: 'Error',
                message: 'No tienes permisos para acceder al panel maestro',
                type: 'error'
            });
        }
    }

    updateStatistics() {
        document.getElementById('totalUsers').textContent = this.statistics.total_users || 0;
        document.getElementById('activeUsers').textContent = this.statistics.active_users || 0;
        document.getElementById('adminCount').textContent = this.statistics.by_role?.admin || 0;

        const byPlan = this.statistics.by_plan || {};
        const planCount = Object.values(byPlan).reduce((a, b) => a + b, 0);
        document.getElementById('plansCount').textContent = planCount;

        // Renderizar distribución de planes
        const planDist = document.getElementById('planDistribution');
        if (planDist) {
            planDist.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    ${Object.entries(byPlan).map(([plan, count]) => `
                        <div style="padding: 15px; background: #f5f7fa; border-radius: 8px; border-left: 4px solid #667eea;">
                            <div style="font-weight: 600; text-transform: uppercase; font-size: 12px; color: #667eea;">
                                ${plan}
                            </div>
                            <div style="font-size: 24px; font-weight: bold; margin-top: 8px;">
                                ${count}
                            </div>
                            <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">
                                usuarios
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    renderUsersTable() {
        const columns = [
            { key: 'email', label: 'Email' },
            { key: 'plan', label: 'Plan', badgeClass: 'info' },
            { key: 'role', label: 'Rol', badgeClass: 'warning' },
            { key: 'is_active', label: 'Estado', formatter: (v) => v ? '✓ Activo' : '✗ Inactivo' },
            { key: 'id', label: 'Acciones', formatter: this.renderActions.bind(this) }
        ];

        const container = document.getElementById('usersTableContainer');
        if (container) {
            container.innerHTML = table.render({
                columns,
                data: this.users,
                emptyMessage: 'No hay usuarios en el sistema',
                emptyIcon: '👥'
            });
        }
    }

    renderActions(userId) {
        return `
            <div style="display: flex; gap: 5px;">
                <button class="btn btn-sm btn-info change-role-btn" data-user-id="${userId}">
                    Cambiar Rol
                </button>
                <button class="btn btn-sm btn-danger delete-user-btn" data-user-id="${userId}">
                    Eliminar
                </button>
            </div>
        `;
    }

    attachEventListeners() {
        // Cambiar rol
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('change-role-btn')) {
                const userId = e.target.dataset.userId;
                const user = this.users.find(u => u.id == userId);
                const currentRole = user.role;
                const role = prompt(`Rol actual: ${currentRole}\nNuevo rol (viewer, manager, admin):`, currentRole);

                if (role && role !== currentRole) {
                    try {
                        await apiService.request(
                            `/admin/master/users/${userId}/role?new_role=${role}`,
                            'PATCH'
                        );
                        modal.alert({
                            title: 'Éxito',
                            message: `Rol actualizado a ${role}`,
                            type: 'success'
                        });
                        this.init(); // Recargar
                    } catch (error) {
                        modal.alert({ title: 'Error', message: error.message, type: 'error' });
                    }
                }
            }

            // Eliminar usuario
            if (e.target.classList.contains('delete-user-btn')) {
                const userId = e.target.dataset.userId;
                const user = this.users.find(u => u.id == userId);

                if (await modal.confirm({
                    title: 'Eliminar Usuario',
                    message: `¿Estás seguro de eliminar a ${user.email}?`,
                    type: 'warning'
                })) {
                    try {
                        await apiService.request(`/admin/master/users/${userId}`, 'DELETE');
                        modal.alert({
                            title: 'Éxito',
                            message: 'Usuario eliminado',
                            type: 'success'
                        });
                        this.init();
                    } catch (error) {
                        modal.alert({ title: 'Error', message: error.message, type: 'error' });
                    }
                }
            }
        });

        // Búsqueda de usuarios
        document.getElementById('userSearch')?.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            this.users = this.usersAll.filter(u =>
                u.email.toLowerCase().includes(term) ||
                u.plan.toLowerCase().includes(term)
            );
            this.renderUsersTable();
        });
    }
}

// ========== TEAM MANAGEMENT VIEW ==========
export class TeamManagementView {
    constructor() {
        this.teamData = {};
        this.members = [];
    }

    render() {
        return `
            <div id="teamManagementContainer">
                <div class="admin-header">
                    <h2>👥 Gestión de Equipo</h2>
                    <p class="admin-subtitle">Invita y gestiona los miembros de tu equipo</p>
                </div>

                <!-- Plan Info -->
                <div class="card" id="planInfoCard">
                    <div class="card-header">
                        <h3>Información del Plan</h3>
                    </div>
                    <div class="card-body" id="planInfo">
                        <!-- Se llena dinámicamente -->
                    </div>
                </div>

                <!-- Team Members -->
                <div class="card">
                    <div class="card-header">
                        <h3>Miembros del Equipo</h3>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-success" id="inviteUserBtn">+ Invitar Miembro</button>
                            <button class="btn btn-primary" id="createUserBtn">+ Crear Usuario</button>
                        </div>
                    </div>
                    <div class="card-body" id="teamMembersContainer">
                        <!-- Se llena con tabla -->
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            const response = await apiService.request('/admin/team/members', 'GET');
            this.teamData = response;
            this.members = response.members || [];

            this.renderPlanInfo();
            this.renderTeamMembers();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error loading team:', error);
            if (error.message.includes('403')) {
                modal.alert({
                    title: 'No disponible',
                    message: 'Tu plan no incluye gestión de equipos. Mejora tu plan para usar esta funcionalidad.',
                    type: 'info'
                });
            }
        }
    }

    renderPlanInfo() {
        const limits = this.teamData.plan_limits || {};
        const container = document.getElementById('planInfo');
        if (container) {
            container.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div style="padding: 15px; background: #f5f7fa; border-radius: 8px;">
                        <div style="font-weight: 600; color: #667eea;">Plan Actual</div>
                        <div style="font-size: 20px; font-weight: bold; margin-top: 8px;">
                            ${this.teamData.team_owner?.plan || 'N/A'}
                        </div>
                    </div>
                    <div style="padding: 15px; background: #f5f7fa; border-radius: 8px;">
                        <div style="font-weight: 600; color: #667eea;">Límite de Miembros</div>
                        <div style="font-size: 20px; font-weight: bold; margin-top: 8px;">
                            ${this.teamData.count}/${this.teamData.max_team_size}
                        </div>
                    </div>
                    <div style="padding: 15px; background: #f5f7fa; border-radius: 8px;">
                        <div style="font-weight: 600; color: #667eea;">Clientes Permitidos</div>
                        <div style="font-size: 20px; font-weight: bold; margin-top: 8px;">
                            ${limits.customers || 0}
                        </div>
                    </div>
                    <div style="padding: 15px; background: #f5f7fa; border-radius: 8px;">
                        <div style="font-weight: 600; color: #667eea;">Propiedades Almacenadas</div>
                        <div style="font-size: 20px; font-weight: bold; margin-top: 8px;">
                            ${limits.storage_gb || 0} GB
                        </div>
                    </div>
                </div>
            `;
        }
    }

    renderTeamMembers() {
        const columns = [
            { key: 'email', label: 'Email' },
            { key: 'role_in_team', label: 'Rol en Equipo' },
            { key: 'status', label: 'Estado', type: 'badge' },
            { key: 'joined_at', label: 'Unido', type: 'date' },
            { key: 'id', label: 'Acciones', formatter: this.renderMemberActions.bind(this) }
        ];

        const container = document.getElementById('teamMembersContainer');
        if (container) {
            container.innerHTML = table.render({
                columns,
                data: this.members,
                emptyMessage: 'No hay miembros en tu equipo',
                emptyIcon: '👤'
            });
        }
    }

    renderMemberActions(memberId) {
        return `
            <button class="btn btn-sm btn-danger remove-member-btn" data-member-id="${memberId}">
                Remover
            </button>
        `;
    }

    attachEventListeners() {
        // Invitar miembro
        document.getElementById('inviteUserBtn')?.addEventListener('click', async () => {
            const email = prompt('Ingresa el email del usuario a invitar:');
            if (!email) return;

            try {
                const result = await apiService.request(
                    `/admin/team/invite?email=${email}&role=viewer`,
                    'POST'
                );
                modal.alert({
                    title: 'Invitación Enviada',
                    message: `Se envió invitación a ${email}`,
                    type: 'success'
                });
                this.init();
            } catch (error) {
                modal.alert({ title: 'Error', message: error.message, type: 'error' });
            }
        });

        // Crear usuario directo
        document.getElementById('createUserBtn')?.addEventListener('click', async () => {
            const email = prompt('Email del nuevo usuario:');
            if (!email) return;
            const password = prompt('Password temporal (min 6 caracteres):');
            if (!password || password.length < 6) {
                modal.alert({ title: 'Error', message: 'Password inválido', type: 'error' });
                return;
            }

            try {
                await apiService.request(
                    `/admin/team/create?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&role=viewer`,
                    'POST'
                );
                modal.alert({
                    title: 'Usuario Creado',
                    message: `Usuario creado: ${email}`,
                    type: 'success'
                });
                this.init();
            } catch (error) {
                modal.alert({ title: 'Error', message: error.message, type: 'error' });
            }
        });

        // Remover miembro
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('remove-member-btn')) {
                const memberId = e.target.dataset.memberId;
                const member = this.members.find(m => m.id == memberId);

                if (await modal.confirm({
                    title: 'Remover Miembro',
                    message: `¿Remover a ${member.email} del equipo?`,
                    type: 'warning'
                })) {
                    try {
                        await apiService.request(`/admin/team/members/${memberId}`, 'DELETE');
                        modal.alert({
                            title: 'Éxito',
                            message: 'Miembro removido del equipo',
                            type: 'success'
                        });
                        this.init();
                    } catch (error) {
                        modal.alert({ title: 'Error', message: error.message, type: 'error' });
                    }
                }
            }
        });
    }
}

// Exportar instancias
export const masterAdminView = new MasterAdminView();
export const teamManagementView = new TeamManagementView();
