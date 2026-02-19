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
                    <button class="btn btn-success" id="btnNewAppointment">+ Nueva Cita</button>
                </div>
                <div class="card-body" id="appointmentsContainer">
                    ${this.renderTable()}
                </div>
            </div>
        `;
    }

    renderTable() {
        const user = authService.getCurrentUser();
        const isAdmin = user && user.role === 'admin';
        
        const columns = [
            { key: 'scheduled_at', label: 'Fecha', type: 'datetime' },
            { key: 'customer.full_name', label: 'Cliente', formatter: (v) => v || 'N/A' },
            { key: 'notes', label: 'Servicio' },
            { key: 'status', label: 'Estado', type: 'badge' }
        ];
        
        if (isAdmin) {
            columns.push({
                key: 'actions',
                label: 'Acciones',
                formatter: (_, row) => `
                    <button class="btn btn-sm btn-danger" data-delete-appointment="${row.id}">Eliminar</button>
                `
            });
        }

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

        // Event listeners
        const btnNew = document.getElementById('btnNewAppointment');
        if (btnNew) {
            btnNew.addEventListener('click', () => this.showNewAppointmentModal());
        }
        
        // Delete appointment listener
        document.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('[data-delete-appointment]');
            if (deleteBtn) {
                const appointmentId = deleteBtn.dataset.deleteAppointment;
                const confirmed = await modal.confirm({
                    title: 'Confirmar eliminación',
                    message: '¿Estás seguro de que quieres eliminar esta cita?',
                    confirmText: 'Eliminar',
                    cancelText: 'Cancelar'
                });
                
                if (confirmed) {
                    try {
                        await apiService.delete(`/appointments/${appointmentId}`);
                        await this.init();
                        await modal.alert({ title: 'Éxito', message: 'Cita eliminada', type: 'success' });
                    } catch (error) {
                        await modal.alert({ title: 'Error', message: error.message, type: 'error' });
                    }
                }
            }
        });
    }

    async showNewAppointmentModal() {
        // Cargar clientes PRIMERO
        let customersOptions = '<option value="">Cargando clientes...</option>';
        try {
            const customers = await apiService.getCustomers();
            if (Array.isArray(customers) && customers.length > 0) {
                customersOptions = '<option value="">Seleccionar cliente...</option>';
                customers.forEach(c => {
                    customersOptions += `<option value="${c.id}">${c.full_name || 'Sin nombre'}</option>`;
                });
            } else {
                customersOptions = '<option value="">No hay clientes registrados</option>';
            }
        } catch (error) {
            console.error('Error loading customers:', error);
            customersOptions = '<option value="">Error al cargar clientes</option>';
        }

        const html = `
            <form id="appointmentForm">
                <div class="form-group">
                    <label>Cliente *</label>
                    <select name="customer_id" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        ${customersOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Fecha y Hora *</label>
                    <input type="datetime-local" name="scheduled_at" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                </div>
                <div class="form-group">
                    <label>Servicio *</label>
                    <input type="text" name="notes" placeholder="Ej: Corte de cabello" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        <option value="scheduled">Programada</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="completed">Completada</option>
                        <option value="canceled">Cancelada</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Guardar</button>
                    <button type="button" class="btn" data-close>Cancelar</button>
                </div>
            </form>
        `;

        const appointmentModal = modal.show({ 
            title: 'Nueva Cita', 
            content: html, 
            size: 'medium' 
        });

        const form = document.getElementById('appointmentForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            const appointmentData = {
                customer_id: parseInt(formData.get('customer_id')),
                scheduled_at: formData.get('scheduled_at'),
                service_id: null,
                duration_minutes: 60,
                status: formData.get('status') || 'scheduled',
                notes: formData.get('notes')
            };
            
            try {
                await apiService.post('/appointments/', appointmentData);
                modal.close(appointmentModal);
                await this.init();
                await modal.alert({ title: 'Éxito', message: 'Cita creada correctamente', type: 'success' });
            } catch (error) {
                console.error('Error creating appointment:', error);
                let errorMsg = error.message || 'Error desconocido';
                if (error.detail) {
                    errorMsg = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
                }
                await modal.alert({ title: 'Error', message: errorMsg, type: 'error' });
            }
        });
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
                    <button class="btn btn-success" id="btnNewPayment">+ Nuevo Pago</button>
                </div>
                <div class="card-body" id="paymentsContainer">
                    ${this.renderTable()}
                </div>
            </div>
        `;
    }

    renderTable() {
        const user = authService.getCurrentUser();
        const isAdmin = user && user.role === 'admin';
        
        const columns = [
            { key: 'created_at', label: 'Fecha', type: 'datetime' },
            { key: 'customer.full_name', label: 'Cliente', formatter: (v) => v || 'N/A' },
            { key: 'method', label: 'Método' },
            { key: 'final_amount', label: 'Monto', type: 'currency' },
            { key: 'status', label: 'Estado', type: 'badge', badgeClass: 'success' }
        ];
        
        if (isAdmin) {
            columns.push({
                key: 'actions',
                label: 'Acciones',
                formatter: (_, row) => `
                    <button class="btn btn-sm btn-danger" data-delete-payment="${row.id}">Eliminar</button>
                `
            });
        }

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

        // Event listeners
        const btnNew = document.getElementById('btnNewPayment');
        if (btnNew) {
            btnNew.addEventListener('click', () => this.showNewPaymentModal());
        }
        
        // Delete payment listener
        document.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('[data-delete-payment]');
            if (deleteBtn) {
                const paymentId = deleteBtn.dataset.deletePayment;
                const confirmed = await modal.confirm({
                    title: 'Confirmar eliminación',
                    message: '¿Estás seguro de que quieres eliminar este pago?',
                    confirmText: 'Eliminar',
                    cancelText: 'Cancelar'
                });
                
                if (confirmed) {
                    try {
                        await apiService.delete(`/payments/${paymentId}`);
                        await this.init();
                        await modal.alert({ title: 'Éxito', message: 'Pago eliminado', type: 'success' });
                    } catch (error) {
                        await modal.alert({ title: 'Error', message: error.message, type: 'error' });
                    }
                }
            }
        });
    }

    async showNewPaymentModal() {
        // Cargar clientes PRIMERO
        let customersOptions = '<option value="">Cargando clientes...</option>';
        try {
            const customers = await apiService.getCustomers();
            if (Array.isArray(customers) && customers.length > 0) {
                customersOptions = '<option value="">Seleccionar cliente...</option>';
                customers.forEach(c => {
                    customersOptions += `<option value="${c.id}">${c.full_name || 'Sin nombre'}</option>`;
                });
            } else {
                customersOptions = '<option value="">No hay clientes registrados</option>';
            }
        } catch (error) {
            console.error('Error loading customers:', error);
            customersOptions = '<option value="">Error al cargar clientes</option>';
        }

        const html = `
            <form id="paymentForm">
                <div class="form-group">
                    <label>Cliente *</label>
                    <select name="customer_id" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        ${customersOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Monto *</label>
                    <input type="number" name="amount" step="0.01" placeholder="0.00" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                </div>
                <div class="form-group">
                    <label>Método de Pago *</label>
                    <select name="method" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transferencia</option>
                        <option value="check">Cheque</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Concepto</label>
                    <input type="text" name="notes" placeholder="Descripción..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Guardar</button>
                    <button type="button" class="btn" data-close>Cancelar</button>
                </div>
            </form>
        `;

        const paymentModal = modal.show({ 
            title: 'Nuevo Pago', 
            content: html, 
            size: 'medium' 
        });

        const form = document.getElementById('paymentForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            const paymentData = {
                customer_id: parseInt(formData.get('customer_id')),
                amount: parseFloat(formData.get('amount')),
                method: formData.get('method'),
                notes: formData.get('notes') || null
            };
            
            try {
                await apiService.post('/payments/', paymentData);
                modal.close(paymentModal);
                await this.init();
                await modal.alert({ title: 'Éxito', message: 'Pago registrado correctamente', type: 'success' });
            } catch (error) {
                console.error('Error creating payment:', error);
                let errorMsg = error.message || 'Error desconocido';
                if (error.detail) {
                    errorMsg = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
                }
                await modal.alert({ title: 'Error', message: errorMsg, type: 'error' });
            }
        });
    }
}

// Cash Register View
export class CashRegisterView {
    constructor() {
        this.cart = [];
        this.total = 0;
        this.inventory = [];
    }

    render() {
        return `
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Punto de Venta</h2>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Buscar Producto</label>
                            <input type="text" id="searchProduct" placeholder="Buscar en inventario..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        </div>
                        <div id="productsList" style="max-height: 400px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; padding: 10px;">
                            <!-- Productos aquí -->
                        </div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">Carrito</h2>
                        </div>
                        <div class="card-body">
                            <div id="cartItems" style="max-height: 300px; overflow-y: auto;">
                                <p style="color: #7f8c8d; text-align: center;">Carrito vacío</p>
                            </div>
                            <hr style="margin: 12px 0;">
                            <div style="font-size: 18px; font-weight: bold; margin-bottom: 12px;">
                                Total: <span id="totalAmount">$0.00</span>
                            </div>
                            <button class="btn btn-success" id="btnCheckout" style="width: 100%; margin-bottom: 8px;">Procesar Pago</button>
                            <button class="btn btn-light" id="btnClearCart">Limpiar Carrito</button>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">Cliente</h2>
                        </div>
                        <div class="card-body">
                            <select id="cashCustomer" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                                <option value="">Sin cliente</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            // Cargar inventario
            const items = await apiService.getInventoryItems();
            if (Array.isArray(items)) {
                this.inventory = items;
                this.renderProducts();
            }

            // Cargar clientes
            const customers = await apiService.getCustomers();
            if (Array.isArray(customers)) {
                const select = document.getElementById('cashCustomer');
                if (select) {
                    customers.forEach(c => {
                        const option = document.createElement('option');
                        option.value = c.id;
                        option.textContent = c.full_name || 'Sin nombre';
                        select.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading cash register data:', error);
        }

        // Event listeners
        const btnCheckout = document.getElementById('btnCheckout');
        if (btnCheckout) btnCheckout.addEventListener('click', () => this.processPayment());

        const btnClear = document.getElementById('btnClearCart');
        if (btnClear) btnClear.addEventListener('click', () => this.clearCart());

        const searchInput = document.getElementById('searchProduct');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterProducts(e.target.value));
        }

        // Event delegation para agregar a carrito
        const productsList = document.getElementById('productsList');
        if (productsList) {
            productsList.addEventListener('click', (e) => {
                if (e.target.hasAttribute('data-add-to-cart')) {
                    const productId = parseInt(e.target.getAttribute('data-product-id'));
                    const productName = e.target.getAttribute('data-product-name');
                    const price = parseFloat(e.target.getAttribute('data-product-price'));
                    this.addToCart(productId, productName, price);
                }
            });
        }

        // Event delegation para quitar del carrito
        const cartItems = document.getElementById('cartItems');
        if (cartItems) {
            cartItems.addEventListener('click', (e) => {
                if (e.target.hasAttribute('data-remove-item')) {
                    const index = parseInt(e.target.getAttribute('data-item-index'));
                    this.removeFromCart(index);
                }
            });
        }
    }

    renderProducts(filter = '') {
        const filtered = this.inventory.filter(item => 
            !filter || (item.name || item.product_name || '').toLowerCase().includes(filter.toLowerCase())
        );

        const container = document.getElementById('productsList');
        if (!container) return;

        container.innerHTML = filtered.map(item => `
            <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${item.name || item.product_name}</strong>
                    <p style="color: #7f8c8d; font-size: 12px; margin: 4px 0;">$${item.price || 0} (Stock: ${item.quantity || 0})</p>
                </div>
                <button class="btn btn-primary" data-add-to-cart data-product-id="${item.id}" data-product-name="${(item.name || item.product_name).replace(/"/g, '&quot;')}" data-product-price="${item.price || 0}">+</button>
            </div>
        `).join('');
    }

    filterProducts(query) {
        this.renderProducts(query);
    }

    addToCart(productId, productName, price) {
        const existing = this.cart.find(item => item.id === productId);
        if (existing) {
            existing.quantity++;
        } else {
            this.cart.push({ id: productId, name: productName, price, quantity: 1 });
        }
        this.updateCart();
    }

    updateCart() {
        this.total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const container = document.getElementById('cartItems');
        if (container) {
            container.innerHTML = this.cart.map((item, idx) => `
                <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${item.name}</strong>
                        <p style="color: #7f8c8d; font-size: 12px; margin: 4px 0;">$${item.price} x ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <button class="btn btn-danger" data-remove-item data-item-index="${idx}">Quitar</button>
                </div>
            `).join('');
        }

        const totalEl = document.getElementById('totalAmount');
        if (totalEl) {
            totalEl.textContent = '$' + this.total.toFixed(2);
        }
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.updateCart();
    }

    clearCart() {
        this.cart = [];
        this.total = 0;
        this.updateCart();
    }

    async processPayment() {
        if (this.cart.length === 0) {
            await modal.alert({ title: 'Carrito vacío', message: 'Añade productos antes de procesar pago', type: 'warning' });
            return;
        }

        const customerId = document.getElementById('cashCustomer')?.value;
        const paymentData = {
            customer_id: customerId || null,
            amount: this.total,
            payment_method: 'cash',
            description: `Venta POS: ${this.cart.map(i => i.name).join(', ')}`,
            status: 'completed'
        };

        try {
            await apiService.post('/payments/', paymentData);
            await modal.alert({ title: 'Éxito', message: `Pago de $${this.total.toFixed(2)} procesado correctamente` });
            this.clearCart();
        } catch (error) {
            await modal.alert({ title: 'Error', message: error.message, type: 'error' });
        }
    }
}

// Reports View
export class ReportsView {
    constructor() {
        this.stats = {
            sales: 0,
            expenses: 0,
            profit: 0,
            transactions: 0
        };
    }

    render() {
        const user = authService.getCurrentUser();
        const isAdmin = user?.role === 'admin';
        const plan = user?.plan || 'free';

        // Plan limitations
        const canViewExpenses = isAdmin || ['start', 'max'].includes(plan);
        const canViewProfit = isAdmin || ['max'].includes(plan);
        const canViewDetailed = isAdmin || ['plus', 'start', 'max'].includes(plan);

        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Ventas del Mes</h3>
                    <div class="value">$${this.stats.sales.toFixed(2)}</div>
                </div>
                ${canViewExpenses ? `
                <div class="stat-card">
                    <h3>Gastos del Mes</h3>
                    <div class="value">$${this.stats.expenses.toFixed(2)}</div>
                </div>
                ` : `
                <div class="stat-card" style="opacity: 0.5;">
                    <h3>Gastos del Mes</h3>
                    <div class="value">🔒</div>
                    <p style="font-size: 12px; color: #7f8c8d;">Disponible en plan Start</p>
                </div>
                `}
                ${canViewProfit ? `
                <div class="stat-card">
                    <h3>Ganancia Neta</h3>
                    <div class="value">$${this.stats.profit.toFixed(2)}</div>
                </div>
                ` : `
                <div class="stat-card" style="opacity: 0.5;">
                    <h3>Ganancia Neta</h3>
                    <div class="value">🔒</div>
                    <p style="font-size: 12px; color: #7f8c8d;">Disponible en plan Max</p>
                </div>
                `}
                <div class="stat-card">
                    <h3>Transacciones</h3>
                    <div class="value">${this.stats.transactions}</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Reportes Financieros</h2>
                </div>
                <div class="card-body">
                    ${canViewDetailed ? `
                        <div style="margin-bottom: 20px;">
                            <h3>📊 Reportes Disponibles</h3>
                            <ul style="list-style: none; padding: 0;">
                                <li style="padding: 10px; border-bottom: 1px solid #eee;">
                                    <a href="#" onclick="event.preventDefault(); alert('Reporte de Ventas: Próximamente')">📈 Reporte de Ventas por Producto</a>
                                </li>
                                <li style="padding: 10px; border-bottom: 1px solid #eee;">
                                    <a href="#" onclick="event.preventDefault(); alert('Reporte de Clientes: Próximamente')">👥 Reporte de Clientes más Activos</a>
                                </li>
                                ${['start', 'max'].includes(plan) || isAdmin ? `
                                <li style="padding: 10px; border-bottom: 1px solid #eee;">
                                    <a href="#" onclick="event.preventDefault(); alert('Reporte de Gastos: Próximamente')">💸 Reporte de Gastos</a>
                                </li>
                                ` : ''}
                                ${['max'].includes(plan) || isAdmin ? `
                                <li style="padding: 10px;">
                                    <a href="#" onclick="event.preventDefault(); alert('Análisis de Ganancias: Próximamente')">💰 Análisis de Ganancias</a>
                                </li>
                                ` : ''}
                            </ul>
                        </div>
                        <div style="background: #f0f8ff; padding: 12px; border-radius: 4px; margin-top: 12px;">
                            <p style="margin: 0; color: #2c3e50; font-size: 12px;">
                                📌 Los reportes detallados se generarán próximamente. Actualmente puedes consultar el resumen mensual arriba.
                            </p>
                        </div>
                    ` : `
                        <div style="background: #fff3cd; padding: 12px; border-radius: 4px;">
                            <p style="margin: 0; color: #856404;">
                                🔒 Acceso limitado en tu plan. Reportes disponibles en planes Plus, Start o Max.
                            </p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    async init() {
        try {
            // Cargar datos de pagos para reportes
            const payments = await apiService.getPayments();
            if (Array.isArray(payments)) {
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                
                const monthPayments = payments.filter(p => {
                    const date = new Date(p.payment_date);
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                });

                this.stats.sales = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                this.stats.transactions = monthPayments.length;
            }
        } catch (error) {
            console.error('Error loading reports:', error);
        }
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
