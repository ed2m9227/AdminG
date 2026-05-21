/**
 * Customers View
 * Responsabilidad: Gestionar vista de clientes
 * Principio SOLID: Single Responsibility
 */

import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import table from '../components/Table.js';
import modal from '../components/Modal.js';
import sidebar from '../components/Sidebar.js';

function _toSingular(label) {
    const map = { 'Sesiones': 'Sesión', 'Propietarios': 'Propietario', 'Pacientes': 'Paciente', 'Residentes': 'Residente', 'Clientes': 'Cliente' };
    return map[label] || label.replace(/s$/, '');
}
function _newArticle(singular) {
    if (/[aá]$/i.test(singular)) return 'Nueva';
    if (/ón$/i.test(singular)) return 'Nueva';
    return 'Nuevo';
}

export class CustomersView {
    constructor() {
        this.customers = [];
        this.businessConfig = null;
        this._customersClickHandler = null;
        this.petFieldLabels = {
            name: 'Nombre',
            animal_type: 'Especie',
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

    _getEntityLabels() {
        const plural = sidebar.businessLabels?.customer || 'Clientes';
        const singular = _toSingular(plural);
        return { plural, singular, article: _newArticle(singular) };
    }

    render() {
        const user = authService.getCurrentUser();
        const isAdmin = user && user.role === 'admin';
        const features = authService.getFeatures();
        const canCreateCustomers = isAdmin || features.includes('create_customers');
        const { plural, singular, article } = this._getEntityLabels();

        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Lista de ${plural}</h2>
                    ${canCreateCustomers ? `<button class="btn btn-success" id="btnNewCustomer">+ ${article} ${singular}</button>` : ''}
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

        const { plural } = this._getEntityLabels();
        return table.render({
            columns,
            data: this.customers,
            emptyMessage: `No hay ${plural.toLowerCase()} registrados`,
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
        const btnNewCustomer = document.getElementById('btnNewCustomer');
        if (btnNewCustomer) {
            const clonedBtn = btnNewCustomer.cloneNode(true);
            btnNewCustomer.replaceWith(clonedBtn);
            clonedBtn.addEventListener('click', () => {
                this.showCustomerModal();
            });
        }

        // Botones de editar (delegación en contenedor para evitar listeners acumulados)
        const tableContainer = document.getElementById('customersTableContainer');
        if (!tableContainer) return;

        if (this._customersClickHandler) {
            tableContainer.removeEventListener('click', this._customersClickHandler);
        }

        this._customersClickHandler = async (e) => {
            const viewBtn = e.target.closest('[data-view-customer]');
            if (viewBtn) {
                const customerId = viewBtn.dataset.viewCustomer;
                await this.viewCustomer(customerId);
                return;
            }

            const editBtn = e.target.closest('[data-edit]');
            if (editBtn) {
                const customerId = editBtn.dataset.edit;
                await this.editCustomer(customerId);
                return;
            }
            
            const deleteBtn = e.target.closest('[data-delete]');
            if (deleteBtn) {
                const customerId = deleteBtn.dataset.delete;
                this.deleteCustomer(customerId);
            }
        };

        tableContainer.addEventListener('click', this._customersClickHandler);
    }

    activateDetailTabs(modalEl) {
        if (!modalEl) return;
        const tabs = modalEl.querySelectorAll('[data-detail-tab]');
        const panels = modalEl.querySelectorAll('[data-detail-panel]');
        if (!tabs.length || !panels.length) return;

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.detailTab;
                tabs.forEach((item) => item.classList.remove('is-active'));
                panels.forEach((panel) => panel.classList.remove('is-active'));
                tab.classList.add('is-active');
                const panel = modalEl.querySelector(`[data-detail-panel="${target}"]`);
                if (panel) panel.classList.add('is-active');
            });
        });
    }

    activateModalTabs(modalEl) {
        if (!modalEl) return;
        const tabs = modalEl.querySelectorAll('[data-modal-tab]');
        const panels = modalEl.querySelectorAll('[data-modal-panel]');
        if (!tabs.length || !panels.length) return;

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.modalTab;
                tabs.forEach((item) => item.classList.remove('is-active'));
                panels.forEach((panel) => panel.classList.remove('is-active'));
                tab.classList.add('is-active');
                const panel = modalEl.querySelector(`[data-modal-panel="${target}"]`);
                if (panel) panel.classList.add('is-active');
            });
        });
    }

    showCustomerModal(customer = null, pet = null) {
        const isEdit = !!customer;
        const { singular, article } = this._getEntityLabels();
        const title = isEdit ? `Editar ${singular}` : `${article} ${singular}`;
        const petSection = this.renderPetSection(pet);

        const hasPet = this.businessConfig?.has_pet_relationship;
        const content = `
            <form id="customerForm" class="modal-form" data-customer-id="${customer?.id || ''}">
                <input type="hidden" name="pet_id" value="${pet?.id || ''}">
                ${hasPet ? `
                <div class="detail-tabs" role="tablist" aria-label="Responsable y mascota">
                    <button type="button" class="detail-tab is-active" data-modal-tab="responsible">Responsable</button>
                    <button type="button" class="detail-tab" data-modal-tab="mascota">Mascota</button>
                </div>
                ` : ''}

                <div class="detail-panel${hasPet ? ' is-active' : ''}" data-modal-panel="responsible">
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
                        <label>Cédula / Identificación</label>
                        <input type="text" name="identification" value="${customer?.identification || ''}">
                    </div>
                    <div class="form-group">
                        <label>Notas</label>
                        <textarea name="notes" rows="3">${customer?.notes || ''}</textarea>
                    </div>
                </div>

                ${hasPet ? `<div class="detail-panel" data-modal-panel="mascota">${petSection}</div>` : petSection}

                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Guardar</button>
                    <button type="button" class="btn" data-close>Cancelar</button>
                </div>
            </form>
        `;

        const customerModal = modal.show({ title, content, size: 'medium' });
        this.activateModalTabs(customerModal);

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
        let createdCustomerId = null;
        
        const customerData = {
            full_name: formData.get('full_name'),
            identification: formData.get('identification') || null,
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
                createdCustomerId = savedCustomerId;
            }

            if (hasPet && savedCustomerId) {
                try {
                    await this.savePetIfPresent(formData, savedCustomerId);
                } catch (petError) {
                    // Compensating action: avoid leaving orphan customer when pet save fails on create.
                    if (!isEdit && createdCustomerId) {
                        try {
                            await apiService.delete(`/customers/${createdCustomerId}`);
                        } catch (_rollbackError) {
                            // If rollback fails, keep original pet error as primary signal.
                        }
                    }
                    throw petError;
                }
            }
            modal.close(modalElement);
            await this.loadCustomers();
            
            const { singular: lbl } = this._getEntityLabels();
            modal.alert({
                type: 'success',
                title: 'Éxito',
                message: `${lbl} ${isEdit ? 'actualizado' : 'guardado'} correctamente`
            });
        } catch (error) {
            const { singular: lbl } = this._getEntityLabels();
            modal.alert({
                type: 'error',
                title: 'Error',
                message: `Error al guardar ${lbl.toLowerCase()}: ` + error.message
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
        let petLoadFailed = false;
        if (this.businessConfig?.has_pet_relationship) {
            try {
                const pets = await apiService.getPets(customerId);
                pet = Array.isArray(pets) && pets.length ? pets[0] : null;
            } catch (_error) {
                pet = null;
                petLoadFailed = true;
            }
        }

        const petRows = pet
            ? Object.entries(this.petFieldLabels)
                .filter(([key]) => pet[key] !== null && pet[key] !== undefined && String(pet[key]).trim() !== '')
                .map(([key, label]) => `<div class="detail-item"><span class="detail-label">${label}</span><span class="detail-value">${pet[key]}</span></div>`)
                .join('')
            : '';

        const petBlock = pet
            ? `<div class="detail-grid">${petRows || '<div class="detail-empty">Sin datos de mascota.</div>'}</div>`
            : `<div class="detail-empty">${petLoadFailed ? 'No disponible (error al cargar).' : 'Sin datos de mascota.'}</div>`;

        const content = `
            <div class="detail-tabs" role="tablist" aria-label="Detalle cliente">
                <button type="button" class="detail-tab is-active" data-detail-tab="general">General</button>
                <button type="button" class="detail-tab" data-detail-tab="mascota">Mascota</button>
                <button type="button" class="detail-tab" data-detail-tab="sistema">Sistema</button>
            </div>

            <div class="detail-panel is-active" data-detail-panel="general">
                <div class="modal-form">
                    <div class="form-group"><label>Nombre</label><input type="text" value="${customer.full_name || '-'}" disabled></div>
                    <div class="form-row">
                        <div class="form-group"><label>Email</label><input type="text" value="${customer.email || '-'}" disabled></div>
                        <div class="form-group"><label>Teléfono</label><input type="text" value="${customer.phone || '-'}" disabled></div>
                        <div class="form-group"><label>Cédula / Identificación</label><input type="text" value="${customer.identification || '-'}" disabled></div>
                    </div>
                    <div class="form-group"><label>Notas</label><textarea rows="4" disabled>${customer.notes || '-'}</textarea></div>
                </div>
            </div>

            <div class="detail-panel" data-detail-panel="mascota">
                ${petBlock}
            </div>

            <div class="detail-panel" data-detail-panel="sistema">
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">ID</span><span class="detail-value">${customer.id ?? '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Estado</span><span class="detail-value">${customer.is_active === false ? 'Inactivo' : 'Activo'}</span></div>
                    <div class="detail-item"><span class="detail-label">Creado</span><span class="detail-value">${customer.created_at ? new Date(customer.created_at).toLocaleString('es-CO') : '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Actualizado</span><span class="detail-value">${customer.updated_at ? new Date(customer.updated_at).toLocaleString('es-CO') : '-'}</span></div>
                </div>
            </div>
        `;

        const { singular } = this._getEntityLabels();
        const detailModal = modal.show({ title: `Ver ${singular}`, content, size: 'large' });
        this.activateDetailTabs(detailModal);
    }
    
    async deleteCustomer(customerId) {
        const customer = this.customers.find(c => c.id == customerId);
        if (!customer) return;
        
        const { singular } = this._getEntityLabels();
        const confirmed = await modal.confirm({
            title: 'Confirmar eliminación',
            message: `¿Estás seguro de eliminar a ${singular.toLowerCase()} "${customer.full_name}"? Esta acción no se puede deshacer.`,
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
                    message: `${singular} eliminado correctamente`
                });
            } catch (error) {
                const errorMsg = typeof error === 'string' ? error : (error.message || error.detail || 'Error desconocido');
                modal.alert({
                    type: 'error',
                    title: 'Error',
                    message: `Error al eliminar ${singular.toLowerCase()}: ` + errorMsg
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
            throw new Error('Nombre y especie son requeridos para la mascota');
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
            microchip: this.normalizeMicrochip(formData.get('pet_microchip')),
            neutered_spayed: formData.get('pet_neutered_spayed') === 'on',
            allergies: formData.get('pet_allergies') || null,
            current_medications: formData.get('pet_current_medications') || null,
            last_checkup_date: this.normalizeDateTime(formData.get('pet_last_checkup_date')),
            vaccination_status: formData.get('pet_vaccination_status') || null,
            notes: formData.get('pet_notes') || null
        };
    }

    normalizeMicrochip(value) {
        if (!value) return null;
        const normalized = String(value).trim();
        if (!normalized) return null;

        const lower = normalized.toLowerCase();
        if (['si', 'sí', 'no', 'n/a', 'na', 'ninguno', 'ninguna'].includes(lower)) {
            return null;
        }

        return normalized;
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
