/**
 * Customers View
 * Responsabilidad: Gestionar vista de clientes
 * Principio SOLID: Single Responsibility
 */

import apiService from '../services/api.service.js';
import table from '../components/Table.js';
import modal from '../components/Modal.js';

export class CustomersView {
    constructor() {
        this.customers = [];
    }

    render() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Lista de Clientes</h2>
                    <button class="btn btn-success" id="btnNewCustomer">
                        + Nuevo Cliente
                    </button>
                </div>
                <div class="card-body" id="customersTableContainer">
                    ${this.renderTable()}
                </div>
            </div>
        `;
    }

    renderTable() {
        const columns = [
            { key: 'full_name', label: 'Nombre' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Teléfono' },
            { 
                key: 'status', 
                label: 'Estado', 
                type: 'badge',
                badgeClass: 'success',
                formatter: () => 'Activo'
            },
            {
                key: 'actions',
                label: 'Acciones',
                formatter: (_, row) => `
                    <button class="btn btn-sm" data-edit="${row.id}">✏️ Editar</button>
                    <button class="btn btn-sm btn-danger" data-delete="${row.id}">🗑️ Eliminar</button>
                `
            }
        ];

        return table.render({
            columns,
            data: this.customers,
            emptyMessage: 'No hay clientes registrados',
            emptyIcon: '👥'
        });
    }

    async init() {
        await this.loadCustomers();
        this.attachEventListeners();
    }

    async loadCustomers() {
        try {
            const response = await apiService.getCustomers();
            this.customers = Array.isArray(response) ? response : (response.items || []);
            this.updateTable();
        } catch (error) {
            console.error('Error loading customers:', error);
            modal.alert({
                type: 'error',
                title: 'Error',
                message: 'No se pudieron cargar los clientes: ' + error.message
            });
        }
    }

    updateTable() {
        const container = document.getElementById('customersTableContainer');
        if (container) {
            container.innerHTML = this.renderTable();
        }
    }

    attachEventListeners() {
        // Botón nuevo cliente
        document.getElementById('btnNewCustomer')?.addEventListener('click', () => {
            this.showCustomerModal();
        });

        // Botones de editar
        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('[data-edit]');
            if (editBtn) {
                const customerId = editBtn.dataset.edit;
                this.editCustomer(customerId);
            }
            
            const deleteBtn = e.target.closest('[data-delete]');
            if (deleteBtn) {
                const customerId = deleteBtn.dataset.delete;
                this.deleteCustomer(customerId);
            }
        });
    }

    showCustomerModal(customer = null) {
        const isEdit = !!customer;
        const title = isEdit ? 'Editar Cliente' : 'Nuevo Cliente';

        const content = `
            <form id="customerForm" class="modal-form" data-customer-id="${customer?.id || ''}">
                <div class="form-group">
                    <label>Nombre *</label>
                    <input type="text" name="full_name" value="${customer?.full_name || ''}" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value="${customer?.email || ''}">
                    </div>
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="tel" name="phone" value="${customer?.phone || ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Notas</label>
                    <textarea name="notes" rows="3">${customer?.notes || ''}</textarea>
                </div>
                
                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Guardar</button>
                    <button type="button" class="btn" data-close>Cancelar</button>
                </div>
            </form>
        `;

        const customerModal = modal.show({ title, content, size: 'medium' });

        const form = document.getElementById('customerForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveCustomer(e, customerModal);
        });
    }

    async saveCustomer(e, modalElement) {
        const form = e.target;
        const formData = new FormData(form);
        const customerId = form.dataset.customerId;
        const isEdit = customerId && customerId !== '';
        
        const customerData = {
            full_name: formData.get('full_name'),
            email: formData.get('email') || null,
            phone: formData.get('phone') || null,
            notes: formData.get('notes') || null
        };

        try {
            if (isEdit) {
                await apiService.put(`/customers/${customerId}`, customerData);
            } else {
                await apiService.createCustomer(customerData);
            }
            modal.close(modalElement);
            await this.loadCustomers();
            
            modal.alert({
                type: 'success',
                title: 'Éxito',
                message: `Cliente ${isEdit ? 'actualizado' : 'guardado'} correctamente`
            });
        } catch (error) {
            modal.alert({
                type: 'error',
                title: 'Error',
                message: 'Error al guardar cliente: ' + error.message
            });
        }
    }

    editCustomer(customerId) {
        const customer = this.customers.find(c => c.id == customerId);
        if (customer) {
            this.showCustomerModal(customer);
        }
    }
    
    async deleteCustomer(customerId) {
        const customer = this.customers.find(c => c.id == customerId);
        if (!customer) return;
        
        const confirmed = await modal.confirm({
            title: 'Confirmar eliminación',
            message: `¿Estás seguro de eliminar al cliente "${customer.full_name}"? Esta acción no se puede deshacer.`,
            okText: 'Eliminar',
            cancelText: 'Cancelar'
        });
        
        if (confirmed) {
            try {
                await apiService.delete(`/customers/${customerId}`);
                await this.loadCustomers();
                
                modal.alert({
                    type: 'success',
                    title: 'Éxito',
                    message: 'Cliente eliminado correctamente'
                });
            } catch (error) {
                modal.alert({
                    type: 'error',
                    title: 'Error',
                    message: 'Error al eliminar cliente: ' + error.message
                });
            }
        }
    }
}

export default new CustomersView();
