// filepath: frontend-dist/js/views/TreasuryView.js
/**
 * Fase 2 - Tesorería
 * Vista para gestión de pagos e impuestos
 */
export class TreasuryView {
    constructor() {
        this.currentTab = 'payments';
    }

    render() {
        return `
            <div class="view-header">
                <h1>💰 Tesorería JAC</h1>
                <p>Gestión de pagos, impuestos y control financiero</p>
            </div>
            
            <div class="view-tabs">
                <button class="tab-btn active" data-tab="payments">Pagos</button>
                <button class="tab-btn" data-tab="taxes">Impuestos</button>
                <button class="tab-btn" data-tab="alerts">Alertas</button>
                <button class="tab-btn" data-tab="dashboard">Dashboard</button>
            </div>
            
            <div class="tab-content active" id="payments-tab">
                ${this.renderPayments()}
            </div>
            
            <div class="tab-content" id="taxes-tab">
                ${this.renderTaxes()}
            </div>
            
            <div class="tab-content" id="alerts-tab">
                ${this.renderAlerts()}
            </div>
            
            <div class="tab-content" id="dashboard-tab">
                ${this.renderDashboard()}
            </div>
        `;
    }

    renderPayments() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Registro de Pagos</h3>
                    <button class="btn btn-primary" onclick="treasuryView.showPaymentModal()">
                        + Nuevo Pago
                    </button>
                </div>
                <div class="card-body">
                    <div id="payments-list" class="data-list">
                        <p class="text-muted">Cargando pagos...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderTaxes() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Impuestos</h3>
                    <button class="btn btn-primary" onclick="treasuryView.showTaxModal()">
                        + Nuevo Impuesto
                    </button>
                </div>
                <div class="card-body">
                    <div id="taxes-list" class="data-list">
                        <p class="text-muted">Cargando impuestos...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderAlerts() {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>Alertas Fiscales</h3>
                </div>
                <div class="card-body">
                    <div id="alerts-list" class="alerts-container">
                        <p class="text-muted">Cargando alertas...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderDashboard() {
        return `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-icon">💵</div>
                    <div class="stat-value" id="total-payments">-</div>
                    <div class="stat-label">Total Pagos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-value" id="total-tax-payments">-</div>
                    <div class="stat-label">Impuestos Pagados</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-value" id="pending-taxes">-</div>
                    <div class="stat-label">Pendientes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🔒</div>
                    <div class="stat-value" id="fraud-alerts">-</div>
                    <div class="stat-label">Alertas de Fraude</div>
                </div>
            </div>
        `;
    }

    showPaymentModal(payment = null) {
        const isEdit = payment ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nuevo'} Pago</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="payment-form" onsubmit="treasuryView.savePayment(event)">
                        <div class="form-group">
                            <label>Tipo de Pago *</label>
                            <select name="tipo_pago" required>
                                <option value="">Seleccionar</option>
                                <option value="cuota">Cuota Mensual</option>
                                <option value="aporte">Aporte Extraordinario</option>
                                <option value="donacion">Donación</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Concepto *</label>
                            <input type="text" name="concepto" required>
                        </div>
                        <div class="form-group">
                            <label>Monto *</label>
                            <input type="number" name="monto" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Fecha de Pago *</label>
                            <input type="date" name="fecha_pago" required>
                        </div>
                        <div class="form-group">
                            <label>Método de Pago</label>
                            <select name="metodo_pago">
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="consignacion">Consignación</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${payment ? `<input type="hidden" name="id" value="${payment.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    showTaxModal(tax = null) {
        const isEdit = tax ? true : false;
        const modal = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Editar' : 'Nuevo'} Impuesto</h3>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                    <form id="tax-form" onsubmit="treasuryView.saveTax(event)">
                        <div class="form-group">
                            <label>Tipo de Impuesto *</label>
                            <select name="tipo_impuesto" required>
                                <option value="">Seleccionar</option>
                                <option value="renta">Declaración de Renta</option>
                                <option value="ica">ICA</option>
                                <option value="iva">IVA</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Número de Pago *</label>
                            <input type="text" name="numero_pago" required>
                        </div>
                        <div class="form-group">
                            <label>Monto *</label>
                            <input type="number" name="monto" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Fecha de Pago *</label>
                            <input type="date" name="fecha_pago" required>
                        </div>
                        <div class="form-group">
                            <label>Fecha de Vencimiento</label>
                            <input type="date" name="fecha_vencimiento">
                        </div>
                        <div class="form-group">
                            <label>Entidad Recaudadora</label>
                            <input type="text" name="entidad_recaudadora">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'}</button>
                        </div>
                        ${tax ? `<input type="hidden" name="id" value="${tax.id}">` : ''}
                    </form>
                </div>
            </div>
        `;
        showModal(modal);
    }

    async loadData() {
        try {
            const [paymentsRes, taxesRes, alertsRes, dashRes] = await Promise.all([
                fetch('/treasury/payments'),
                fetch('/treasury/taxes'),
                fetch('/treasury/tax-alerts'),
                fetch('/treasury/dashboard')
            ]);
            
            const payments = await paymentsRes.json();
            const taxes = await taxesRes.json();
            const alerts = await alertsRes.json();
            const dashboard = await dashRes.json();
            
            this.renderPaymentsList(payments);
            this.renderTaxesList(taxes);
            this.renderAlertsList(alerts);
            this.renderDashboardData(dashboard);
        } catch (error) {
            console.error('Error loading treasury data:', error);
        }
    }

    renderPaymentsList(payments) {
        const container = document.getElementById('payments-list');
        if (!payments || payments.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay pagos registrados</p>';
            return;
        }
        
        container.innerHTML = payments.map(p => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${p.concepto}</h4>
                    <p>${p.tipo_pago} - ${formatCurrency(p.monto)}</p>
                </div>
                <div class="data-item-meta">
                    <span>${p.fecha_pago}</span>
                </div>
            </div>
        `).join('');
    }

    renderTaxesList(taxes) {
        const container = document.getElementById('taxes-list');
        if (!taxes || taxes.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay impuestos registrados</p>';
            return;
        }
        
        container.innerHTML = taxes.map(t => `
            <div class="data-item">
                <div class="data-item-main">
                    <h4>${t.tipo_impuesto}</h4>
                    <p>#${t.numero_pago} - ${formatCurrency(t.monto)}</p>
                </div>
                <div class="data-item-meta">
                    <span class="badge badge-${t.estado === 'pagado' ? 'success' : 'warning'}">${t.estado}</span>
                </div>
            </div>
        `).join('');
    }

    renderAlertsList(alerts) {
        const container = document.getElementById('alerts-list');
        if (!alerts || alerts.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay alertas</p>';
            return;
        }
        
        container.innerHTML = alerts.map(a => `
            <div class="alert-item alert-${a.nivel}">
                <strong>${a.titulo}</strong>
                <p>${a.mensaje}</p>
                <span class="alert-date">${a.fecha}</span>
            </div>
        `).join('');
    }

    renderDashboardData(dashboard) {
        document.getElementById('total-payments').textContent = dashboard.total_payments || 0;
        document.getElementById('total-tax-payments').textContent = dashboard.total_tax_payments || 0;
        document.getElementById('pending-taxes').textContent = dashboard.pending_taxes || 0;
        document.getElementById('fraud-alerts').textContent = dashboard.fraud_alerts || 0;
    }

    async savePayment(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/treasury/payments/${data.id}` : '/treasury/payments';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Pago guardado exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving payment:', error);
        }
    }

    async saveTax(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const method = data.id ? 'PUT' : 'POST';
            const url = data.id ? `/treasury/taxes/${data.id}` : '/treasury/taxes';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                closeModal();
                this.loadData();
                showNotification('Impuesto guardado exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error saving tax:', error);
        }
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

const treasuryView = new TreasuryView();
export default treasuryView;