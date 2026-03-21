/**
 * Customers View
 * Responsabilidad: Gestionar vista de clientes
 * Principio SOLID: Single Responsibility
 */

import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import table from '../components/Table.js';
import modal from '../components/Modal.js';

export class CustomersView {
    constructor() {
        this.customers = [];
        this.businessConfig = null;
        this.petFieldLabels = {
            name: 'Nombre',
            animal_type: 'Tipo de Animal',
            breed: 'Raza',
            color_description: 'Color',
            age_years: 'Edad (Años)',
            age_months: 'Edad (Meses)',
            weight_kg: 'Peso (kg)',
            gender: 'Género',
            date_of_birth: 'Fecha de Nacimiento',
            microchip: 'Microchip',
            neutered_spayed: 'Esterilizado/a',
            allergies: 'Alergias',
            current_medications: 'Medicamentos',
            last_checkup_date: 'Último Control',
            vaccination_status: 'Estado de Vacunas',
            notes: 'Notas'
        };
    }

    render() {
        const user = authService.getCurrentUser();
        const isAdmin = user && user.role === 'admin';
        const features = authService.getFeatures();
        const canCreateCustomers = isAdmin || features.includes('create_customers');

        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Lista de Clientes</h2>
                    ${canCreateCustomers ? `<button class="btn btn-success" id="btnNewCustomer">+ Nuevo Cliente</button>` : ''}
                </div>
                <div class="card-body" id="customersTableContainer">
                    ${this.renderTable()}
                </div>
            </div>
        `;
    }

    renderTable() {
        const user = authService.getCurrentUser();
        const isAdmin = user && user.role === 'admin';
        const features = authService.getFeatures();
        const canViewCustomers = isAdmin || features.includes('view_customers');
        const canEditCustomers = isAdmin || features.includes('edit_customers');
        const canDeleteCustomers = isAdmin || features.includes('delete_customers');
        
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
            }
        ];
        
        if (canViewCustomers || canEditCustomers || canDeleteCustomers) {
            columns.push({
                key: 'actions',
                label: 'Acciones',
                formatter: (_, row) => {
                    let html = '';
                    if (canViewCustomers) {
                        html += `<button class="btn btn-sm" data-view-customer="${row.id}">👁️ Ver</button>`;
                    }
                    if (canEditCustomers) {
                        html += ` <button class="btn btn-sm" data-edit="${row.id}">✏️ Editar</button>`;
                    }
                    if (canDeleteCustomers) {
                        html += ` <button class="btn btn-sm btn-danger" data-delete="${row.id}">🗑️ Eliminar</button>`;
                    }
                    return html || '-';
                }
            });
        }

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
            const viewBtn = e.target.closest('[data-view-customer]');
            if (viewBtn) {
                const customerId = viewBtn.dataset.viewCustomer;
                await this.viewCustomer(customerId);
            }

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

    async viewCustomer(customerId) {
        const customer = this.customers.find(c => c.id == customerId);
        if (!customer) return;

        let pet = null;
        if (this.businessConfig?.has_pet_relationship) {
            try {
                const pets = await apiService.getPets(customerId);
                pet = Array.isArray(pets) && pets.length ? pets[0] : null;
            } catch (_error) {
                pet = null;
            }
        }

        const petBlock = pet
            ? `
                <div class="form-group"><label>Mascota</label><input type="text" value="${pet.name || '-'}" disabled></div>
                <div class="form-group"><label>Tipo</label><input type="text" value="${pet.animal_type || '-'}" disabled></div>
                <div class="form-group"><label>Notas mascota</label><textarea rows="2" disabled>${pet.notes || '-'}</textarea></div>
              `
            : '<div class="form-group"><label>Mascota</label><input type="text" value="Sin datos" disabled></div>';

        const content = `
            <div class="modal-form">
                <div class="form-group"><label>Nombre</label><input type="text" value="${customer.full_name || '-'}" disabled></div>
                <div class="form-row">
                    <div class="form-group"><label>Email</label><input type="text" value="${customer.email || '-'}" disabled></div>
                    <div class="form-group"><label>Teléfono</label><input type="text" value="${customer.phone || '-'}" disabled></div>
                </div>
                <div class="form-group"><label>Notas</label><textarea rows="3" disabled>${customer.notes || '-'}</textarea></div>
                ${petBlock}
            </div>
        `;

        modal.show({ title: 'Ver Cliente', content, size: 'medium' });
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
        if (!this.businessConfig || !this.businessConfig.has_pet_relationship) return '';

        const enabled = (this.businessConfig && this.businessConfig.pet_fields_enabled) || {};
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
                        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 0; cursor: pointer;">
                            <input type="checkbox" name="pet_${key}" ${checked} style="width: auto; margin: 0;">
                            <span>${this.petFieldLabels[key]}</span>
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
            last_checkup_date: this.normalizeDateTime(formData.get('pet_last_checkup_date')),
            vaccination_status: formData.get('pet_vaccination_status') || null,
            notes: formData.get('pet_notes') || null
        };
    }

    normalizeDateTime(value) {
        if (!value) return null;
        // date input returns YYYY-MM-DD; backend expects datetime for last_checkup_date
        return value.length === 10 ? `${value}T00:00:00` : value;
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
