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
            { key: 'name', label: 'Nombre' },
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
                    <button class="btn btn-sm" data-edit="${row.id}">Editar</button>
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
            this.customers = response.items || [];
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
        });
    }

    showCustomerModal(customer = null) {
        const isEdit = !!customer;
        const title = isEdit ? 'Editar Cliente' : 'Nuevo Cliente';

        const content = `
            <form id="customerForm" class="modal-form">
                <div class="form-group">
                    <label>Nombre *</label>
                    <input type="text" name="name" value="${customer?.name || ''}" required>
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
                    <label>Dirección</label>
                    <textarea name="address" rows="3">${customer?.address || ''}</textarea>
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
        
        const customerData = {
            name: formData.get('name'),
            email: formData.get('email') || null,
            phone: formData.get('phone') || null,
            address: formData.get('address') || null
        };

        try {
            await apiService.createCustomer(customerData);
            modal.close(modalElement);
            await this.loadCustomers();
            
            modal.alert({
                type: 'success',
                title: 'Éxito',
                message: 'Cliente guardado correctamente'
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
}

export default new CustomersView();
