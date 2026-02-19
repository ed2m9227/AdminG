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

        return `
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
                    <div class="value" id="statRevenue">$${this.stats.revenue}</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Funciones disponibles por plan</h2>
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
                this.updateStat('statRevenue', this.stats.revenue.toFixed(2));
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    updateStat(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
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
}

export default new DashboardView();
