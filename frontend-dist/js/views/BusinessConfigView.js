/**
 * Business Config View
 * Responsabilidad: Gestionar la configuracion del negocio fuera del dashboard
 */

import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import sidebar from '../components/Sidebar.js';
import router from '../utils/router.js';

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

    getBusinessIdentityRules(businessType) {
        const healthcareTypes = new Set(['consultorio', 'clinica', 'dentista', 'fisioterapia', 'nutricion', 'medicina_general']);
        const petTypes = new Set(['veterinaria']);
        const propertyTypes = new Set(['propiedad_horizontal']);

        if (healthcareTypes.has(businessType)) {
            return {
                responsibleLabel: 'Profesional responsable',
                registrationLabel: 'Registro profesional (RETHUS o equivalente)',
                registrationPlaceholder: 'Ej: RETHUS 123456',
            };
        }

        if (petTypes.has(businessType)) {
            return {
                responsibleLabel: 'Responsable medico veterinario',
                registrationLabel: 'Tarjeta profesional / registro ICA',
                registrationPlaceholder: 'Ej: TPV-78910',
            };
        }

        if (propertyTypes.has(businessType)) {
            return {
                responsibleLabel: 'Administrador responsable',
                registrationLabel: 'Registro de administracion o acta de nombramiento',
                registrationPlaceholder: 'Ej: Acta 2026-03 / Registro 4455',
            };
        }

        return {
            responsibleLabel: 'Representante o responsable',
            registrationLabel: 'Registro mercantil o referencia legal',
            registrationPlaceholder: 'Ej: CAM-2026-001',
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
        const currentUser = authService.getCurrentUser();
        const types = this.businessTypes || [];
        const hasPet = !!config.has_pet_relationship;
        const petFieldsEnabled = config.pet_fields_enabled || {};
        const billingProfile = config.custom_fields?.billing_profile || {};
        const businessIdentity = config.custom_fields?.business_identity || {};
        const canManageBillingProfile = !currentUser?.parent_user_id;
        const identityRules = this.getBusinessIdentityRules(config.business_type || 'otro');

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
                <div class="form-group">
                    <label>Descripcion del negocio</label>
                    <textarea name="business_description" rows="2" placeholder="Describe brevemente tu operacion">${config.business_description || ''}</textarea>
                </div>
                <div class="form-group" style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-top: 12px;">
                    <div style="font-weight: 700; margin-bottom: 12px;">Identificacion legal y responsable</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Razon social o empresa</label>
                            <input type="text" name="identity_legal_name" value="${businessIdentity.legal_name || config.business_name || ''}">
                        </div>
                        <div class="form-group">
                            <label>${identityRules.responsibleLabel}</label>
                            <input type="text" name="identity_responsible_name" value="${businessIdentity.responsible_name || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Tipo documento fiscal</label>
                            <select name="identity_tax_id_type">
                                <option value="NIT" ${(businessIdentity.tax_id_type || 'NIT') === 'NIT' ? 'selected' : ''}>NIT</option>
                                <option value="RUT" ${businessIdentity.tax_id_type === 'RUT' ? 'selected' : ''}>RUT</option>
                                <option value="CC" ${businessIdentity.tax_id_type === 'CC' ? 'selected' : ''}>CC</option>
                                <option value="CE" ${businessIdentity.tax_id_type === 'CE' ? 'selected' : ''}>CE</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Numero documento (NIT/ID)</label>
                            <input type="text" name="identity_tax_id_number" value="${businessIdentity.tax_id_number || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>${identityRules.registrationLabel}</label>
                            <input type="text" name="identity_registration_code" value="${businessIdentity.registration_code || ''}" placeholder="${identityRules.registrationPlaceholder}">
                        </div>
                        <div class="form-group">
                            <label>Telefono administrativo</label>
                            <input type="text" name="identity_contact_phone" value="${businessIdentity.contact_phone || ''}" placeholder="Ej: +57 300 0000000">
                        </div>
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
                        Usa registro relacionado adicional
                    </label>
                </div>

                ${canManageBillingProfile ? `
                <div class="form-group" style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-top: 12px;">
                    <div style="font-weight: 700; margin-bottom: 12px;">Perfil fiscal para facturación en Colombia</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Razón social / nombre comercial</label>
                            <input type="text" name="billing_legal_name" value="${billingProfile.legal_name || config.business_name || ''}">
                        </div>
                        <div class="form-group">
                            <label>Tipo documento</label>
                            <select name="billing_document_type">
                                <option value="NIT" ${billingProfile.document_type === 'NIT' ? 'selected' : ''}>NIT</option>
                                <option value="CC" ${billingProfile.document_type === 'CC' ? 'selected' : ''}>CC</option>
                                <option value="CE" ${billingProfile.document_type === 'CE' ? 'selected' : ''}>CE</option>
                                <option value="RUT" ${billingProfile.document_type === 'RUT' ? 'selected' : ''}>RUT</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Número documento</label>
                            <input type="text" name="billing_document_number" value="${billingProfile.document_number || ''}">
                        </div>
                        <div class="form-group">
                            <label>Régimen</label>
                            <select name="billing_tax_regime">
                                <option value="" ${!billingProfile.tax_regime ? 'selected' : ''}>Seleccionar...</option>
                                <option value="Responsable de IVA" ${billingProfile.tax_regime === 'Responsable de IVA' ? 'selected' : ''}>Responsable de IVA</option>
                                <option value="No responsable de IVA" ${billingProfile.tax_regime === 'No responsable de IVA' ? 'selected' : ''}>No responsable de IVA</option>
                                <option value="Régimen simple" ${billingProfile.tax_regime === 'Régimen simple' ? 'selected' : ''}>Régimen simple</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Dirección</label>
                            <input type="text" name="billing_address" value="${billingProfile.address || ''}">
                        </div>
                        <div class="form-group">
                            <label>Ciudad / municipio</label>
                            <input type="text" name="billing_city" value="${billingProfile.city || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Email de facturación</label>
                            <input type="email" name="billing_email" value="${billingProfile.email || ''}">
                        </div>
                        <div class="form-group">
                            <label>Resolución / referencia DIAN</label>
                            <input type="text" name="billing_resolution" value="${billingProfile.resolution || ''}">
                        </div>
                    </div>
                </div>
                ` : ''}

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
            business_description: formData.get('business_description') || null,
            customer_label: formData.get('customer_label') || 'Cliente',
            appointment_label: formData.get('appointment_label') || 'Cita',
            pet_label: formData.get('pet_label') || null,
            has_pet_relationship: formData.get('has_pet_relationship') === 'on',
            pet_fields_enabled: this.getEnabledPetFields(form),
            custom_fields: {
                ...(this.businessConfig?.custom_fields || {}),
                business_identity: {
                    legal_name: formData.get('identity_legal_name') || null,
                    responsible_name: formData.get('identity_responsible_name') || null,
                    tax_id_type: formData.get('identity_tax_id_type') || 'NIT',
                    tax_id_number: formData.get('identity_tax_id_number') || null,
                    registration_code: formData.get('identity_registration_code') || null,
                    contact_phone: formData.get('identity_contact_phone') || null,
                }
            }
        };

        if (!authService.getCurrentUser()?.parent_user_id) {
            payload.custom_fields.billing_profile = {
                legal_name: formData.get('billing_legal_name') || null,
                document_type: formData.get('billing_document_type') || null,
                document_number: formData.get('billing_document_number') || null,
                tax_regime: formData.get('billing_tax_regime') || null,
                address: formData.get('billing_address') || null,
                city: formData.get('billing_city') || null,
                email: formData.get('billing_email') || null,
                resolution: formData.get('billing_resolution') || null,
            };
        }

        try {
            const updated = await apiService.updateBusinessConfig(payload);
            this.businessConfig = updated;
            await authService.loadCurrentUser();
            await authService.loadFeatures();
            await sidebar.loadUserFeatures(true);
            await router.navigate(router.getCurrentRoute() || 'businessconfig');
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
            await authService.loadCurrentUser();
            await authService.loadFeatures();
            await sidebar.loadUserFeatures(true);
            await router.navigate(router.getCurrentRoute() || 'businessconfig');
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
