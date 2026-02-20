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
        this.businessConfig = null;
        this.petFieldLabels = {
            name: 'Nombre',
            animal_type: 'Tipo de animal',
            breed: 'Raza',
            color_description: 'Color',
            age_years: 'Edad (anos)',
            age_months: 'Edad (meses)',
            weight_kg: 'Peso (kg)',
            gender: 'Genero',
            date_of_birth: 'Fecha de nacimiento',
            microchip: 'Microchip',
            neutered_spayed: 'Esterilizado',
            allergies: 'Alergias',
            current_medications: 'Medicamentos',
            last_checkup_date: 'Ultimo control',
            vaccination_status: 'Vacunas',
            notes: 'Notas'
        };
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
        await this.loadBusinessConfig();
        await this.loadCustomers();
        this.attachEventListeners();
    }

    async loadBusinessConfig() {
        try {
            this.businessConfig = await apiService.getBusinessConfig();
        } catch (error) {
            this.businessConfig = null;
        }
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
        document.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('[data-edit]');
            if (editBtn) {
                const customerId = editBtn.dataset.edit;
                await this.editCustomer(customerId);
            }
            
            const deleteBtn = e.target.closest('[data-delete]');
            if (deleteBtn) {
                const customerId = deleteBtn.dataset.delete;
                this.deleteCustomer(customerId);
            }
        });
    }

    showCustomerModal(customer = null, pet = null) {
        const isEdit = !!customer;
        const title = isEdit ? 'Editar Cliente' : 'Nuevo Cliente';
        const petSection = this.renderPetSection(pet);

        const content = `
            <form id="customerForm" class="modal-form" data-customer-id="${customer?.id || ''}">
                <input type="hidden" name="pet_id" value="${pet?.id || ''}">
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

                ${petSection}
                
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
        const hasPet = this.businessConfig?.has_pet_relationship;
        
        const customerData = {
            full_name: formData.get('full_name'),
            email: formData.get('email') || null,
            phone: formData.get('phone') || null,
            notes: formData.get('notes') || null
        };

        try {
            let savedCustomerId = customerId;

            if (isEdit) {
                await apiService.put(`/customers/${customerId}`, customerData);
            } else {
                const created = await apiService.createCustomer(customerData);
                savedCustomerId = created?.id || customerId;
            }

            if (hasPet && savedCustomerId) {
                await this.savePetIfPresent(formData, savedCustomerId);
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

    async editCustomer(customerId) {
        const customer = this.customers.find(c => c.id == customerId);
        if (!customer) return;

        let pet = null;
        if (this.businessConfig?.has_pet_relationship) {
            try {
                const pets = await apiService.getPets(customerId);
                pet = Array.isArray(pets) && pets.length ? pets[0] : null;
            } catch (error) {
                pet = null;
            }
        }

        this.showCustomerModal(customer, pet);
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
                const errorMsg = typeof error === 'string' ? error : (error.message || error.detail || 'Error desconocido');
                modal.alert({
                    type: 'error',
                    title: 'Error',
                    message: 'Error al eliminar cliente: ' + errorMsg
                });
            }
        }
    }

    renderPetSection(pet) {
        if (!this.businessConfig?.has_pet_relationship) return '';

        const enabled = this.businessConfig.pet_fields_enabled || {};
        const petFields = Object.keys(this.petFieldLabels).filter(key => enabled[key]);

        if (!petFields.length) {
            return '<div class="form-group"><label>Mascota</label><div style="color: #7f8c8d;">Sin campos configurados.</div></div>';
        }

        const fieldHtml = petFields.map((key) => {
            const value = pet?.[key] ?? '';

            if (key === 'notes' || key === 'allergies' || key === 'current_medications') {
                return `
                    <div class="form-group">
                        <label>${this.petFieldLabels[key]}</label>
                        <textarea name="pet_${key}" rows="2">${value || ''}</textarea>
                    </div>
                `;
            }

            if (key === 'neutered_spayed') {
                const checked = value ? 'checked' : '';
                return `
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="pet_${key}" ${checked}>
                            ${this.petFieldLabels[key]}
                        </label>
                    </div>
                `;
            }

            const inputType = (key === 'date_of_birth' || key === 'last_checkup_date') ? 'date'
                : (key === 'weight_kg' || key === 'age_years' || key === 'age_months') ? 'number'
                : 'text';

            const step = key === 'weight_kg' ? '0.1' : '1';
            const min = (key === 'age_years' || key === 'age_months') ? '0' : '';

            return `
                <div class="form-group">
                    <label>${this.petFieldLabels[key]}</label>
                    <input type="${inputType}" name="pet_${key}" value="${value}" step="${step}" ${min ? `min=\"${min}\"` : ''}>
                </div>
            `;
        }).join('');

        return `
            <div class="form-group">
                <label>Datos de mascota</label>
                <div class="form-grid">
                    ${fieldHtml}
                </div>
            </div>
        `;
    }

    async savePetIfPresent(formData, customerId) {
        const petPayload = this.buildPetPayload(formData);
        if (!petPayload) return;

        const petId = formData.get('pet_id');

        if (petId) {
            await apiService.updatePet(customerId, petId, petPayload);
        } else {
            await apiService.createPet(customerId, { ...petPayload, customer_id: Number(customerId) });
        }
    }

    buildPetPayload(formData) {
        const name = formData.get('pet_name');
        const animalType = formData.get('pet_animal_type');

        const hasAny = Array.from(formData.keys()).some((key) => key.startsWith('pet_') && formData.get(key));
        if (!hasAny) return null;

        if (!name || !animalType) {
            throw new Error('Nombre y tipo de animal son requeridos para la mascota');
        }

        return {
            name: name,
            animal_type: animalType,
            breed: formData.get('pet_breed') || null,
            color_description: formData.get('pet_color_description') || null,
            age_years: this.toInt(formData.get('pet_age_years')),
            age_months: this.toInt(formData.get('pet_age_months')),
            weight_kg: this.toFloat(formData.get('pet_weight_kg')),
            gender: formData.get('pet_gender') || null,
            date_of_birth: formData.get('pet_date_of_birth') || null,
            microchip: formData.get('pet_microchip') || null,
            neutered_spayed: formData.get('pet_neutered_spayed') === 'on',
            allergies: formData.get('pet_allergies') || null,
            current_medications: formData.get('pet_current_medications') || null,
            last_checkup_date: formData.get('pet_last_checkup_date') || null,
            vaccination_status: formData.get('pet_vaccination_status') || null,
            notes: formData.get('pet_notes') || null
        };
    }

    toInt(value) {
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }

    toFloat(value) {
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
}

export default new CustomersView();
