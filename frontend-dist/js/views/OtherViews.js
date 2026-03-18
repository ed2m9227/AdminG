/**
 * Simple Views for remaining modules
 * Responsabilidad: Vistas placeholder para módulos pendientes
 */

import table from '../components/Table.js';
import apiService from '../services/api.service.js';
import modal from '../components/Modal.js';
import authService from '../services/auth.service.js';

// Utility function to extract error message
function getErrorMessage(error) {
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.detail) return error.detail;
    if (error.response && error.response.message) return error.response.message;
    return 'Error desconocido. Por favor intenta de nuevo.';
}

// Appointments View
export class AppointmentsView {
    constructor() {
        this.appointments = [];
    }

    render() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Citas</h2>
                    <button class="btn btn-success" id="btnNewAppointment">+ 📅 Nueva Cita</button>
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
                    <button class="btn btn-sm btn-primary" data-edit-appointment="${row.id}">✏️ Editar</button>
                    <button class="btn btn-sm btn-danger" data-delete-appointment="${row.id}">🗑️ Eliminar</button>
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
                        await modal.alert({ title: 'Éxito', message: 'Cita eliminada correctamente', type: 'success' });
                    } catch (error) {
                        const errorMsg = getErrorMessage(error);
                        await modal.alert({ title: 'Error', message: 'Error al eliminar cita: ' + errorMsg, type: 'error' });
                    }
                }
            }
        });

        // Edit appointment listener
        document.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('[data-edit-appointment]');
            if (editBtn) {
                const appointmentId = editBtn.dataset.editAppointment;
                const appointment = this.appointments.find(a => a.id === parseInt(appointmentId));
                if (appointment) {
                    this.showEditAppointmentModal(appointment);
                }
            }
        });
    }

    async showNewAppointmentModal() {
        // Cargar clientes y servicios EN PARALELO
        let customersOptions = '<option value="">Cargando clientes...</option>';
        let servicesOptions = '<option value="">Cargar servicios...</option>';
        
        try {
            const [customers, services] = await Promise.all([
                apiService.getCustomers(),
                apiService.getServices()
            ]);
            
            if (Array.isArray(customers) && customers.length > 0) {
                customersOptions = '<option value="">Seleccionar cliente...</option>';
                customers.forEach(c => {
                    customersOptions += `<option value="${c.id}">${c.full_name || 'Sin nombre'}</option>`;
                });
            } else {
                customersOptions = '<option value="">No hay clientes registrados</option>';
            }
            
            if (Array.isArray(services) && services.length > 0) {
                servicesOptions = '<option value="">Seleccionar servicio...</option>';
                services.forEach(s => {
                    servicesOptions += `<option value="${s.id}">${s.name || 'Sin nombre'} (${this.formatCurrency(s.unit_price || 0)})</option>`;
                });
            } else {
                servicesOptions = '<option value="">No hay servicios disponibles</option>';
            }
        } catch (error) {
            console.error('Error loading data:', error);
            customersOptions = '<option value="">Error al cargar clientes</option>';
            servicesOptions = '<option value="">Error al cargar servicios</option>';
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
                    <label>Servicio</label>
                    <select name="service_id" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        ${servicesOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Notas adicionales</label>
                    <textarea name="notes" placeholder="Ej: Cliente requiere corte especial" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px; height: 80px;"></textarea>
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
                service_id: formData.get('service_id') ? parseInt(formData.get('service_id')) : null,
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

    async showEditAppointmentModal(appointment) {
        // Cargar clientes y servicios EN PARALELO
        let customersOptions = '<option value="">Cargando clientes...</option>';
        let servicesOptions = '<option value="">Cargar servicios...</option>';
        
        try {
            const [customers, services] = await Promise.all([
                apiService.getCustomers(),
                apiService.getServices()
            ]);
            
            if (Array.isArray(customers) && customers.length > 0) {
                customersOptions = '';
                customers.forEach(c => {
                    const selected = c.id === appointment.customer_id ? 'selected' : '';
                    customersOptions += `<option value="${c.id}" ${selected}>${c.full_name || 'Sin nombre'}</option>`;
                });
            }
            
            if (Array.isArray(services) && services.length > 0) {
                servicesOptions = '<option value="">Seleccionar servicio...</option>';
                services.forEach(s => {
                    const selected = s.id === appointment.service_id ? 'selected' : '';
                    servicesOptions += `<option value="${s.id}" ${selected}>${s.name || 'Sin nombre'} (${this.formatCurrency(s.unit_price || 0)})</option>`;
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }

        // Format the datetime-local input from ISO string
        const scheduledDate = new Date(appointment.scheduled_at);
        const isoString = scheduledDate.toISOString().slice(0, 16);

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
                    <input type="datetime-local" name="scheduled_at" value="${isoString}" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                </div>
                <div class="form-group">
                    <label>Servicio</label>
                    <select name="service_id" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        ${servicesOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Notas adicionales</label>
                    <textarea name="notes" placeholder="Ej: Cliente requiere corte especial" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px; height: 80px;">${appointment.notes || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        <option value="scheduled" ${appointment.status === 'scheduled' ? 'selected' : ''}>Programada</option>
                        <option value="confirmed" ${appointment.status === 'confirmed' ? 'selected' : ''}>Confirmada</option>
                        <option value="completed" ${appointment.status === 'completed' ? 'selected' : ''}>Completada</option>
                        <option value="canceled" ${appointment.status === 'canceled' ? 'selected' : ''}>Cancelada</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Actualizar</button>
                    <button type="button" class="btn" data-close>Cancelar</button>
                </div>
            </form>
        `;

        const appointmentModal = modal.show({ 
            title: 'Editar Cita', 
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
                service_id: formData.get('service_id') ? parseInt(formData.get('service_id')) : null,
                duration_minutes: 60,
                status: formData.get('status') || 'scheduled',
                notes: formData.get('notes')
            };
            
            try {
                await apiService.put(`/appointments/${appointment.id}`, appointmentData);
                modal.close(appointmentModal);
                await this.init();
                await modal.alert({ title: 'Éxito', message: 'Cita actualizada correctamente', type: 'success' });
            } catch (error) {
                console.error('Error updating appointment:', error);
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
        this.containerHandler = null; // Handler reference for removal
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    render() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Pagos</h2>
                    <button class="btn btn-success" id="btnNewPayment">+ 💳 Nuevo Pago</button>
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
        
        const statusFormatter = (status) => {
            const statusMap = {
                'pending': { label: 'Pendiente', class: 'warning', emoji: '⏳' },
                'completed': { label: 'Completado', class: 'success', emoji: '✅' },
                'cancelled': { label: 'Cancelado', class: 'danger', emoji: '❌' }
            };
            const s = statusMap[status] || { label: status, class: 'secondary', emoji: '❓' };
            return `<span class="badge badge-${s.class}">${s.emoji} ${s.label}</span>`;
        };
        
        const columns = [
            { key: 'created_at', label: 'Fecha', type: 'datetime' },
            { key: 'customer.full_name', label: 'Cliente', formatter: (v) => v || 'N/A' },
            { key: 'method', label: 'Método' },
            { key: 'final_amount', label: 'Monto', formatter: (v) => this.formatCurrency(v || 0) },
            { key: 'status', label: 'Estado', formatter: statusFormatter }
        ];
        
        if (isAdmin) {
            columns.push({
                key: 'actions',
                label: 'Acciones',
                formatter: (_, row) => `
                    <button class="btn btn-sm btn-primary" data-edit-payment="${row.id}">✏️ Editar</button>
                    <button class="btn btn-sm btn-danger" data-delete-payment="${row.id}">🗑️ Eliminar</button>
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
        console.log('🔄 PaymentsView: init() called');
        await this.reloadData();
        this.attachEventListeners();
    }

    async reloadData() {
        console.log('🔄 PaymentsView: Reloading payments data...');
        try {
            this.payments = await apiService.getPayments();
            console.log('✅ PaymentsView: Payments loaded:', this.payments.length);
            const container = document.getElementById('paymentsContainer');
            if (container) {
                container.innerHTML = this.renderTable();
                console.log('✅ PaymentsView: Table updated');
                // Re-attach listeners after innerHTML update
                this.attachEventListeners();
            }
        } catch (error) {
            console.error('❌ PaymentsView: Error loading payments:', error);
        }
    }

    attachEventListeners() {
        // New payment button - remove old listener first
        const btnNew = document.getElementById('btnNewPayment');
        if (btnNew) {
            const newBtnClone = btnNew.cloneNode(true);
            btnNew.parentNode.replaceChild(newBtnClone, btnNew);
            newBtnClone.addEventListener('click', () => this.showNewPaymentModal());
        }
        
        // Container click handler - remove old listener first
        const container = document.getElementById('paymentsContainer');
        if (container) {
            // Remove old handler if exists
            if (this.containerHandler) {
                container.removeEventListener('click', this.containerHandler);
            }
            
            // Create and save new handler
            this.containerHandler = async (e) => {
                // Handle delete
                const deleteBtn = e.target.closest('[data-delete-payment]');
                if (deleteBtn) {
                    e.preventDefault();
                    e.stopPropagation();
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
                            await this.reloadData(); // This will re-attach listeners
                            await modal.alert({ title: 'Éxito', message: 'Pago eliminado correctamente', type: 'success' });
                        } catch (error) {
                            const errorMsg = getErrorMessage(error);
                            await modal.alert({ title: 'Error', message: 'Error al eliminar pago: ' + errorMsg, type: 'error' });
                        }
                    }
                    return;
                }
                
                // Handle edit
                const editBtn = e.target.closest('[data-edit-payment]');
                if (editBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const paymentId = editBtn.dataset.editPayment;
                    const payment = this.payments.find(p => p.id === parseInt(paymentId));
                    if (payment) {
                        this.showEditPaymentModal(payment);
                    }
                }
            };
            
            // Attach new handler
            container.addEventListener('click', this.containerHandler);
        }
    }

    async showNewPaymentModal() {
        // Cargar clientes, servicios E INVENTARIO EN PARALELO
        let customersOptions = '<option value="">Cargando clientes...</option>';
        let itemsOptions = '<option value="">Seleccionar item...</option>';
        let customers = [];
        let services = [];
        let inventory = [];
        
        try {
            [customers, services, inventory] = await Promise.all([
                apiService.getCustomers(),
                apiService.getServices(),
                apiService.getInventoryItems()
            ]);
            
            if (Array.isArray(customers) && customers.length > 0) {
                customersOptions = '<option value="">Seleccionar cliente...</option>';
                customers.forEach(c => {
                    customersOptions += `<option value="${c.id}">${c.full_name || 'Sin nombre'}</option>`;
                });
            } else {
                customersOptions = '<option value="">No hay clientes registrados</option>';
            }
            
            // SERVICIOS
            if (Array.isArray(services) && services.length > 0) {
                itemsOptions = '<optgroup label="Servicios">';
                services.forEach(s => {
                    itemsOptions += `<option value="service:${s.id}" data-price="${s.unit_price || 0}">${s.name || 'Sin nombre'} (${this.formatCurrency(s.unit_price || 0)})</option>`;
                });
                itemsOptions += '</optgroup>';
            }
            
            // PRODUCTOS
            if (Array.isArray(inventory) && inventory.length > 0) {
                itemsOptions += '<optgroup label="Productos">';
                inventory.forEach(p => {
                    if (p.item_type === 'product' && p.is_active) {
                        itemsOptions += `<option value="product:${p.id}" data-price="${p.unit_price || 0}">${p.name || 'Sin nombre'} (${this.formatCurrency(p.unit_price || 0)})</option>`;
                    }
                });
                itemsOptions += '</optgroup>';
            }
        } catch (error) {
            console.error('Error loading data:', error);
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
                    <label>Método de Pago *</label>
                    <select name="method" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transferencia</option>
                        <option value="check">Cheque</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Items del Pago</label>
                    <div style="border: 1px solid #eee; border-radius: 4px; padding: 12px; margin-bottom: 12px;">
                        <div id="paymentItems" style="margin-bottom: 12px;">
                            <!-- Items agregados aquí -->
                        </div>
                        <div class="form-row" style="display: flex; gap: 8px; align-items: flex-end;">
                            <div style="flex: 1;">
                                <label style="font-size: 12px; display: block; margin-bottom: 4px;">Ítem</label>
                                <select id="itemSelect" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
                                    ${itemsOptions}
                                    <optgroup label="Otros">
                                        <option value="custom:0">Descripción personalizada</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div style="width: 80px;">
                                <label style="font-size: 12px; display: block; margin-bottom: 4px;">Cant.</label>
                                <input type="number" id="itemQty" min="1" value="1" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
                            </div>
                            <button type="button" id="btnAddItem" style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">+ Agregar</button>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Total</label>
                    <input type="number" id="paymentAmount" name="amount" step="0.01" placeholder="0.00" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px; font-weight: bold; font-size: 16px; background: #f9f9f9;" readonly>
                </div>

                <div class="form-group">
                    <label>Notas</label>
                    <textarea name="notes" placeholder="Notas adicionales..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px; height: 60px;"></textarea>
                </div>

                <div class="form-group">
                    <label>Estado</label>
                    <select name="status" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        <option value="pending">Pendiente</option>
                        <option value="completed" selected>Completado</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                </div>

                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Guardar Pago</button>
                    <button type="button" class="btn" data-close>Cancelar</button>
                </div>
            </form>
        `;

        const paymentModal = modal.show({ 
            title: 'Nuevo Pago', 
            content: html, 
            size: 'medium' 
        });

        // Setup item management
        const paymentItems = [];
        const itemsContainer = document.getElementById('paymentItems');
        const itemSelect = document.getElementById('itemSelect');
        const itemQty = document.getElementById('itemQty');
        const btnAddItem = document.getElementById('btnAddItem');
        const amountInput = document.getElementById('paymentAmount');
        
        // Store services/products for reference
        const itemsMap = {};
        services.forEach(s => itemsMap[`service:${s.id}`] = s);
        inventory.forEach(p => itemsMap[`product:${p.id}`] = p);

        const updateTotal = () => {
            const total = paymentItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
            amountInput.value = total.toFixed(2);
        };

        const renderItems = () => {
            itemsContainer.innerHTML = paymentItems.map((item, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f9f9f9; border-radius: 4px; margin-bottom: 6px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; font-size: 13px;">${item.description}</div>
                        <div style="font-size: 11px; color: #7f8c8d;">Cantidad: ${item.quantity} × ${this.formatCurrency(item.unit_price)}</div>
                    </div>
                    <div style="font-weight: 600; margin-right: 12px;">${this.formatCurrency(item.unit_price * item.quantity)}</div>
                    <button type="button" class="btn btn-sm btn-danger" data-remove="${idx}" style="padding: 4px 8px; font-size: 11px;">✕</button>
                </div>
            `).join('');

            // Attach remove handlers
            itemsContainer.querySelectorAll('[data-remove]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.dataset.remove);
                    paymentItems.splice(idx, 1);
                    renderItems();
                    updateTotal();
                });
            });
        };

        btnAddItem.addEventListener('click', () => {
            const selectedValue = itemSelect.value;
            const quantity = parseInt(itemQty.value) || 1;

            if (!selectedValue) {
                alert('Por favor selecciona un ítem');
                return;
            }

            let item = null;
            if (selectedValue.startsWith('service:')) {
                const serviceId = parseInt(selectedValue.split(':')[1]);
                const service = itemsMap[selectedValue];
                if (service) {
                    item = {
                        source_type: 'service',
                        service_id: serviceId,
                        description: service.name,
                        unit_price: parseFloat(service.unit_price),
                        quantity: quantity
                    };
                }
            } else if (selectedValue.startsWith('product:')) {
                const productId = parseInt(selectedValue.split(':')[1]);
                const product = itemsMap[selectedValue];
                if (product) {
                    item = {
                        source_type: 'product',
                        inventory_item_id: productId,
                        description: product.name,
                        unit_price: parseFloat(product.unit_price),
                        quantity: quantity
                    };
                }
            } else if (selectedValue === 'custom:0') {
                const customDesc = prompt('Descripción del ítem:');
                if (customDesc) {
                    const customPrice = prompt('Precio unitario:');
                    if (customPrice) {
                        item = {
                            source_type: 'custom',
                            description: customDesc,
                            unit_price: parseFloat(customPrice),
                            quantity: quantity
                        };
                    }
                }
            }

            if (item) {
                paymentItems.push(item);
                renderItems();
                updateTotal();
                itemQty.value = 1;
                itemSelect.value = '';
            }
        });

        const form = document.getElementById('paymentForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            if (paymentItems.length === 0) {
                alert('Por favor agrega al menos un ítem al pago');
                return;
            }
            
            const paymentData = {
                customer_id: parseInt(formData.get('customer_id')),
                amount: parseFloat(formData.get('amount')),
                method: formData.get('method'),
                status: formData.get('status') || 'completed',
                notes: formData.get('notes') || null,
                payment_items: paymentItems  // NUEVO: Enviar items
            };
            
            try {
                await apiService.post('/payments/', paymentData);
                modal.close(paymentModal);
                await this.reloadData();
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

    async showEditPaymentModal(payment) {
        // Cargar clientes y servicios EN PARALELO
        let customersOptions = '<option value="">Cargando clientes...</option>';
        let servicesOptions = '<option value="">Cargar servicios...</option>';
        
        try {
            const [customers, services] = await Promise.all([
                apiService.getCustomers(),
                apiService.getServices()
            ]);
            
            if (Array.isArray(customers) && customers.length > 0) {
                customersOptions = '';
                customers.forEach(c => {
                    const selected = c.id === payment.customer_id ? 'selected' : '';
                    customersOptions += `<option value="${c.id}" ${selected}>${c.full_name || 'Sin nombre'}</option>`;
                });
            }
            
            if (Array.isArray(services) && services.length > 0) {
                servicesOptions = '<option value="">Sin servicio específico</option>';
                services.forEach(s => {
                    const selected = s.id === payment.service_id ? 'selected' : '';
                    servicesOptions += `<option value="${s.id}" ${selected}>${s.name || 'Sin nombre'} (${this.formatCurrency(s.unit_price || 0)})</option>`;
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
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
                    <input type="number" name="amount" placeholder="0.00" value="${payment.amount}" step="0.01" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                </div>
                <div class="form-group">
                    <label>Método *</label>
                    <select name="method" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        <option value="cash" ${payment.method === 'cash' ? 'selected' : ''}>Efectivo</option>
                        <option value="card" ${payment.method === 'card' ? 'selected' : ''}>Tarjeta</option>
                        <option value="transfer" ${payment.method === 'transfer' ? 'selected' : ''}>Transferencia</option>
                        <option value="check" ${payment.method === 'check' ? 'selected' : ''}>Cheque</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Servicio</label>
                    <select name="service_id" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        ${servicesOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Concepto</label>
                    <input type="text" name="concept" placeholder="Ej: Corte + Peinado" value="${payment.concept || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select name="status" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        <option value="pending" ${payment.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                        <option value="completed" ${payment.status === 'completed' ? 'selected' : ''}>Completado</option>
                        <option value="cancelled" ${payment.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Actualizar</button>
                    <button type="button" class="btn" data-close>Cancelar</button>
                </div>
            </form>
        `;

        const paymentModal = modal.show({ 
            title: 'Editar Pago', 
            content: html, 
            size: 'medium' 
        });

        const form = document.getElementById('paymentForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            // Send status and concept fields (PaymentUpdate schema)
            const paymentData = {
                status: formData.get('status') || payment.status,
                concept: formData.get('concept') || null
            };
            
            console.log('💾 Updating payment:', payment.id, 'with data:', paymentData);
            
            try {
                const updated = await apiService.put(`/payments/${payment.id}`, paymentData);
                console.log('✅ Payment updated successfully:', updated);
                modal.close(paymentModal);
                await this.reloadData();
                await modal.alert({ title: 'Éxito', message: 'Pago actualizado correctamente', type: 'success' });
            } catch (error) {
                console.error('❌ Error updating payment:', error);
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
        this.movements = [];
        this.customersCache = [];
        this.cashRegisterOpen = false;
    }

    formatCurrency(value) {
        // Formato colombiano: xxx.xxx,xx
        return new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    render() {
        return `
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 20px;">
                <!-- Punto de Venta -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Punto de Venta</h2>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Buscar Producto</label>
                            <input type="text" id="searchProduct" placeholder="Buscar en inventario..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        </div>
                        <div id="productsList" style="max-height: 500px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; padding: 10px;">
                            <!-- Productos aquí -->
                        </div>
                    </div>
                </div>

                <!-- Carrito -->
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
                                Total: <span id="totalAmount" style="color: #667eea;">${this.formatCurrency(0)}</span>
                            </div>
                            <button class="btn btn-success" id="btnCheckout" style="width: 100%; margin-bottom: 8px;">💳 Procesar Pago</button>
                            <button class="btn btn-secondary" id="btnClearCart">🗑️ Limpiar Carrito</button>
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

                <!-- Operaciones Caja -->
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">Operaciones</h2>
                        </div>
                        <div class="card-body">
                            <div id="cashRegisterStatus" style="padding: 12px; margin-bottom: 12px; border-radius: 8px; text-align: center; font-weight: 600;"></div>
                            <button class="btn btn-full" id="btnOpenCash" style="margin-bottom: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; display: none;">🔓 Abrir Caja</button>
                            <button class="btn btn-full" id="btnCloseCash" style="margin-bottom: 8px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; display: none;">🔒 Cerrar Caja</button>
                            <button class="btn btn-full" id="btnAddExpense" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;">📊 Agregar Gasto</button>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h2 class="card-title">Movimientos</h2>
                        </div>
                        <div class="card-body">
                            <div id="movementsList" style="max-height: 300px; overflow-y: auto; font-size: 12px;">
                                <p style="color: #7f8c8d; text-align: center;">Sin movimientos</p>
                            </div>
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
                this.customersCache = customers;
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

            // Cargar transacciones de caja del día
            try {
                const transactions = await apiService.get('/cashregister/transactions?limit=50');
                if (Array.isArray(transactions) && transactions.length > 0) {
                    // Enriquecer transacciones con datos del cliente
                    this.movements = transactions.map(t => {
                        let customer = null;
                        if (t.customer_id && customers) {
                            customer = customers.find(c => c.id === t.customer_id);
                        }
                        return {
                            type: t.transaction_type,
                            amount: t.amount,
                            timestamp: new Date(t.created_at).toLocaleTimeString('es-CO'),
                            created_at: t.created_at,
                            customer: customer ? customer.full_name : null,
                            description: t.description
                        };
                    });
                    await this.syncCashRegisterStatus();  // Sync with server first
                    this.updateMovements();
                } else {
                    this.movements = [];
                    await this.syncCashRegisterStatus();  // Sync with server
                }
            } catch (error) {
                console.warn('Could not load cash transactions:', error);
                this.movements = [];
                await this.syncCashRegisterStatus();  // Sync with server regardless
            }
        } catch (error) {
            console.error('Error loading cash register data:', error);
        }

        // Event listeners
        const btnCheckout = document.getElementById('btnCheckout');
        if (btnCheckout) btnCheckout.addEventListener('click', () => this.processPayment());

        const btnClear = document.getElementById('btnClearCart');
        if (btnClear) btnClear.addEventListener('click', () => this.clearCart());

        const btnOpenCash = document.getElementById('btnOpenCash');
        if (btnOpenCash) btnOpenCash.addEventListener('click', () => this.openCashRegister());

        const btnCloseCash = document.getElementById('btnCloseCash');
        if (btnCloseCash) btnCloseCash.addEventListener('click', () => this.closeCashRegister());

        const btnAddExpense = document.getElementById('btnAddExpense');
        if (btnAddExpense) btnAddExpense.addEventListener('click', () => this.addExpense());

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

        // Event delegation para cambiar cantidad y quitar del carrito
        const cartItems = document.getElementById('cartItems');
        if (cartItems) {
            cartItems.addEventListener('click', (e) => {
                if (e.target.hasAttribute('data-decrease-qty')) {
                    const index = parseInt(e.target.getAttribute('data-item-index'));
                    this.decreaseQuantity(index);
                } else if (e.target.hasAttribute('data-increase-qty')) {
                    const index = parseInt(e.target.getAttribute('data-item-index'));
                    this.increaseQuantity(index);
                } else if (e.target.hasAttribute('data-remove-item')) {
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

        container.innerHTML = filtered.map(item => {
            const unitPrice = item.unit_price || item.price || 0;
            return `
                <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${item.name || item.product_name}</strong>
                        <p style="color: #7f8c8d; font-size: 12px; margin: 4px 0;">${this.formatCurrency(parseFloat(unitPrice))} (Stock: ${item.quantity || 0})</p>
                    </div>
                    <button class="btn btn-primary btn-sm" data-add-to-cart data-product-id="${item.id}" data-product-name="${(item.name || item.product_name).replace(/"/g, '&quot;')}" data-product-price="${unitPrice}">+</button>
                </div>
            `;
        }).join('');
    }

    filterProducts(query) {
        this.renderProducts(query);
    }

    addToCart(productId, productName, price) {
        const priceNum = parseFloat(price) || 0;
        const existing = this.cart.find(item => item.id === productId);
        if (existing) {
            existing.quantity++;
        } else {
            this.cart.push({ id: productId, name: productName, price: priceNum, quantity: 1 });
        }
        this.updateCart();
    }

    decreaseQuantity(index) {
        if (this.cart[index]) {
            this.cart[index].quantity--;
            if (this.cart[index].quantity <= 0) {
                this.cart.splice(index, 1);
            }
            this.updateCart();
        }
    }

    increaseQuantity(index) {
        if (this.cart[index]) {
            this.cart[index].quantity++;
            this.updateCart();
        }
    }

    removeFromCart(index) {
        if (this.cart[index]) {
            this.cart.splice(index, 1);
            this.updateCart();
        }
    }

    clearCart() {
        this.cart = [];
        this.total = 0;
        this.updateCart();
    }

    async refreshMovements() {
        try {
            const transactions = await apiService.get('/cashregister/transactions?limit=50');
            
            if (Array.isArray(transactions)) {
                this.movements = transactions.map(t => {
                    let customer = null;
                    if (t.customer_id && Array.isArray(this.customersCache)) {
                        customer = this.customersCache.find(c => c.id === t.customer_id);
                    }
                    return {
                        type: t.transaction_type,
                        amount: t.amount,
                        timestamp: new Date(t.created_at).toLocaleTimeString('es-CO'),
                        created_at: t.created_at,
                        customer: customer ? customer.full_name : null,
                        description: t.description
                    };
                });
            } else {
                this.movements = [];
            }

            // Sync with server status endpoint
            await this.syncCashRegisterStatus();
            this.updateMovements();
        } catch (error) {
            console.warn('Error refreshing cash movements:', error);
            this.movements = [];
            // Try to sync status even if movements fail
            try {
                await this.syncCashRegisterStatus();
            } catch (e) {
                console.warn('Could not sync cash status: ', e);
                this.checkCashRegisterStatus();
            }
            this.updateMovements();
        }
    }

    async syncCashRegisterStatus() {
        try {
            // Get server status to override local state
            const status = await apiService.get('/cashregister');
            this.cashRegisterOpen = (status?.status === 'open');
            console.log('✓ Cash status synced from server:', this.cashRegisterOpen);
        } catch (error) {
            console.warn('Could not sync with server, using local state');
            this.checkCashRegisterStatus();
        }
    }

    checkCashRegisterStatus() {
        // Verificar si hay base registrada hoy sin cierre posterior
        const today = new Date().toDateString();
        
        // Filtrar movimientos de hoy
        const todayMovements = this.movements.filter(m => {
            const moveDate = new Date(m.created_at).toDateString();
            return moveDate === today;
        });
        
        // Buscar última base y último cierre (el más reciente de cada tipo)
        let lastBase = null;
        let lastClose = null;
        
        todayMovements.forEach(m => {
            if (m.type === 'base') {
                if (!lastBase || new Date(m.created_at) > new Date(lastBase.created_at)) {
                    lastBase = m;
                }
            }
            if (m.type === 'close') {
                if (!lastClose || new Date(m.created_at) > new Date(lastClose.created_at)) {
                    lastClose = m;
                }
            }
        });
        
        // Caja está abierta solo si hay base y NO hay cierre posterior (o no hay cierre)
        if (lastBase && lastClose) {
            const baseTime = new Date(lastBase.created_at).getTime();
            const closeTime = new Date(lastClose.created_at).getTime();
            this.cashRegisterOpen = baseTime > closeTime; // Abierta solo si base es más reciente que cierre
        } else if (lastBase && !lastClose) {
            this.cashRegisterOpen = true; // Hay base sin cierre
        } else {
            this.cashRegisterOpen = false; // No hay base o solo hay cierre
        }

        console.log('📊 Estado caja:', { 
            cashRegisterOpen: this.cashRegisterOpen, 
            lastBase: lastBase?.created_at, 
            lastClose: lastClose?.created_at,
            todayMovements: todayMovements.length
        });
        
        this.updateCashRegisterUI();
    }

    updateCashRegisterUI() {
        const btnOpen = document.getElementById('btnOpenCash');
        const btnClose = document.getElementById('btnCloseCash');
        const statusDiv = document.getElementById('cashRegisterStatus');

        if (!btnOpen || !btnClose || !statusDiv) return;

        if (this.cashRegisterOpen) {
            // Caja abierta: mostrar botón cerrar
            btnOpen.style.display = 'none';
            btnClose.style.display = 'block';
            statusDiv.innerHTML = '✅ Caja Abierta';
            statusDiv.style.background = 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)';
            statusDiv.style.color = '#065f46';
        } else {
            // Caja cerrada: mostrar botón abrir
            btnOpen.style.display = 'block';
            btnClose.style.display = 'none';
            statusDiv.innerHTML = '🔒 Caja Cerrada';
            statusDiv.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
            statusDiv.style.color = '#991b1b';
        }
    }

    updateCart() {
        this.total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const container = document.getElementById('cartItems');
        if (container) {
            if (this.cart.length === 0) {
                container.innerHTML = '<p style="color: #7f8c8d; text-align: center;">Carrito vacío</p>';
            } else {
                container.innerHTML = this.cart.map((item, idx) => `
                    <div style="padding: 10px; border-bottom: 1px solid #eee;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong>${item.name}</strong>
                            <button class="btn btn-danger btn-xs" data-remove-item data-item-index="${idx}">🗑️</button>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; color: #6b7280; font-size: 12px;">
                            <span>${this.formatCurrency(item.price)}</span>
                            <div style="display: flex; gap: 4px; align-items: center;">
                                <button class="btn btn-xs" style="background: #e5e7eb; color: #1f2937;" data-decrease-qty data-item-index="${idx}">−</button>
                                <span style="min-width: 20px; text-align: center;">${item.quantity}</span>
                                <button class="btn btn-xs" style="background: #e5e7eb; color: #1f2937;" data-increase-qty data-item-index="${idx}">+</button>
                            </div>
                            <span style="font-weight: 600;">${this.formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    </div>
                `).join('');
            }
        }

        const totalEl = document.getElementById('totalAmount');
        if (totalEl) {
            totalEl.textContent = this.formatCurrency(this.total);
        }
    }

    async openCashRegister() {
        if (this.cashRegisterOpen) {
            await modal.alert({ 
                title: '⚠️ Caja Ya Abierta', 
                message: 'La caja ya está abierta. Debe cerrarla primero.', 
                type: 'warning' 
            });
            return;
        }

        const result = await modal.prompt({
            title: '🔓 Abrir Caja Registradora',
            message: 'Ingrese el monto de la base inicial:',
            placeholder: 'Ejemplo: 50000',
            inputType: 'number'
        });

        if (result && !isNaN(result)) {
            try {
                const amountNum = parseFloat(result);
                const response = await apiService.post('/cashregister/open', { initial_amount: amountNum });
                
                // Refresh movements and sync with server state
                await this.refreshMovements();
                
                // Extra validation with server status
                try {
                    const status = await apiService.get('/cashregister');
                    if (status.status === 'open') {
                        console.log('✓ Caja abierta confirmada en servidor');
                    }
                } catch (e) {
                    console.warn('No se pudo validar estado con servidor');
                }
                
                await modal.alert({ 
                    title: '✅ Caja Abierta', 
                    message: `Caja abierta con base de ${this.formatCurrency(amountNum)}`, 
                    type: 'success' 
                });
            } catch (error) {
                console.error('Error opening cash:', error);
                const errorMsg = error?.detail || error?.message || 'Error desconocido';
                
                // Si dice "Caja ya está abierta", ofrecer reset
                if (errorMsg.includes('ya está abierta')) {
                    const shouldReset = await modal.confirm({
                        title: '🔧 Caja Bloqueada',
                        message: 'La caja reporta estar abierta pero no se puede sincronizar. ¿Desea resetear el estado?',
                        confirmText: 'Resetear',
                        cancelText: 'Cancelar'
                    });
                    
                    if (shouldReset) {
                        try {
                            await apiService.post('/cashregister/reset');
                            await this.refreshMovements();
                            await modal.alert({
                                title: '✅ Caja Reseteada',
                                message: 'La caja ha sido reseteada. Puede intentar abrirla nuevamente.',
                                type: 'success'
                            });
                        } catch (resetError) {
                            await modal.alert({
                                title: '❌ Error en Reset',
                                message: 'No se pudo resetear. Contacte soporte.',
                                type: 'error'
                            });
                        }
                    }
                } else {
                    await modal.alert({ title: 'Error', message: 'Error al abrir caja: ' + errorMsg, type: 'error' });
                }
            }
        }
    }

    async closeCashRegister() {
        if (!this.cashRegisterOpen) {
            await modal.alert({ 
                title: '⚠️ Caja No Abierta', 
                message: 'La caja no está abierta. Debe abrirla primero.', 
                type: 'warning' 
            });
            return;
        }

        const confirm = await modal.confirm({
            title: '🔒 Cerrar Caja',
            message: '¿Está seguro de cerrar la caja registradora? Se generará un reporte del día.',
            confirmText: 'Cerrar Caja',
            cancelText: 'Cancelar'
        });

        if (confirm) {
            try {
                const report = await apiService.post('/cashregister/close');
                
                const reportDetails = `
                    <div style="text-align: left; padding: 10px;">
                        <p><strong>💰 Total Ventas:</strong> ${this.formatCurrency(report.sales)}</p>
                        <p><strong>📊 Total Gastos:</strong> ${this.formatCurrency(report.expenses)}</p>
                        <p><strong>🏦 Base:</strong> ${this.formatCurrency(report.base)}</p>
                        <hr style="margin: 12px 0;">
                        <p><strong>💵 Balance Final:</strong> ${this.formatCurrency(report.final_balance)}</p>
                        <p><strong>📋 Transacciones:</strong> ${report.transaction_count}</p>
                    </div>
                `;

                await modal.alert({ 
                    title: '✅ Caja Cerrada', 
                    message: reportDetails, 
                    type: 'success' 
                });
                
                // Refresh movements and sync with server state
                await this.refreshMovements();
                
                // Extra validation with server status
                try {
                    const status = await apiService.get('/cashregister');
                    if (status.status === 'closed') {
                        console.log('✓ Caja cerrada confirmada en servidor');
                    }
                } catch (e) {
                    console.warn('No se pudo validar estado con servidor');
                }
            } catch (error) {
                console.error('Error closing cash:', error);
                const errorMsg = error?.detail || error?.message || 'Error desconocido';
                await modal.alert({ title: 'Error', message: 'Error al cerrar caja: ' + errorMsg, type: 'error' });
            }
        }
    }

    async addExpense() {
        const description = await modal.prompt({
            title: '📊 Registrar Gasto',
            message: 'Descripción del gasto:',
            placeholder: 'Ejemplo: Compra de insumos'
        });
        
        if (!description) return;
        
        const amount = await modal.prompt({
            title: '📊 Registrar Gasto',
            message: `Monto del gasto "${description}":`,
            placeholder: 'Ejemplo: 25000',
            inputType: 'number'
        });

        if (amount && !isNaN(amount)) {
            try {
                const amountNum = parseFloat(amount);
                await apiService.post('/cashregister/transactions', {
                    transaction_type: 'expense',
                    amount: amountNum,
                    description: description
                });

                await this.refreshMovements();
                
                await modal.alert({ 
                    title: '✅ Gasto Registrado', 
                    message: `Gasto de ${this.formatCurrency(amountNum)} registrado en caja`, 
                    type: 'success' 
                });
            } catch (error) {
                console.error('Error adding expense:', error);
                const errorMsg = error?.detail || error?.message || 'Error desconocido';
                await modal.alert({ title: 'Error', message: 'Error al registrar gasto: ' + errorMsg, type: 'error' });
            }
        }
    }



    updateMovements() {
        const container = document.getElementById('movementsList');
        if (!container) return;

        if (this.movements.length === 0) {
            container.innerHTML = '<p style="color: #7f8c8d; text-align: center;">Sin movimientos</p>';
        } else {
            container.innerHTML = this.movements.map(movement => {
                let icon, label, color;
                
                if (movement.type === 'expense') {
                    icon = '📊';
                    label = 'Gasto';
                    color = '#ef4444';
                } else if (movement.type === 'base') {
                    icon = '💰';
                    label = 'Base';
                    color = '#10b981';
                } else if (movement.type === 'sale') {
                    icon = '💳';
                    label = movement.customer ? `Venta a ${movement.customer}` : 'Venta';
                    color = '#0ea5e9';
                } else if (movement.type === 'close') {
                    icon = '🔒';
                    label = 'Cierre de Caja';
                    color = '#8b5cf6';
                } else {
                    icon = '📝';
                    label = 'Movimiento';
                    color = '#6b7280';
                }
                
                return `
                    <div style="padding: 8px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-start; font-size: 11px;">
                        <div style="flex: 1;">
                            <div>${icon} <strong style="color: ${color};">${label}</strong></div>
                            <div style="color: #9ca3af; margin-top: 2px;">${movement.timestamp}</div>
                        </div>
                        <span style="color: ${color}; font-weight: 600; min-width: 70px; text-align: right;">${this.formatCurrency(movement.amount)}</span>
                    </div>
                `;
            }).join('');
        }
    }

    async processPayment() {
        if (this.cart.length === 0) {
            await modal.alert({ title: 'Carrito vacío', message: 'Añade productos antes de procesar pago', type: 'warning' });
            return;
        }

        const customerId = document.getElementById('cashCustomer')?.value;
        const parsedCustomerId = customerId && customerId !== '' ? parseInt(customerId) : null;

        const paymentData = {
            customer_id: parsedCustomerId,
            amount: this.total,
            method: 'cash',
            notes: `Venta POS: ${this.cart.map(i => `${i.name} (${i.quantity})`).join(', ')}`
        };

        try {
            if (parsedCustomerId) {
                await apiService.post('/payments/', paymentData);
            }
            
            // Get customer name for description
            let customerName = 'Cliente sin identificar';
            if (parsedCustomerId && this.customersCache.length > 0) {
                const customer = this.customersCache.find(c => c.id === parsedCustomerId);
                if (customer) {
                    customerName = customer.full_name || 'Cliente';
                }
            }
            
            // Register cash transaction with items for stock deduction
            const description = `Venta a ${customerName}: ${this.cart.map(i => `${i.name} (${i.quantity})`).join(', ')}`;
            const itemsForSale = this.cart.map(item => ({
                item_id: item.id,
                quantity: item.quantity
            }));
            
            await apiService.post('/cashregister/transactions', {
                transaction_type: 'sale',
                amount: this.total,
                customer_id: parsedCustomerId,
                description: description,
                items: itemsForSale
            });

            await this.refreshMovements();

            await modal.alert({ 
                title: 'Pago Procesado', 
                message: `Venta de ${this.formatCurrency(this.total)} procesada correctamente`, 
                type: 'success' 
            });
            this.clearCart();
        } catch (error) {
            console.error('Error processing payment:', error);
            const errorMsg = error?.detail || error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
            await modal.alert({ title: 'Error', message: 'Error al procesar pago: ' + errorMsg, type: 'error' });
        }
    }
}

// Reports View
export class ReportsView {
    constructor() {
        this.metrics = null;
        this.selectedReport = 'overview';
        this.startDate = new Date(new Date().setDate(new Date().getDate() - 30));
        this.endDate = new Date();
        this.reportData = null;
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    render() {
        const user = authService.getCurrentUser();
        const isAdmin = user?.role === 'admin';
        const plan = user?.plan || 'free';

        // Check feature access
        const canViewReports = isAdmin || ['starter', 'pro', 'max'].includes(plan);
        const canExportReports = isAdmin || ['pro', 'max'].includes(plan);
        const canAdvancedAnalytics = isAdmin || ['max'].includes(plan);

        if (!canViewReports) {
            return `
                <div class="card">
                    <div class="card-body" style="text-align: center; padding: 40px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
                        <h2>Reportes no disponibles</h2>
                        <p style="color: #7f8c8d; margin-top: 10px;">
                            Los reportes están disponibles en planes Starter o superior.
                        </p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="reports-view">
                <!-- Métricas del Mes -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>💰 Ventas del Mes</h3>
                        <div class="value">${this.formatCurrency(this.metrics?.total_revenue_month || 0)}</div>
                        <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">
                            ${this.metrics?.total_appointments_month || 0} transacciones
                        </p>
                    </div>
                    
                    <div class="stat-card">
                        <h3>👥 Clientes</h3>
                        <div class="value">${this.metrics?.total_customers || 0}</div>
                        <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">Total registrados</p>
                    </div>
                    
                    <div class="stat-card">
                        <h3>📅 Citas del Mes</h3>
                        <div class="value">${this.metrics?.total_appointments_month || 0}</div>
                        <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">
                            Ticket: ${this.formatCurrency(this.metrics?.average_ticket || 0)}
                        </p>
                    </div>
                    
                    <div class="stat-card">
                        <h3>⏳ Pagos Pendientes</h3>
                        <div class="value">${this.formatCurrency(this.metrics?.pending_payments || 0)}</div>
                        <p style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">Por cobrar</p>
                    </div>
                </div>

                <!-- Generador de Reportes -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">📊 Generar Reportes</h2>
                    </div>
                    <div class="card-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; margin-bottom: 20px; align-items: flex-end;">
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">Tipo de Reporte</label>
                                <select id="reportType" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                    <option value="revenue">💵 Reporte de Ingresos</option>
                                    <option value="customers">👥 Reporte de Clientes</option>
                                    <option value="appointments">📅 Reporte de Citas</option>
                                    ${['pro', 'max'].includes(plan) || isAdmin ? `<option value="inventory">📦 Reporte de Inventario</option>` : ''}
                                </select>
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">Desde</label>
                                <input type="date" id="startDate" value="${this.formatDate(this.startDate)}" 
                                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">Hasta</label>
                                <input type="date" id="endDate" value="${this.formatDate(this.endDate)}" 
                                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>

                            <button class="btn btn-success" id="btnGenerateReport">Generar</button>
                        </div>

                        ${canExportReports ? `
                            <button class="btn btn-primary" id="btnExportReport" style="margin-left: 0;">
                                📥 Exportar CSV
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Resultados del Reporte -->
                <div id="reportResults" style="margin-top: 20px;"></div>
            </div>
        `;
    }

    async loadMetrics() {
        try {
            console.log('🔄 ReportsView: Loading metrics from /reports/dashboard...');
            this.metrics = await apiService.getReportsDashboard();
            console.log('✅ ReportsView: Metrics loaded:', this.metrics);
        } catch (error) {
            console.error('❌ ReportsView: Error loading metrics:', error);
            this.metrics = {
                total_customers: 0,
                total_appointments_month: 0,
                total_revenue_month: 0,
                average_ticket: 0,
                pending_payments: 0,
                top_services: [],
                busiest_days: []
            };
        }
    }

    updateMetricsDisplay() {
        console.log('🎨 ReportsView: updateMetricsDisplay() called');
        console.log('📊 ReportsView: Current metrics:', this.metrics);
        
        // Find the stats grid container
        const statsGrid = document.querySelector('.reports-view .stats-grid');
        console.log('🔍 ReportsView: statsGrid found?', !!statsGrid);
        
        if (!statsGrid) {
            console.warn('⚠️ ReportsView: Stats grid container not found');
            return;
        }
        
        const statCards = Array.from(statsGrid.querySelectorAll('.stat-card'));
        console.log('🔍 ReportsView: Found', statCards.length, 'stat cards');
        
        if (!statCards.length) {
            console.warn('⚠️ ReportsView: No stat cards found');
            return;
        }
        
        // Update cards in order: Ventas, Clientes, Citas, Pagos Pendientes
        statCards.forEach((card, index) => {
            const h3 = card.querySelector('h3');
            const valueElement = card.querySelector('.value');
            console.log(`  Card ${index}: "${h3?.textContent}" - valueElement found?`, !!valueElement);
        });
        
        // Card 0: Ventas del Mes
        if (statCards[0]) {
            const ventasValue = statCards[0].querySelector('.value');
            if (ventasValue) {
                const newValue = this.formatCurrency(this.metrics?.total_revenue_month || 0);
                ventasValue.textContent = newValue;
                console.log('✅ Updated Card 0 Ventas to:', newValue);
            } else {
                console.warn('⚠️ Card 0: .value element not found');
            }
        }
        
        // Card 1: Clientes
        if (statCards[1]) {
            const clientesValue = statCards[1].querySelector('.value');
            if (clientesValue) {
                const newValue = this.metrics?.total_customers || 0;
                clientesValue.textContent = newValue;
                console.log('✅ Updated Card 1 Clientes to:', newValue);
            } else {
                console.warn('⚠️ Card 1: .value element not found');
            }
        }
        
        // Card 2: Citas del Mes
        if (statCards[2]) {
            const citasValue = statCards[2].querySelector('.value');
            if (citasValue) {
                const newValue = this.metrics?.total_appointments_month || 0;
                citasValue.textContent = newValue;
                console.log('✅ Updated Card 2 Citas to:', newValue);
            } else {
                console.warn('⚠️ Card 2: .value element not found');
            }
        }
        
        // Card 3: Pagos Pendientes
        if (statCards[3]) {
            const pagosValue = statCards[3].querySelector('.value');
            if (pagosValue) {
                const newValue = this.formatCurrency(this.metrics?.pending_payments || 0);
                pagosValue.textContent = newValue;
                console.log('✅ Updated Card 3 Pagos Pendientes to:', newValue);
            } else {
                console.warn('⚠️ Card 3: .value element not found');
            }
        }
        
        console.log('🎨 ReportsView: updateMetricsDisplay() completed');
    }

    async generateReport(type, startDate, endDate) {
        try {
            this.reportData = await apiService.getReport(type, {
                start_date: startDate + 'T00:00:00',
                end_date: endDate + 'T23:59:59',
                report_type: type
            });
            return this.reportData;
        } catch (error) {
            const errorMsg = getErrorMessage(error);
            await modal.alert({
                type: 'error',
                title: 'Error al generar reporte',
                message: errorMsg
            });
            return null;
        }
    }

    renderReportResults(type, data) {
        if (type === 'revenue') {
            return this.renderRevenueReport(data);
        } else if (type === 'customers') {
            return this.renderCustomerReport(data);
        } else if (type === 'appointments') {
            return this.renderAppointmentReport(data);
        } else if (type === 'inventory') {
            return this.renderInventoryReport(data);
        }
        return '';
    }

    renderRevenueReport(data) {
        const periods = Array.isArray(data.by_period) ? data.by_period : [];
        const maxIncome = periods.length ? Math.max(...periods.map((p) => Number(p.income || p.revenue || 0))) : 0;
        const maxExpenses = periods.length ? Math.max(...periods.map((p) => Number(p.expenses || 0))) : 0;
        const maxScale = Math.max(maxIncome, maxExpenses, 1);

        return `
            <div class="card">
                <div class="card-header">
                    <h3>Reporte de Ingresos</h3>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 20px;">
                        <div style="background: #e8f5e9; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Total Ingresos</div>
                            <div style="font-size: 24px; font-weight: 600; color: #2e7d32;">
                                ${this.formatCurrency(data.total_revenue || 0)}
                            </div>
                        </div>
                        <div style="background: #fff3e0; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Total Gastos</div>
                            <div style="font-size: 24px; font-weight: 600; color: #f57c00;">
                                ${this.formatCurrency(data.total_expenses || 0)}
                            </div>
                        </div>
                        <div style="background: #e1f5fe; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Saldo</div>
                            <div style="font-size: 24px; font-weight: 600; color: #01579b;">
                                ${this.formatCurrency(data.balance ?? data.net_profit ?? 0)}
                            </div>
                        </div>
                        <div style="background: #fce4ec; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Pendiente</div>
                            <div style="font-size: 24px; font-weight: 600; color: #c2185b;">
                                ${this.formatCurrency(data.pending_amount || 0)}
                            </div>
                        </div>
                    </div>

                    ${periods.length ? `
                        <div style="margin-top: 20px;">
                            <h4>Grafico Diario (Ingresos vs Gastos)</h4>
                            <div style="display: grid; gap: 8px; margin-top: 10px;">
                                ${periods.map((period) => {
                                    const income = Number(period.income || period.revenue || 0);
                                    const expenses = Number(period.expenses || 0);
                                    const incomeWidth = Math.max((income / maxScale) * 100, income > 0 ? 3 : 0);
                                    const expenseWidth = Math.max((expenses / maxScale) * 100, expenses > 0 ? 3 : 0);
                                    return `
                                        <div style="display: grid; grid-template-columns: 95px 1fr; align-items: center; gap: 10px;">
                                            <div style="font-size: 12px; color: #555;">${period.date}</div>
                                            <div>
                                                <div style="height: 10px; background: #e8f5e9; border-radius: 999px; margin-bottom: 4px; overflow: hidden;">
                                                    <div style="height: 10px; width: ${incomeWidth}%; background: #2e7d32;"></div>
                                                </div>
                                                <div style="height: 10px; background: #fff3e0; border-radius: 999px; overflow: hidden;">
                                                    <div style="height: 10px; width: ${expenseWidth}%; background: #f57c00;"></div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${data.by_payment_method ? `
                        <div style="margin-top: 20px;">
                            <h4>Por Metodo de Pago</h4>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                <tr style="border-bottom: 1px solid #eee;">
                                    <th style="text-align: left; padding: 8px;">Metodo</th>
                                    <th style="text-align: right; padding: 8px;">Monto</th>
                                </tr>
                                ${Object.entries(data.by_payment_method).map(([method, amount]) => `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 8px;">${method}</td>
                                        <td style="text-align: right; padding: 8px;">${this.formatCurrency(amount)}</td>
                                    </tr>
                                `).join('')}
                            </table>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderCustomerReport(data) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>👥 Reporte de Clientes</h3>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Total Clientes</div>
                            <div style="font-size: 24px; font-weight: 600; color: #1565c0;">
                                ${data.total_customers || 0}
                            </div>
                        </div>
                        <div style="background: #f3e5f5; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Nuevos (período)</div>
                            <div style="font-size: 24px; font-weight: 600; color: #6a1b9a;">
                                ${data.new_customers || 0}
                            </div>
                        </div>
                        <div style="background: #e0f2f1; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Retención</div>
                            <div style="font-size: 24px; font-weight: 600; color: #00695c;">
                                ${(data.retention_rate || 0).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAppointmentReport(data) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>📅 Reporte de Citas</h3>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">
                        <div style="background: #e8eaf6; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Total Citas</div>
                            <div style="font-size: 24px; font-weight: 600; color: #3f51b5;">
                                ${data.total_appointments || 0}
                            </div>
                        </div>
                        <div style="background: #e8f5e9; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Completadas</div>
                            <div style="font-size: 24px; font-weight: 600; color: #388e3c;">
                                ${data.completed_appointments || 0}
                            </div>
                        </div>
                        <div style="background: #ffebee; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Canceladas</div>
                            <div style="font-size: 24px; font-weight: 600; color: #d32f2f;">
                                ${data.cancelled_appointments || 0}
                            </div>
                        </div>
                        <div style="background: #fff3e0; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">No Show</div>
                            <div style="font-size: 24px; font-weight: 600; color: #f57c00;">
                                ${(data.no_show_rate || 0).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderInventoryReport(data) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3>📦 Reporte de Inventario</h3>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                        <div style="background: #ede7f6; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Productos</div>
                            <div style="font-size: 24px; font-weight: 600; color: #512da8;">
                                ${data.total_items || 0}
                            </div>
                        </div>
                        <div style="background: #fce4ec; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Stock Bajo</div>
                            <div style="font-size: 24px; font-weight: 600; color: #c2185b;">
                                ${data.low_stock_items || 0}
                            </div>
                        </div>
                        <div style="background: #e1f5fe; padding: 15px; border-radius: 4px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Valor Total</div>
                            <div style="font-size: 24px; font-weight: 600; color: #0277bd;">
                                ${this.formatCurrency(data.total_value || 0)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        console.log('🔄 ReportsView: init() started');
        await this.loadMetrics();
        console.log('✅ ReportsView: Metrics loaded, updating DOM...');
        
        // Update the metrics display after loading
        this.updateMetricsDisplay();
        
        // Event listeners
        const btnGenerate = document.getElementById('btnGenerateReport');
        if (btnGenerate) {
            btnGenerate.addEventListener('click', async () => {
                const type = document.getElementById('reportType').value;
                const startDate = document.getElementById('startDate').value;
                const endDate = document.getElementById('endDate').value;

                if (!startDate || !endDate) {
                    await modal.alert({
                        type: 'warning',
                        title: 'Fechas requeridas',
                        message: 'Por favor selecciona las fechas de inicio y fin'
                    });
                    return;
                }

                btnGenerate.disabled = true;
                btnGenerate.textContent = '⏳ Generando...';

                const data = await this.generateReport(type, startDate, endDate);
                if (data) {
                    const resultsContainer = document.getElementById('reportResults');
                    if (resultsContainer) {
                        resultsContainer.innerHTML = this.renderReportResults(type, data);
                    }
                }

                btnGenerate.disabled = false;
                btnGenerate.textContent = 'Generar';
            });
        }

        const btnExport = document.getElementById('btnExportReport');
        if (btnExport) {
            btnExport.addEventListener('click', async () => {
                const type = document.getElementById('reportType').value;
                const startDate = document.getElementById('startDate').value;
                const endDate = document.getElementById('endDate').value;

                if (!startDate || !endDate) {
                    await modal.alert({
                        type: 'warning',
                        title: 'Fechas requeridas',
                        message: 'Por favor selecciona las fechas de inicio y fin'
                    });
                    return;
                }

                btnExport.disabled = true;
                btnExport.textContent = '⏳ Exportando...';

                try {
                    const result = await apiService.exportReport(type, startDate, endDate);
                    await modal.alert({
                        type: 'success',
                        title: 'Exportación completada',
                        message: result.message || 'Archivo CSV generado correctamente'
                    });
                } catch (error) {
                    const errorMsg = getErrorMessage(error);
                    await modal.alert({
                        type: 'error',
                        title: 'Error en la exportación',
                        message: errorMsg
                    });
                }

                btnExport.disabled = false;
                btnExport.textContent = '📥 Exportar CSV';
            });
        }
    }
}

// Admin View
export class AdminView {
    render() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">⚙️ Panel de Administración</h2>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px;">
                            <div style="font-size: 32px; margin-bottom: 10px;">👥</div>
                            <div style="font-weight: 600; margin-bottom: 8px;">Gestione Usuarios</div>
                            <div style="font-size: 12px; opacity: 0.9;">Crear, editar y eliminar usuarios</div>
                        </div>
                        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px;">
                            <div style="font-size: 32px; margin-bottom: 10px;">📋</div>
                            <div style="font-weight: 600; margin-bottom: 8px;">Gestione Planes</div>
                            <div style="font-size: 12px; opacity: 0.9;">Configurar planes y suscripciones</div>
                        </div>
                        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 8px;">
                            <div style="font-size: 32px; margin-bottom: 10px;">🔧</div>
                            <div style="font-weight: 600; margin-bottom: 8px;">Configuración</div>
                            <div style="font-size: 12px; opacity: 0.9;">Ajustes del sistema y negocio</div>
                        </div>
                    </div>
                    <div style="background: #f0f8ff; padding: 16px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #667eea;">
                        <p style="margin: 0; color: #2c3e50; font-size: 13px;">
                            📌 Los módulos de administración avanzada estarán disponibles próximamente. Por ahora, el uso está restringido al manejo de usuarios autenticados.
                        </p>
                    </div>
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
