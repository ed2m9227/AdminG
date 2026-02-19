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
            const [customersData, inventoryData] = await Promise.allSettled([
                apiService.getCustomers(),
                apiService.getInventoryItems()
            ]);

            if (customersData.status === 'fulfilled') {
                this.stats.customers = customersData.value.items?.length || 0;
                this.updateStat('statCustomers', this.stats.customers);
            }

            if (inventoryData.status === 'fulfilled') {
                this.stats.inventory = inventoryData.value.length || 0;
                this.updateStat('statInventory', this.stats.inventory);
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

            const featureLabels = features.map(f => f.replace(/_/g, ' '));
            const container = document.getElementById('planFeaturesBox');

            if (container) {
                container.innerHTML = `
                    <div style="margin-bottom: 12px;">
                        <span class="badge badge-info">PLAN ${plan.toUpperCase()}</span>
                        <span style="margin-left: 8px; color: #7f8c8d;">Funciones activas</span>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${featureLabels.map(label => `
                            <span style="background: #f0f8ff; border: 1px solid #d9e8ff; color: #2c3e50; padding: 6px 10px; border-radius: 16px; font-size: 12px;">
                                ${label}
                            </span>
                        `).join('')}
                    </div>
                    <div style="margin-top: 12px; color: #7f8c8d; font-size: 12px;">
                        Límite de equipo: ${limits.team_members || 1} | Clientes: ${limits.customers || 0}
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
