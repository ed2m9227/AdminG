/**
 * Dashboard View
 * Responsabilidad: Renderizar vista principal del dashboard
 * Principio SOLID: Single Responsibility
 */

import authService from '../services/auth.service.js';
import apiService from '../services/api.service.js';

export class DashboardView {
    constructor() {
        this.stats = {
            customers: 0,
            appointments: 0,
            inventory: 0,
            revenue: 0
        };
    }

    render() {
        const user = authService.getCurrentUser();
        const greeting = this.getGreeting();
        const isAdmin = user?.role === 'admin';
        const businessEmoji = this.getEmojiForBusinessType(user?.business_type);

        const roleLabel = this.getRoleLabel(user?.role);
        const roleBgColor = user?.role === 'admin' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                            user?.role === 'manager' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';

        return `
            <!-- Header de Bienvenida Mejorado -->
            <div style="margin-bottom: 24px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 12px; padding: 24px; border: 1px solid rgba(102, 126, 234, 0.1); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;">
                    <div style="flex: 1;">
                        <h1 style="font-size: 32px; font-weight: 700; color: #1f2937; margin: 0 0 8px 0;">${greeting}</h1>
                        <p style="font-size: 14px; color: #6b7280; margin: 0 0 16px 0;">Bienvenido de vuelta a AdminG</p>
                        
                        <!-- Recuadro separado para Plan y Rol -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div style="background: white; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #667eea; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
                                <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Plan</div>
                                <div style="font-size: 16px; font-weight: 700; color: #667eea;">${user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : '-'}</div>
                            </div>
                            <div style="background: white; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #08a88a; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
                                <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Rol</div>
                                <div style="font-size: 16px; font-weight: 700; color: #08a88a;">${roleLabel}</div>
                            </div>
                        </div>

                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 72px; margin-bottom: 12px;">${businessEmoji}</div>
                        ${isAdmin ? `
                            <button id="btnViewAsUser" style="display: inline-block; padding: 10px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); text-transform: uppercase; letter-spacing: 0.5px;">
                                👁️ Ver como Usuario
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Clientes Totales</h3>
                    <div class="value" id="statCustomers">${this.stats.customers}</div>
                </div>
                <div class="stat-card">
                    <h3>Citas Hoy</h3>
                    <div class="value" id="statAppointments">${this.stats.appointments}</div>
                </div>
                <div class="stat-card">
                    <h3>Productos</h3>
                    <div class="value" id="statInventory">${this.stats.inventory}</div>
                </div>
                <div class="stat-card">
                    <h3>Ingresos Mes</h3>
                    <div class="value" id="statRevenue">$0.00</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Funciones Disponibles por Plan</h2>
                </div>
                <div class="card-body" id="planFeaturesBox">
                    <div style="padding: 12px; color: #7f8c8d;">Cargando funciones disponibles...</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Información de la Cuenta</h2>
                </div>
                <div class="card-body">
                    <table class="info-table">
                        <tr>
                            <th>Email</th>
                            <td>${user?.email || '-'}</td>
                        </tr>
                        <tr>
                            <th>Plan</th>
                            <td><span class="badge badge-info">${user?.plan?.toUpperCase() || '-'}</span></td>
                        </tr>
                        <tr>
                            <th>Rol</th>
                            <td><span class="badge badge-success">${user?.role?.toUpperCase() || '-'}</span></td>
                        </tr>
                        <tr>
                            <th>Tipo de Negocio</th>
                            <td>${user?.business_type || 'No especificado'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;
    }

    async init() {
        await this.loadStats();
        await this.loadFeatures();
        this.attachEventListeners();
    }

    attachEventListeners() {
        const btnViewAsUser = document.getElementById('btnViewAsUser');
        if (btnViewAsUser) {
            btnViewAsUser.addEventListener('click', () => this.openUserPreviewModal());
        }
    }

    openUserPreviewModal() {
        const user = authService.getCurrentUser();
        const roleLabel = this.getRoleLabel(user?.role);
        const roleDescription = this.getRoleDescription(user?.role);

        const planName = user?.plan === 'admin' ? 'MAX (Administrador)' : (user?.plan || 'free').toUpperCase();
        const planDescription = this.getPlanDescription(user?.plan);

        const modalContent = `
            <div style="max-width: 500px;">
                <h3 style="font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px;">Vista del Usuario: Especificaciones de Plan y Negocio</h3>
                
                <!-- Plan Section -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">PLAN ACTUAL</div>
                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">${planName}</div>
                    <div style="font-size: 13px; opacity: 0.95;">${planDescription}</div>
                </div>

                <!-- Role Section -->
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">ROL ASIGNADO</div>
                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">${roleLabel}</div>
                    <div style="font-size: 13px; opacity: 0.95;">${roleDescription}</div>
                </div>

                <!-- Features Section -->
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
                    <div style="font-size: 12px; font-weight: 700; color: #1f2937; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Funciones Disponibles</div>
                    <div id="userPreviewFeatures" style="font-size: 13px; color: #6b7280;"></div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;`;
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 24px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15); animation: slideIn 0.3s ease-out;">
                ${modalContent}
                <div style="display: flex; gap: 8px; margin-top: 24px;">
                    <button id="closeUserPreview" style="flex: 1; padding: 10px 16px; background: #e5e7eb; color: #1f2937; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Cerrar</button>
                    <button onclick="location.href='#/businessconfig'" style="flex: 1; padding: 10px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s;">Editar Configuración</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('closeUserPreview').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Load features
        this.loadUserPreviewFeatures();
    }

    async loadUserPreviewFeatures() {
        try {
            const response = await apiService.getFeatures();
            const features = response.features || [];
            
            const featureTranslations = {
                'view inventory': 'Ver inventario',
                'view reports': 'Ver reportes',
                'view customers': 'Ver clientes',
                'create products': 'Crear productos',
                'edit products': 'Editar productos',
                'edit appointments': 'Editar citas',
                'create appointments': 'Crear citas',
                'view team': 'Ver equipo',
                'edit customers': 'Editar clientes',
                'manage team users': 'Gestionar equipo',
                'view appointments': 'Ver citas',
                'create payments': 'Crear pagos',
                'create customers': 'Crear clientes',
                'view payments': 'Ver pagos',
                'use cashregister': 'Usar caja registradora'
            };

            const featureLabels = features.map(f => {
                const label = f.replace(/_/g, ' ').toLowerCase();
                return featureTranslations[label] || f.replace(/_/g, ' ');
            });

            const container = document.getElementById('userPreviewFeatures');
            if (container) {
                container.innerHTML = featureLabels.map(label => `
                    <div style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="color: #10b981;">✓</span> ${label}
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading user preview features:', error);
        }
    }

    async loadStats() {
        try {
            const [customersData, inventoryData, appointmentsData, paymentsData] = await Promise.allSettled([
                apiService.getCustomers(),
                apiService.getInventoryItems(),
                apiService.getAppointments(),
                apiService.getPayments()
            ]);

            // Customers
            if (customersData.status === 'fulfilled' && Array.isArray(customersData.value)) {
                this.stats.customers = customersData.value.length || 0;
                this.updateStat('statCustomers', this.stats.customers);
            }

            // Inventory
            if (inventoryData.status === 'fulfilled' && Array.isArray(inventoryData.value)) {
                this.stats.inventory = inventoryData.value.length || 0;
                this.updateStat('statInventory', this.stats.inventory);
            }

            // Appointments (count for today)
            if (appointmentsData.status === 'fulfilled' && Array.isArray(appointmentsData.value)) {
                this.stats.appointments = appointmentsData.value.length || 0;
                this.updateStat('statAppointments', this.stats.appointments);
            }

            // Revenue calculation
            if (paymentsData.status === 'fulfilled' && Array.isArray(paymentsData.value)) {
                this.stats.revenue = paymentsData.value.reduce((sum, p) => sum + (p.amount || 0), 0);
                this.updateStat('statRevenue', this.stats.revenue);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    updateStat(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            if (elementId === 'statRevenue') {
                // Format as currency with proper formatting
                element.textContent = '$' + parseFloat(value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                element.textContent = value;
            }
        }
    }

    async loadFeatures() {
        try {
            const response = await apiService.getFeatures();
            const features = response.features || [];
            const limits = response.limits || {};
            const plan = response.plan || 'free';

            const featureTranslations = {
                'view inventory': 'Ver inventario',
                'view reports': 'Ver reportes',
                'view customers': 'Ver clientes',
                'create products': 'Crear productos',
                'edit products': 'Editar productos',
                'edit appointments': 'Editar citas',
                'create appointments': 'Crear citas',
                'view team': 'Ver equipo',
                'edit customers': 'Editar clientes',
                'manage team users': 'Gestionar equipo',
                'view appointments': 'Ver citas',
                'create payments': 'Crear pagos',
                'create customers': 'Crear clientes',
                'view payments': 'Ver pagos',
                'use cashregister': 'Usar caja registradora'
            };

            const featureLabels = features.map(f => {
                const label = f.replace(/_/g, ' ').toLowerCase();
                return featureTranslations[label] || f.replace(/_/g, ' ');
            });

            const planName = plan === 'admin' ? 'MAX (Administrador)' : plan.toUpperCase();
            const container = document.getElementById('planFeaturesBox');

            if (container) {
                container.innerHTML = `
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <div style="color: white; font-size: 14px; margin-bottom: 8px;">Tu plan actual</div>
                        <div style="color: white; font-size: 24px; font-weight: bold;">${planName}</div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong style="color: #2c3e50;">✨ Funciones disponibles:</strong>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;">
                        ${featureLabels.map(label => `
                            <div style="background: #f8f9fa; border-left: 3px solid #667eea; padding: 10px; border-radius: 4px; font-size: 13px;">
                                <span style="color: #28a745;">✓</span> ${label}
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 16px; padding: 12px; background: #e3f2fd; border-radius: 4px; font-size: 12px; color: #1976d2;">
                        <strong>Límites:</strong> Equipo: ${limits.team_members || 1} miembros | Clientes: ${limits.customers === 0 ? 'Ilimitados' : limits.customers}
                    </div>
                `;
            }
        } catch (error) {
            const container = document.getElementById('planFeaturesBox');
            if (container) {
                container.innerHTML = `
                    <div style="color: #e74c3c;">Error cargando funciones: ${error.message}</div>
                `;
            }
        }
    }

    getGreeting() {
        const user = authService.getCurrentUser();
        const hour = new Date().getHours();
        let greeting = '';

        if (hour < 12) {
            greeting = 'Buenos días';
        } else if (hour < 18) {
            greeting = 'Buenas tardes';
        } else {
            greeting = 'Buenas noches';
        }

        const firstName = user?.email?.split('@')[0]?.split('.')[0] || 'Usuario';
        const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

        return `${greeting}, ${capitalizedName}`;
    }

    getEmojiForBusinessType(businessType) {
        const emojiMap = {
            'veterinaria': '🏥',
            'barberia': '💈',
            'spa': '💆',
            'clinica': '⚕️',
            'salon': '💅',
            'peluqueria': '✂️',
            'farmacia': '💊',
            'dental': '🦷',
            'odontologia': '🦷',
            'otro': '📋'
        };

        return emojiMap[businessType?.toLowerCase()] || '📋';
    }

    getRoleLabel(role) {
        const roleLabels = {
            'admin': '🔑 Admin (Cuenta Maestra)',
            'manager': '👔 Manager (Dueño del Plan)',
            'team': '👥 Equipo',
            'viewer': '👥 Equipo'
        };
        return roleLabels[role] || role;
    }

    getRoleDescription(role) {
        const roleDescriptions = {
            'admin': '✓ Cuenta maestra con acceso total y control global',
            'manager': '✓ Dueño del plan con control de configuración, planes y equipo',
            'team': '✓ Cuenta de equipo con acceso limitado según permisos',
            'viewer': '✓ Cuenta de equipo con acceso limitado según permisos'
        };
        return roleDescriptions[role] || 'Rol personalizado';
    }

    getPlanDescription(plan) {
        const planDescriptions = {
            'free': 'Plan gratuito. Funciones básicas de solo lectura.',
            'starter': 'Plan inicial para pequeños negocios. Hasta 5 usuarios.',
            'pro': 'Plan profesional. Reportes avanzados y API. Hasta 25 usuarios.',
            'max': 'Plan completo. Todas las funciones, IA integrada, usuarios ilimitados.',
            'admin': 'Plan administrativo. Acceso completo al sistema.'
        };
        return planDescriptions[plan] || 'Plan personalizado';
    }
}

export default new DashboardView();
