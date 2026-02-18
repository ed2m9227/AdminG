/**
 * Simple Views for remaining modules
 * Responsabilidad: Vistas placeholder para módulos pendientes
 */

import table from '../components/Table.js';
import apiService from '../services/api.service.js';
import modal from '../components/Modal.js';

// Appointments View
export class AppointmentsView {
    constructor() {
        this.appointments = [];
    }

    render() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Agenda de Citas</h2>
                    <button class="btn btn-success">+ Nueva Cita</button>
                </div>
                <div class="card-body" id="appointmentsContainer">
                    ${this.renderTable()}
                </div>
            </div>
        `;
    }

    renderTable() {
        const columns = [
            { key: 'appointment_date', label: 'Fecha', type: 'datetime' },
            { key: 'customer.name', label: 'Cliente', formatter: (v) => v || 'N/A' },
            { key: 'service_type', label: 'Servicio' },
            { key: 'status', label: 'Estado', type: 'badge' }
        ];

        return table.render({
            columns,
            data: this.appointments,
            emptyMessage: 'No hay citas programadas',
            emptyIcon: '📅'
        });
    }

    async init() {
        try {
            this.appointments = await apiService.getAppointments();
            const container = document.getElementById('appointmentsContainer');
            if (container) container.innerHTML = this.renderTable();
        } catch (error) {
            console.error('Error loading appointments:', error);
        }
    }
}

// Payments View
export class PaymentsView {
    constructor() {
        this.payments = [];
    }

    render() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Registro de Pagos</h2>
                    <button class="btn btn-success">+ Nuevo Pago</button>
                </div>
                <div class="card-body" id="paymentsContainer">
                    ${this.renderTable()}
                </div>
            </div>
        `;
    }

    renderTable() {
        const columns = [
            { key: 'payment_date', label: 'Fecha', type: 'date' },
            { key: 'customer.name', label: 'Cliente', formatter: (v) => v || 'N/A' },
            { key: 'payment_method', label: 'Método' },
            { key: 'amount', label: 'Monto', type: 'currency' },
            { key: 'status', label: 'Estado', type: 'badge', badgeClass: 'success' }
        ];

        return table.render({
            columns,
            data: this.payments,
            emptyMessage: 'No hay pagos registrados',
            emptyIcon: '💳'
        });
    }

    async init() {
        try {
            this.payments = await apiService.getPayments();
            const container = document.getElementById('paymentsContainer');
            if (container) container.innerHTML = this.renderTable();
        } catch (error) {
            console.error('Error loading payments:', error);
        }
    }
}

// Cash Register View
export class CashRegisterView {
    render() {
        return `
            <div class="card">
                <h2 class="card-title">Caja Registradora</h2>
                <div class="empty-state">
                    <div class="empty-state-icon">💰</div>
                    <p>Sistema de punto de venta</p>
                    <p style="color: #7f8c8d; font-size: 14px;">Próximamente disponible</p>
                </div>
            </div>
        `;
    }

    init() {
        // Placeholder
    }
}

// Reports View
export class ReportsView {
    render() {
        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Ventas del Mes</h3>
                    <div class="value">$0</div>
                </div>
                <div class="stat-card">
                    <h3>Gastos del Mes</h3>
                    <div class="value">$0</div>
                </div>
                <div class="stat-card">
                    <h3>Ganancia Neta</h3>
                    <div class="value">$0</div>
                </div>
                <div class="stat-card">
                    <h3>Transacciones</h3>
                    <div class="value">0</div>
                </div>
            </div>
            
            <div class="card">
                <h2 class="card-title">Reportes Financieros</h2>
                <p style="color: #7f8c8d; margin-top: 10px;">
                    Reportes detallados próximamente. Use el endpoint 
                    <code>/reports/summary</code> para obtener datos via API.
                </p>
            </div>
        `;
    }

    init() {
        // Placeholder
    }
}

// Admin View
export class AdminView {
    render() {
        return `
            <div class="card">
                <h2 class="card-title">Panel de Administración</h2>
                <p style="color: #7f8c8d; margin-top: 10px;">
                    Gestión de usuarios, planes y configuración del sistema.
                </p>
                <div class="empty-state">
                    <div class="empty-state-icon">⚙️</div>
                    <p>Módulo de administración en desarrollo</p>
                </div>
            </div>
        `;
    }

    init() {
        // Placeholder
    }
}

// Exportar instancias
export const appointmentsView = new AppointmentsView();
export const paymentsView = new PaymentsView();
export const cashRegisterView = new CashRegisterView();
export const reportsView = new ReportsView();
export const adminView = new AdminView();
