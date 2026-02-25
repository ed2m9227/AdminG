/**
 * Business Config View
 * Responsabilidad: Gestionar la configuracion del negocio fuera del dashboard
 */

import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';

export class BusinessConfigView {
    constructor() {
        this.businessTypes = [];
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
        const user = authService.getCurrentUser();
        const roleLabel = user?.role === 'admin' ? 'Admin' : 'Manager';

        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Configuracion de negocio</h2>
                </div>
                <div class="card-body">
                    <p style="margin-top: 0; color: #6b7280; font-size: 13px;">Acceso: ${roleLabel}. Ajusta etiquetas, campos y tipo de negocio.</p>
                    <div id="businessConfigBox">
                        <div style="padding: 12px; color: #7f8c8d;">Cargando configuracion...</div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        await this.loadBusinessConfig();
    }

    async loadBusinessConfig() {
        try {
            const [types, config] = await Promise.allSettled([
                apiService.getBusinessTypes(),
                apiService.getBusinessConfig()
            ]);

            if (types.status === 'fulfilled') {
                this.businessTypes = types.value || [];
            }

            if (config.status === 'fulfilled') {
                this.businessConfig = config.value;
            } else if (config.status === 'rejected') {
                const fallbackType = this.businessTypes[0]?.type || 'veterinaria';
                this.businessConfig = await apiService.createBusinessConfig({
                    business_type: fallbackType
                });
            }

            this.renderBusinessConfigForm();
        } catch (error) {
            const container = document.getElementById('businessConfigBox');
            if (container) {
                container.innerHTML = `
                    <div style="color: #e74c3c;">Error cargando configuracion: ${error.message}</div>
                `;
            }
        }
    }

    renderBusinessConfigForm() {
        const container = document.getElementById('businessConfigBox');
        if (!container) return;

        const config = this.businessConfig || {};
        const types = this.businessTypes || [];
        const hasPet = !!config.has_pet_relationship;
        const petFieldsEnabled = config.pet_fields_enabled || {};

        const typeOptions = types.map(t => {
            const selected = t.type === config.business_type ? 'selected' : '';
            return `<option value="${t.type}" ${selected}>${t.label}</option>`;
        }).join('');

        const petFieldsHtml = hasPet ? Object.keys(this.petFieldLabels).map((key) => {
            const checked = petFieldsEnabled[key] ? 'checked' : '';
            return `
                <label class="checkbox-item">
                    <input type="checkbox" name="pet_fields" value="${key}" ${checked}>
                    <span>${this.petFieldLabels[key]}</span>
                </label>
            `;
        }).join('') : '<div style="color: #7f8c8d;">Sin campos de mascotas para este tipo.</div>';

        container.innerHTML = `
            <form id="businessConfigForm" class="modal-form">
                <div class="form-group">
                    <label>Tipo de Negocio</label>
                    <select name="business_type" required>
                        ${typeOptions}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre del Negocio</label>
                        <input type="text" name="business_name" value="${config.business_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>Etiqueta de Clientes</label>
                        <input type="text" name="customer_label" value="${config.customer_label || 'Cliente'}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Etiqueta de Citas</label>
                        <input type="text" name="appointment_label" value="${config.appointment_label || 'Cita'}">
                    </div>
                    <div class="form-group">
                        <label>Etiqueta de Mascotas</label>
                        <input type="text" name="pet_label" value="${config.pet_label || ''}" ${hasPet ? '' : 'disabled'}>
                    </div>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="has_pet_relationship" ${hasPet ? 'checked' : ''}>
                        Tiene relacion con mascotas
                    </label>
                </div>

                <div class="form-group">
                    <label>Campos de Mascotas</label>
                    <div class="checkbox-grid">
                        ${petFieldsHtml}
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Guardar</button>
                    <button type="button" class="btn" id="btnResetBusinessConfig">Restaurar Valores Predeterminados</button>
                </div>
            </form>
        `;

        const form = document.getElementById('businessConfigForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveBusinessConfig(e);
        });

        document.getElementById('btnResetBusinessConfig')?.addEventListener('click', async () => {
            await this.resetBusinessConfig();
        });
    }

    getEnabledPetFields(form) {
        const enabled = {};
        const fields = form.querySelectorAll('input[name="pet_fields"]');
        fields.forEach((field) => {
            enabled[field.value] = field.checked;
        });
        return enabled;
    }

    async saveBusinessConfig(e) {
        const form = e.target;
        const formData = new FormData(form);

        const payload = {
            business_type: formData.get('business_type'),
            business_name: formData.get('business_name') || null,
            customer_label: formData.get('customer_label') || 'Cliente',
            appointment_label: formData.get('appointment_label') || 'Cita',
            pet_label: formData.get('pet_label') || null,
            has_pet_relationship: formData.get('has_pet_relationship') === 'on',
            pet_fields_enabled: this.getEnabledPetFields(form)
        };

        try {
            const updated = await apiService.updateBusinessConfig(payload);
            this.businessConfig = updated;
            this.renderBusinessConfigForm();
        } catch (error) {
            const container = document.getElementById('businessConfigBox');
            if (container) {
                container.insertAdjacentHTML('beforeend', `
                    <div style="color: #e74c3c; margin-top: 8px;">Error guardando configuracion: ${error.message}</div>
                `);
            }
        }
    }

    async resetBusinessConfig() {
        const typeSelect = document.querySelector('#businessConfigForm select[name="business_type"]');
        const selectedType = typeSelect?.value || 'veterinaria';

        try {
            const updated = await apiService.resetBusinessConfig(selectedType);
            this.businessConfig = updated;
            this.renderBusinessConfigForm();
        } catch (error) {
            const container = document.getElementById('businessConfigBox');
            if (container) {
                container.insertAdjacentHTML('beforeend', `
                    <div style="color: #e74c3c; margin-top: 8px;">Error restaurando configuracion: ${error.message}</div>
                `);
            }
        }
    }
}

export default new BusinessConfigView();
