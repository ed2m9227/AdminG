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
        this.tableClickHandler = null;
        this.searchHandler = null;
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
        // Limpiar listeners previos
        if (this.tableClickHandler) {
            document.removeEventListener('click', this.tableClickHandler);
        }
        if (this.searchHandler) {
            document.getElementById('userSearch')?.removeEventListener('keyup', this.searchHandler);
        }

        // Crear handler de click (único)
        this.tableClickHandler = async (e) => {
            // Cambiar rol
            if (e.target.classList.contains('change-role-btn')) {
                const userId = e.target.dataset.userId;
                const user = this.users.find(u => u.id == userId);
                const currentRole = user.role;
                const role = prompt(`Rol actual: ${currentRole}\nNuevo rol (viewer, editor, manager, admin):`, currentRole);

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
        };

        // Crear handler de búsqueda (único)
        this.searchHandler = (e) => {
            const term = e.target.value.toLowerCase();
            this.users = this.usersAll.filter(u =>
                u.email.toLowerCase().includes(term) ||
                u.plan.toLowerCase().includes(term)
            );
            this.renderUsersTable();
            // Re-adjuntar listeners después de re-renderizar tabla
            this.attachSearchListener();
        };

        // Adjuntar handlers
        document.addEventListener('click', this.tableClickHandler);
        this.attachSearchListener();
    }

    attachSearchListener() {
        const searchInput = document.getElementById('userSearch');
        if (searchInput && this.searchHandler) {
            searchInput.addEventListener('keyup', this.searchHandler);
        }
    }
}

// ========== TEAM MANAGEMENT VIEW ==========
export class TeamManagementView {
    constructor() {
        this.teamData = {};
        this.members = [];
        this.inviteHandler = null;
        this.createHandler = null;
        this.removeHandler = null;
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
                            <button class="btn btn-success" id="inviteUserBtn">+ Invitar Miembro (Socio Externo)</button>
                            <button class="btn btn-primary" id="createUserBtn">+ Crear Usuario Interno</button>
                        </div>
                    </div>
                    <div class="card-body" id="teamMembersContainer">
                        <div style="margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e5e7eb; font-size: 12px; color: #334155;">
                            Crear Usuario Interno: crea subcuenta hija del negocio actual con rol operativo.<br>
                            Invitar Miembro: vincula una cuenta dueña externa como socio colaborador.
                        </div>
                        <!-- Se llena con tabla -->
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            console.log('🔄 Inicializando TeamManagementView...');
            const response = await apiService.request('/admin/team/members', 'GET');
            this.teamData = response;
            this.members = response.members || [];
            console.log('✅ Datos del equipo cargados:', this.teamData);

            this.renderPlanInfo();
            this.renderTeamMembers();
            
            // Asegurarse de que los botones existen antes de adjuntar listeners
            await new Promise(resolve => setTimeout(resolve, 100));
            this.attachEventListeners();
        } catch (error) {
            console.error('❌ Error loading team:', error);
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
            { key: 'relationship_label', label: 'Tipo de Vinculo' },
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

    showInviteUserModal() {
        const content = `
            <div style="padding: 10px 0;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #333;">
                        📧 Email de Cuenta Socia (Dueño Externo)
                    </label>
                    <input type="email" id="inviteEmail" placeholder="usuario@ejemplo.com" 
                           style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px;
                                  font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;
                                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
                           onFocus="this.style.borderColor='#667eea'"
                           onBlur="this.style.borderColor='#e0e0e0'">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #333;">
                        👤 Rol del Socio en tu Operación
                    </label>
                    <select id="inviteRole" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; 
                                                  border-radius: 6px; font-size: 14px; box-sizing: border-box;
                                                  background: white; cursor: pointer;
                                                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                        <option value="partner" selected>Socio (coordinación entre cuentas)</option>
                        <option value="manager">Gerente delegado (aprobaciones y operación)</option>
                        <option value="viewer">Observador (solo consulta)</option>
                    </select>
                </div>

                <div style="padding: 12px; background: #e3f2fd; border-radius: 6px; border-left: 4px solid #2196f3;
                           color: #1565c0; font-size: 13px; margin-bottom: 20px;">
                    ℹ️ <strong>Nota:</strong> Este flujo es para socios con cuenta dueña independiente. Las subcuentas internas se crean con +Crear Usuario Interno.
                </div>
            </div>
        `;

        const modalEl = modal.show({
            title: '✉️ Invitar Nuevo Miembro',
            content: content,
            size: 'medium'
        });

        // Agregar botones de acción
        const body = modalEl.querySelector('.modal-body');
        body.innerHTML += `
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-secondary" id="cancelInviteBtn" style="padding: 10px 24px; border-radius: 6px;">
                    Cancelar
                </button>
                <button class="btn btn-primary" id="confirmInviteBtn" style="padding: 10px 24px; border-radius: 6px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; cursor: pointer;">
                    Enviar Invitación
                </button>
            </div>
        `;

        // Event listeners
        document.getElementById('cancelInviteBtn').addEventListener('click', () => {
            modal.close(modalEl);
        });

        document.getElementById('confirmInviteBtn').addEventListener('click', async () => {
            const email = document.getElementById('inviteEmail').value.trim();
            const role = document.getElementById('inviteRole').value;

            if (!email) {
                modal.alert({ title: 'Validación', message: 'Por favor ingresa un email válido', type: 'warning' });
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                modal.alert({ title: 'Validación', message: 'El email no es válido', type: 'warning' });
                return;
            }

            try {
                document.getElementById('confirmInviteBtn').disabled = true;
                document.getElementById('confirmInviteBtn').textContent = 'Enviando...';

                await apiService.request(
                    `/admin/team/invite?email=${encodeURIComponent(email)}&role=${role}`,
                    'POST'
                );

                modal.alert({
                    title: '✅ Éxito',
                    message: `Invitación enviada a ${email} como socio externo.`,
                    type: 'success'
                });
                modal.close(modalEl);
                this.init();
            } catch (error) {
                modal.alert({ title: 'Error', message: error.message, type: 'error' });
            } finally {
                document.getElementById('confirmInviteBtn').disabled = false;
                document.getElementById('confirmInviteBtn').textContent = 'Enviar Invitación';
            }
        });

        // Enfoque automático en el email
        setTimeout(() => {
            document.getElementById('inviteEmail').focus();
        }, 100);
    }

    showCreateUserModal() {
        const content = `
            <div style="padding: 10px 0;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #333;">
                        📧 Email del Usuario Interno
                    </label>
                    <input type="email" id="createEmail" placeholder="usuario@ejemplo.com" 
                           style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px;
                                  font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;
                                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
                           onFocus="this.style.borderColor='#667eea'"
                           onBlur="this.style.borderColor='#e0e0e0'">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #333;">
                        🔐 Contraseña Temporal
                    </label>
                    <input type="password" id="createPassword" placeholder="Mínimo 6 caracteres" 
                           style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px;
                                  font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;
                                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
                           onFocus="this.style.borderColor='#667eea'"
                           onBlur="this.style.borderColor='#e0e0e0'">
                    <div id="passwordStrength" style="margin-top: 6px; font-size: 12px; color: #999;"></div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #333;">
                        👤 Rol Operativo Interno
                    </label>
                    <select id="createRole" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; 
                                                  border-radius: 6px; font-size: 14px; box-sizing: border-box;
                                                  background: white; cursor: pointer;
                                                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                        <option value="editor" selected>Editor interno</option>
                        <option value="manager">Gerente interno</option>
                        <option value="viewer">Lector interno</option>
                    </select>
                </div>

                <div style="padding: 12px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ff9800;
                           color: #856404; font-size: 13px; margin-bottom: 20px;">
                    ⚠️ <strong>Importante:</strong> Este usuario quedará como subcuenta hija del negocio actual.
                </div>
            </div>
        `;

        const modalEl = modal.show({
            title: '➕ Crear Nuevo Usuario',
            content: content,
            size: 'medium'
        });

        // Agregar botones de acción
        const body = modalEl.querySelector('.modal-body');
        body.innerHTML += `
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-secondary" id="cancelCreateBtn" style="padding: 10px 24px; border-radius: 6px;">
                    Cancelar
                </button>
                <button class="btn btn-primary" id="confirmCreateBtn" style="padding: 10px 24px; border-radius: 6px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; cursor: pointer;">
                    Crear Usuario
                </button>
            </div>
        `;

        // Password strength indicator
        document.getElementById('createPassword').addEventListener('input', (e) => {
            const strength = e.target.value.length;
            const strengthEl = document.getElementById('passwordStrength');
            
            if (strength < 6) {
                strengthEl.textContent = '⚠️ Muy débil (mínimo 6 caracteres)';
                strengthEl.style.color = '#d32f2f';
            } else if (strength < 10) {
                strengthEl.textContent = '✓ Típico (aceptable)';
                strengthEl.style.color = '#f57f17';
            } else {
                strengthEl.textContent = '✅ Fuerte (recomendado)';
                strengthEl.style.color = '#388e3c';
            }
        });

        // Event listeners
        document.getElementById('cancelCreateBtn').addEventListener('click', () => {
            modal.close(modalEl);
        });

        document.getElementById('confirmCreateBtn').addEventListener('click', async () => {
            const email = document.getElementById('createEmail').value.trim();
            const password = document.getElementById('createPassword').value;
            const role = document.getElementById('createRole').value;

            if (!email) {
                modal.alert({ title: 'Validación', message: 'Por favor ingresa un email válido', type: 'warning' });
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                modal.alert({ title: 'Validación', message: 'El email no es válido', type: 'warning' });
                return;
            }

            if (!password || password.length < 6) {
                modal.alert({ title: 'Validación', message: 'La contraseña debe tener al menos 6 caracteres', type: 'warning' });
                return;
            }

            try {
                document.getElementById('confirmCreateBtn').disabled = true;
                document.getElementById('confirmCreateBtn').textContent = 'Creando...';

                await apiService.request(
                    `/admin/team/create?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&role=${role}`,
                    'POST'
                );

                modal.alert({
                    title: '✅ Éxito',
                    message: `Usuario ${email} creado correctamente. El usuario puede iniciar sesión ahora.`,
                    type: 'success'
                });
                modal.close(modalEl);
                this.init();
            } catch (error) {
                modal.alert({ title: 'Error', message: error.message, type: 'error' });
            } finally {
                document.getElementById('confirmCreateBtn').disabled = false;
                document.getElementById('confirmCreateBtn').textContent = 'Crear Usuario';
            }
        });

        // Enfoque automático en el email
        setTimeout(() => {
            document.getElementById('createEmail').focus();
        }, 100);
    }

    attachEventListeners() {
        // Limpiar listeners previos
        if (this.inviteHandler) {
            document.getElementById('inviteUserBtn')?.removeEventListener('click', this.inviteHandler);
        }
        if (this.createHandler) {
            document.getElementById('createUserBtn')?.removeEventListener('click', this.createHandler);
        }
        if (this.removeHandler) {
            document.removeEventListener('click', this.removeHandler);
        }

        // Invitar miembro - Usa métodos en lugar de prompts
        this.inviteHandler = () => this.showInviteUserModal();

        // Crear usuario directo - Usa métodos en lugar de prompts
        this.createHandler = () => this.showCreateUserModal();

        // Remover miembro
        this.removeHandler = async (e) => {
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
        };

        // Adjuntar handlers
        const inviteBtn = document.getElementById('inviteUserBtn');
        const createBtn = document.getElementById('createUserBtn');
        
        console.log('🔗 Adjuntando event listeners...');
        console.log('   Invitar Btn:', inviteBtn ? '✓ Encontrado' : '✗ No encontrado');
        console.log('   Crear Btn:', createBtn ? '✓ Encontrado' : '✗ No encontrado');
        
        if (inviteBtn) {
            inviteBtn.addEventListener('click', this.inviteHandler);
            console.log('✅ Listener adjuntado a inviteUserBtn');
        } else {
            console.error('❌ No se encontró inviteUserBtn');
        }
        
        if (createBtn) {
            createBtn.addEventListener('click', this.createHandler);
            console.log('✅ Listener adjuntado a createUserBtn');
        } else {
            console.error('❌ No se encontró createUserBtn');
        }
        
        document.addEventListener('click', this.removeHandler);
    }
}

// ========== TEAM MOVEMENTS VIEW (Para visualizar movimientos por usuario hijo) ==========
export class TeamMovementsView {
    constructor() {
        this.summary = {};
        this.selectedMemberId = null;
        this.selectedMemberDetails = null;
    }

    render() {
        return `
            <div id="teamMovementsContainer">
                <div class="admin-header">
                    <h2>📊 Movimientos del Equipo</h2>
                    <p class="admin-subtitle">Trazabilidad diferenciada por usuario hijo</p>
                </div>

                <!-- Resumen por Miembro -->
                <div class="card">
                    <div class="card-header">
                        <h3>Resumen de Actividad</h3>
                    </div>
                    <div class="card-body" id="movementsSummaryContainer">
                        <!-- Se llena dinámicamente -->
                    </div>
                </div>

                <!-- Detalle de Miembro Seleccionado -->
                <div class="card" id="memberDetailsCard" style="display: none;">
                    <div class="card-header">
                        <h3 id="memberDetailsTitle">Detalles del Miembro</h3>
                        <button class="btn btn-sm btn-secondary" id="closeMemberDetails">✕ Cerrar</button>
                    </div>
                    <div class="card-body" id="memberDetailsContainer">
                        <!-- Se llena dinámicamente -->
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            console.log('🔄 Cargando movimientos del equipo...');
            const response = await apiService.request('/admin/team/movements/summary', 'GET');
            this.summary = response;
            console.log('✅ Resumen cargado:', response);

            this.renderSummary();
            this.attachEventListeners();
        } catch (error) {
            console.error('❌ Error loading movements:', error);
            modal.alert({
                title: 'Error',
                message: error.message,
                type: 'error'
            });
        }
    }

    renderSummary() {
        const container = document.getElementById('movementsSummaryContainer');
        if (!container) return;

        const html = `
            <div class="movements-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">
                ${this.summary.members?.map(member => `
                    <div class="movements-card" data-member-id="${member.member_id}" 
                         style="padding: 20px; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                        <div style="font-weight: 600; margin-bottom: 10px; font-size: 14px;">
                            ${member.member_email}
                        </div>
                        <div style="color: #666; font-size: 12px; margin-bottom: 10px;">
                            <span class="badge" style="padding: 4px 8px; background: #e3f2fd; color: #1976d2;">${member.role}</span>
                            <span style="margin-left: 8px; ${member.is_active ? 'color: green;' : 'color: red;'}">
                                ${member.is_active ? '● Activo' : '● Inactivo'}
                            </span>
                        </div>
                        <div style="border-top: 1px solid #eee; padding-top: 10px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                                <div>
                                    <div style="color: #999;">Pagos</div>
                                    <div style="font-weight: 600; color: #667eea;">${member.statistics.payments}</div>
                                </div>
                                <div>
                                    <div style="color: #999;">Clientes</div>
                                    <div style="font-weight: 600; color: #667eea;">${member.statistics.customers}</div>
                                </div>
                                <div>
                                    <div style="color: #999;">Citas</div>
                                    <div style="font-weight: 600; color: #667eea;">${member.statistics.appointments}</div>
                                </div>
                                <div>
                                    <div style="color: #999;">Ingresos</div>
                                    <div style="font-weight: 600; color: #27ae60;">$${member.statistics.total_revenue.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('') || '<p>No hay miembros en el equipo</p>'}
            </div>
        `;

        container.innerHTML = html;
    }

    async loadMemberDetails(memberId) {
        try {
            console.log('🔍 Cargando detalles del miembro:', memberId);
            const response = await apiService.request(
                `/admin/team/movements/by-member/${memberId}`,
                'GET'
            );
            this.selectedMemberDetails = response;
            this.renderMemberDetails();
        } catch (error) {
            console.error('❌ Error loading member details:', error);
            modal.alert({
                title: 'Error',
                message: error.message,
                type: 'error'
            });
        }
    }

    renderMemberDetails() {
        if (!this.selectedMemberDetails) return;

        const member = this.selectedMemberDetails.member;
        document.getElementById('memberDetailsTitle').textContent = `Detalles de ${member.email}`;
        
        const container = document.getElementById('memberDetailsContainer');
        if (!container) return;

        const movements = this.selectedMemberDetails.movements;
        
        let html = `
            <div style="margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    <div style="padding: 10px; background: #f5f7fa; border-radius: 6px;">
                        <div style="color: #999; font-size: 12px;">Email</div>
                        <div style="font-weight: 600; margin-top: 4px;">${member.email}</div>
                    </div>
                    <div style="padding: 10px; background: #f5f7fa; border-radius: 6px;">
                        <div style="color: #999; font-size: 12px;">Rol en Equipo</div>
                        <div style="font-weight: 600; margin-top: 4px;">${member.role}</div>
                    </div>
                    <div style="padding: 10px; background: #f5f7fa; border-radius: 6px;">
                        <div style="color: #999; font-size: 12px;">Estado</div>
                        <div style="font-weight: 600; margin-top: 4px; ${member.is_active ? 'color: green;' : 'color: red;'}">
                            ${member.is_active ? '✓ Activo' : '✗ Inactivo'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Pagos
        if (movements.payments && movements.payments.length > 0) {
            html += `
                <div style="margin-top: 20px;">
                    <h4 style="margin-bottom: 10px;">💳 Pagos (${movements.payments.length})</h4>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="border-bottom: 2px solid #ddd;">
                                    <th style="text-align: left; padding: 8px;">Cantidad</th>
                                    <th style="text-align: left; padding: 8px;">Método</th>
                                    <th style="text-align: left; padding: 8px;">Estado</th>
                                    <th style="text-align: left; padding: 8px;">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${movements.payments.map(p => `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 8px; font-weight: 600;">$${p.amount.toFixed(2)}</td>
                                        <td style="padding: 8px;">${p.method}</td>
                                        <td style="padding: 8px;">
                                            <span style="padding: 3px 8px; border-radius: 3px; font-size: 11px;
                                                ${p.status === 'completed' ? 'background: #c8e6c9; color: #2e7d32;' : 
                                                  p.status === 'pending' ? 'background: #fff9c4; color: #f57f17;' : 
                                                  'background: #ffcdd2; color: #c62828;'}">
                                                ${p.status}
                                            </span>
                                        </td>
                                        <td style="padding: 8px;">${new Date(p.created_at).toLocaleDateString('es-ES')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // Clientes
        if (movements.customers && movements.customers.length > 0) {
            html += `
                <div style="margin-top: 20px;">
                    <h4 style="margin-bottom: 10px;">👥 Clientes (${movements.customers.length})</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                        ${movements.customers.map(c => `
                            <div style="padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                                <div style="font-weight: 600; font-size: 13px;">${c.full_name || 'Sin nombre'}</div>
                                <div style="font-size: 11px; color: #666; margin-top: 4px;">${c.email || 'N/A'}</div>
                                <div style="font-size: 11px; color: #666;">${c.phone || 'N/A'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Citas
        if (movements.appointments && movements.appointments.length > 0) {
            html += `
                <div style="margin-top: 20px;">
                    <h4 style="margin-bottom: 10px;">📅 Citas (${movements.appointments.length})</h4>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="border-bottom: 2px solid #ddd;">
                                    <th style="text-align: left; padding: 8px;">Fecha</th>
                                    <th style="text-align: left; padding: 8px;">Cliente</th>
                                    <th style="text-align: left; padding: 8px;">Estado</th>
                                    <th style="text-align: left; padding: 8px;">Notas</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${movements.appointments.map(a => `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 8px;">${new Date(a.scheduled_at).toLocaleDateString('es-ES')}</td>
                                        <td style="padding: 8px;">${a.customer_name || 'N/A'}</td>
                                        <td style="padding: 8px;">${a.status}</td>
                                        <td style="padding: 8px; color: #666; font-size: 12px;">${a.notes || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        document.getElementById('memberDetailsCard').style.display = 'block';
    }

    attachEventListeners() {
        // Abrir detalles al hacer click en una tarjeta
        const cards = document.querySelectorAll('.movements-card');
        cards.forEach(card => {
            card.addEventListener('click', async () => {
                const memberId = card.dataset.memberId;
                this.selectedMemberId = memberId;
                await this.loadMemberDetails(memberId);
            });
        });

        // Cerrar detalles
        document.getElementById('closeMemberDetails')?.addEventListener('click', () => {
            document.getElementById('memberDetailsCard').style.display = 'none';
            this.selectedMemberId = null;
            this.selectedMemberDetails = null;
        });
    }
}

// Exportar instancias
export const masterAdminView = new MasterAdminView();
export const teamManagementView = new TeamManagementView();
export const teamMovementsView = new TeamMovementsView();
