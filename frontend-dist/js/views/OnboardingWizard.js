/**
 * Onboarding Wizard View (Fases 1-4)
 * Frontend activo servido por FastAPI desde frontend-dist
 */

import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import modal from '../components/Modal.js';
import router from '../utils/router.js';
import { PLAN_CATALOG } from '../utils/plans.js';

class OnboardingWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.businessTypes = [];
        this.plans = PLAN_CATALOG;

        this.governanceModes = [
            { code: 'comunitario', label: 'Comunitario', description: 'Juntas de accion comunal y organizaciones de base.' },
            { code: 'organizacional_civil', label: 'Organizacional Civil', description: 'Fundaciones, asociaciones y colectivos.' },
            { code: 'territorial_publico', label: 'Territorial Publico', description: 'Alcaldias, gobernaciones y entidades territoriales.' },
            { code: 'institucional_estatal', label: 'Institucional Estatal', description: 'Instituciones estatales y organismos de control.' },
        ];

        this.operationLevels = [
            { code: 'operativo', label: 'Operativo' },
            { code: 'administrativo', label: 'Administrativo' },
            { code: 'estrategico', label: 'Estrategico' },
            { code: 'control_auditoria', label: 'Control y Auditoria' },
        ];

        this.objectives = [
            { code: 'gestion_proyectos_casos', label: 'Gestion de Proyectos y Casos' },
            { code: 'control_recursos', label: 'Control de Recursos' },
            { code: 'seguimiento_ciudadano', label: 'Seguimiento Ciudadano' },
            { code: 'transparencia_auditoria', label: 'Transparencia y Auditoria' },
            { code: 'prevencion_riesgos', label: 'Prevencion de Riesgos' },
            { code: 'inteligencia_territorial', label: 'Inteligencia Territorial' },
        ];

        this.formData = {
            business_type: '',
            business_name: '',
            plan: 'free',
            role: 'admin',
            governance_mode: 'comunitario',
            operation_level: 'operativo',
            primary_objective: 'gestion_proyectos_casos',
            jurisdiction_code: 'CO',
            territory_code: '',
            entity_name: '',
        };

        this.phaseContext = {
            activation: null,
            trial_preview: null,
            policies: [],
            consents: [],
            accepted: {},
            trial: null,
        };
    }

    async render() {
        try {
            await this.loadBusinessTypes();
            if (!this.businessTypes || this.businessTypes.length === 0) {
                this.businessTypes = [
                    { code: 'veterinaria', label: 'Veterinaria', icon: '🐾', supports_pets: true },
                    { code: 'barberia', label: 'Barberia', icon: '✂️', supports_pets: false },
                    { code: 'nutricion', label: 'Nutricion', icon: '🥗', supports_pets: false },
                    { code: 'otro', label: 'Otro', icon: '📋', supports_pets: false },
                ];
            }
        } catch (_error) {
            this.businessTypes = [
                { code: 'veterinaria', label: 'Veterinaria', icon: '🐾', supports_pets: true },
                { code: 'barberia', label: 'Barberia', icon: '✂️', supports_pets: false },
                { code: 'nutricion', label: 'Nutricion', icon: '🥗', supports_pets: false },
                { code: 'otro', label: 'Otro', icon: '📋', supports_pets: false },
            ];
        }

        const user = authService.getCurrentUser();
        this.formData.role = user?.role || 'admin';

        if (this.formData.role === 'team') {
            this.totalSteps = 1;
        }

        const nextLabel = this.getNextLabel();

        return `
            <div class="onboarding-wrapper">
                <div class="onboarding-card">
                    <div class="onboarding-header">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                            <div style="flex: 1;">
                                <h1 class="onboarding-title">Onboarding Gobernanza</h1>
                                <p class="onboarding-subtitle">${this.formData.role === 'team' ? 'Cuenta de equipo lista para usar' : 'Fases 1 a 4: negocio, gobernanza, politicas y activacion'}</p>
                                <small style="color: #666; font-size: 12px;">
                                    Tu rol: <strong>${this.getRoleLabel(this.formData.role)}</strong>
                                </small>
                            </div>
                            <button id="btn-logout" title="Cerrar Sesion" style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 12px; cursor: pointer; color: #6b7280; font-size: 16px;">✕</button>
                        </div>
                    </div>

                    <div class="progress-container">
                        <div class="progress-info">
                            <span class="progress-step">Paso ${this.currentStep} de ${this.totalSteps}</span>
                            <span class="progress-percent">${Math.round((this.currentStep / this.totalSteps) * 100)}%</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${(this.currentStep / this.totalSteps) * 100}%"></div>
                        </div>
                    </div>

                    <div id="onboarding-content">
                        ${this.renderStepContent()}
                    </div>

                    <div class="nav-buttons">
                        <button id="btn-prev" class="btn btn-prev" ${this.currentStep === 1 ? 'disabled' : ''}>
                            ← Anterior
                        </button>
                        <button id="btn-next" class="btn btn-next">
                            ${nextLabel}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getNextLabel() {
        if (this.formData.role === 'team') return '✓ Finalizar';
        if (this.currentStep === 4) {
            const isPaid = this.formData.plan && this.formData.plan !== 'free';
            return isPaid ? 'Ir a pago pendiente →' : 'Entrar al dashboard →';
        }
        if (this.currentStep === 3) return '✓ Finalizar onboarding';
        return 'Siguiente →';
    }

    renderStepContent() {
        if (this.formData.role === 'team') return this.renderTeamOnboarding();

        if (this.currentStep === 1) return this.renderStep1();
        if (this.currentStep === 2) return this.renderStep2();
        if (this.currentStep === 3) return this.renderStep3();
        if (this.currentStep === 4) return this.renderStep4();
        return '';
    }

    renderTeamOnboarding() {
        return `
            <div class="step-content">
                <h2 class="step-title">Cuenta de Equipo Activa</h2>
                <p class="step-subtitle">Tu cuenta hereda configuracion del administrador principal.</p>
                <div class="info-box info-box-green">
                    <p>✓ Puedes comenzar a usar la plataforma.</p>
                </div>
            </div>
        `;
    }

    renderStep1() {
        const businessTypeOptions = this.businessTypes.map(type => `
            <option value="${type.code}" ${this.formData.business_type === type.code ? 'selected' : ''}>
                ${type.icon || ''} ${type.label}
            </option>
        `).join('');

        return `
            <div class="step-content">
                <h2 class="step-title">Informacion de tu Negocio</h2>
                <p class="step-subtitle">Fase 1: define tu base operativa</p>

                <div class="form-group">
                    <label class="form-label">Tipo de negocio <span class="required">*</span></label>
                    <select id="business_type" class="form-select" required>
                        <option value="">Selecciona tu tipo de negocio...</option>
                        ${businessTypeOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Nombre de tu negocio <span class="required">*</span></label>
                    <input type="text" id="business_name" value="${this.formData.business_name || ''}" placeholder="Ej: Junta de Accion Comunal Barrio La Esperanza" class="form-input" required>
                </div>
            </div>
        `;
    }

    renderStep2() {
        return `
            <div class="step-content">
                <h2 class="step-title">Gobernanza y Nivel Operativo</h2>
                <p class="step-subtitle">Fase 2: configura modelo institucional y plan</p>

                <div class="form-group">
                    <label class="form-label">Tipo de gobernanza <span class="required">*</span></label>
                    <select id="governance_mode" class="form-select" required>
                        ${this.governanceModes.map(mode => `<option value="${mode.code}" ${this.formData.governance_mode === mode.code ? 'selected' : ''}>${mode.label}</option>`).join('')}
                    </select>
                    <p class="form-help-text" id="governance_help">${this.governanceModes.find(m => m.code === this.formData.governance_mode)?.description || ''}</p>
                </div>

                <div class="form-group">
                    <label class="form-label">Nivel operativo <span class="required">*</span></label>
                    <select id="operation_level" class="form-select" required>
                        ${this.operationLevels.map(level => `<option value="${level.code}" ${this.formData.operation_level === level.code ? 'selected' : ''}>${level.label}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Objetivo principal <span class="required">*</span></label>
                    <select id="primary_objective" class="form-select" required>
                        ${this.objectives.map(obj => `<option value="${obj.code}" ${this.formData.primary_objective === obj.code ? 'selected' : ''}>${obj.label}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Plan <span class="required">*</span></label>
                    <select id="selected_plan" class="form-select" required>
                        ${this.plans.map(plan => `<option value="${plan.code}" ${this.formData.plan === plan.code ? 'selected' : ''}>${plan.name} (${plan.priceCOP === 0 ? 'Gratis' : '$' + plan.priceCOP.toLocaleString('es-CO') + '/mes'})</option>`).join('')}
                    </select>
                    <p class="form-help-text">Las funciones premium dependen de plan activo y/o trial aprobado.</p>
                </div>
            </div>
        `;
    }

    renderStep3() {
        const policyHtml = (this.phaseContext.policies || []).map(policy => `
            <div class="summary-card info" style="margin-bottom: 8px;">
                <div class="summary-item"><span class="summary-label">Tipo:</span><span class="summary-value">${policy.policy_type}</span></div>
                <div class="summary-item"><span class="summary-label">Version:</span><span class="summary-value">${policy.version_label}</span></div>
                <div class="summary-item"><span class="summary-label">Resumen:</span><span class="summary-value">${policy.content_summary || '-'}</span></div>
            </div>
        `).join('');

        const consentsHtml = (this.phaseContext.consents || []).map(item => `
            <label class="plan-card-wrapper" style="margin-bottom: 8px; display: block;">
                <div class="plan-card plan-card-content" style="padding: 12px;">
                    <div style="display: flex; gap: 8px; align-items: flex-start;">
                        <input type="checkbox" class="consent-check" data-code="${item.code}" ${this.phaseContext.accepted[item.code] ? 'checked' : ''}>
                        <div>
                            <div style="font-weight: 600;">${item.code} ${item.is_mandatory ? '(obligatorio)' : '(opcional)'}</div>
                            <div style="font-size: 12px; color: #666;">${item.purpose || ''}</div>
                        </div>
                    </div>
                </div>
            </label>
        `).join('');

        return `
            <div class="step-content">
                <h2 class="step-title">Politicas y Consentimiento</h2>
                <p class="step-subtitle">Fase 3: acepta politicas obligatorias para activar el perfil</p>

                <div class="info-box info-box-blue">
                    <p>Debes aceptar todos los consentimientos obligatorios para continuar.</p>
                </div>

                <h3 style="margin: 12px 0 8px;">Politicas vigentes</h3>
                ${policyHtml || '<p style="color:#666;">No se encontraron politicas activas.</p>'}

                <h3 style="margin: 12px 0 8px;">Consentimientos</h3>
                ${consentsHtml || '<p style="color:#666;">No se encontraron consentimientos.</p>'}
            </div>
        `;
    }

    renderStep4() {
        const modules = (this.phaseContext.activation?.modules || []).map(moduleName => `<span class="summary-value" style="margin-right: 8px;">${moduleName}</span>`).join('');
        const trial = this.phaseContext.trial;
        const trialPreview = this.phaseContext.trial_preview;
        const trialText = trial?.active
            ? `Trial activo (${trial.status || 'active'})`
            : (trialPreview?.eligible ? 'Elegible para trial por politica' : 'Sin trial activo');

        return `
            <div class="step-content">
                <h2 class="step-title">Activacion Final Completada</h2>
                <p class="step-subtitle">Fase 4: resumen de activacion y acceso</p>

                <div class="info-box info-box-green">
                    <p>✓ Onboarding completado correctamente.</p>
                </div>

                <div class="summary-card info">
                    <div class="summary-card-header">Estado Premium y Trial</div>
                    <div class="summary-content">
                        <div class="summary-item"><span class="summary-label">Plan:</span><span class="summary-value">${this.formData.plan}</span></div>
                        <div class="summary-item"><span class="summary-label">Trial:</span><span class="summary-value">${trialText}</span></div>
                    </div>
                </div>

                <div class="summary-card plan">
                    <div class="summary-card-header">Modulos activados</div>
                    <div class="summary-content">
                        <div class="summary-item" style="display:block;">
                            ${modules || '<span class="summary-value">No informado por backend</span>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents() {
        document.getElementById('btn-next')?.addEventListener('click', () => this.handleNext());
        document.getElementById('btn-prev')?.addEventListener('click', () => this.handlePrev());
        document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());

        document.getElementById('business_type')?.addEventListener('change', (e) => {
            this.formData.business_type = e.target.value;
        });

        document.getElementById('business_name')?.addEventListener('input', (e) => {
            this.formData.business_name = e.target.value;
            if (!this.formData.entity_name) {
                this.formData.entity_name = e.target.value;
            }
        });

        document.getElementById('governance_mode')?.addEventListener('change', (e) => {
            this.formData.governance_mode = e.target.value;
            const mode = this.governanceModes.find(item => item.code === e.target.value);
            const help = document.getElementById('governance_help');
            if (help) help.textContent = mode?.description || '';
        });

        document.getElementById('operation_level')?.addEventListener('change', (e) => {
            this.formData.operation_level = e.target.value;
        });

        document.getElementById('primary_objective')?.addEventListener('change', (e) => {
            this.formData.primary_objective = e.target.value;
        });

        document.getElementById('selected_plan')?.addEventListener('change', (e) => {
            this.formData.plan = e.target.value;
        });

        document.querySelectorAll('.consent-check').forEach((checkbox) => {
            checkbox.addEventListener('change', (e) => {
                const code = e.target.dataset.code;
                this.phaseContext.accepted[code] = Boolean(e.target.checked);
            });
        });
    }

    async handleNext() {
        if (this.formData.role === 'team') {
            await this.markOnboardingDone();
            await router.navigate('dashboard');
            return;
        }

        if (this.currentStep === 1) {
            if (!this.validateStep1()) return;
            this.currentStep = 2;
            await this.refresh();
            return;
        }

        if (this.currentStep === 2) {
            if (!this.validateStep2()) return;
            const ready = await this.preparePhase3();
            if (!ready) return;
            this.currentStep = 3;
            await this.refresh();
            return;
        }

        if (this.currentStep === 3) {
            const ok = await this.completePhase3();
            if (!ok) return;
            this.currentStep = 4;
            await this.refresh();
            return;
        }

        if (this.currentStep === 4) {
            const isPaid = this.formData.plan && this.formData.plan !== 'free';
            await router.navigate(isPaid ? 'payment-pending' : 'dashboard');
        }
    }

    handlePrev() {
        if (this.currentStep > 1) {
            this.currentStep -= 1;
            this.refresh();
            return;
        }
        this.handleLogout();
    }

    handleLogout() {
        authService.logout();
        localStorage.removeItem('onboarding_completed');
        localStorage.removeItem('onboarding_user_email');
        localStorage.removeItem('user_plan');
        localStorage.removeItem('user_role');
        router.navigate('login');
    }

    validateStep1() {
        const businessType = document.getElementById('business_type')?.value;
        const businessName = (document.getElementById('business_name')?.value || '').trim();

        if (!businessType) {
            modal.showError('Selecciona el tipo de negocio.');
            return false;
        }

        if (!businessName) {
            modal.showError('Ingresa el nombre de tu negocio.');
            return false;
        }

        this.formData.business_type = businessType;
        this.formData.business_name = businessName;
        this.formData.entity_name = businessName;
        return true;
    }

    validateStep2() {
        if (!this.formData.governance_mode) {
            modal.showError('Selecciona un tipo de gobernanza.');
            return false;
        }
        if (!this.formData.operation_level || !this.formData.primary_objective) {
            modal.showError('Completa nivel operativo y objetivo.');
            return false;
        }
        if (!this.formData.plan) {
            modal.showError('Selecciona un plan.');
            return false;
        }
        return true;
    }

    async preparePhase3() {
        try {
            modal.showLoading('Preparando politicas y consentimiento...');

            await this.saveBusinessConfigOnly();

            const initResponse = await apiService.post('/onboarding/initialize', {
                governance_mode: this.formData.governance_mode,
                role: this.formData.role,
                operation_level: this.formData.operation_level,
                primary_objective: this.formData.primary_objective,
                entity_name: this.formData.entity_name || this.formData.business_name,
                jurisdiction_code: this.formData.jurisdiction_code || 'CO',
                territory_code: this.formData.territory_code || null,
            });

            this.phaseContext.activation = initResponse?.activation || null;
            this.phaseContext.trial_preview = initResponse?.trial_preview || null;

            const policiesResponse = await apiService.get('/onboarding/policies');
            this.phaseContext.policies = policiesResponse?.policies || [];

            const consentsResponse = await apiService.get('/onboarding/consents/status');
            this.phaseContext.consents = consentsResponse?.items || [];
            this.phaseContext.accepted = {};
            this.phaseContext.consents.forEach((item) => {
                this.phaseContext.accepted[item.code] = Boolean(item.active);
            });

            modal.closeModal();
            return true;
        } catch (error) {
            modal.closeModal();
            modal.showError(error?.message || 'No se pudo preparar la fase de politicas.');
            return false;
        }
    }

    async completePhase3() {
        try {
            const missingMandatory = (this.phaseContext.consents || [])
                .filter((item) => item.is_mandatory)
                .filter((item) => !this.phaseContext.accepted[item.code]);

            if (missingMandatory.length > 0) {
                modal.showError(`Faltan consentimientos obligatorios: ${missingMandatory.map((item) => item.code).join(', ')}`);
                return false;
            }

            modal.showLoading('Finalizando onboarding...');

            await apiService.post('/onboarding/consents', {
                items: (this.phaseContext.consents || []).map((item) => ({
                    code: item.code,
                    accepted: Boolean(this.phaseContext.accepted[item.code]),
                })),
            });

            await apiService.post('/onboarding/complete', {});
            await this.markOnboardingDone();

            try {
                this.phaseContext.trial = await apiService.get('/onboarding/trials/me');
            } catch (_error) {
                this.phaseContext.trial = null;
            }

            modal.closeModal();
            return true;
        } catch (error) {
            modal.closeModal();
            modal.showError(error?.message || 'No se pudo finalizar onboarding.');
            return false;
        }
    }

    async saveBusinessConfigOnly() {
        const selectedType = this.businessTypes.find((type) => type.code === this.formData.business_type);

        const payload = {
            ...this.formData,
            custom_labels: {
                customers: selectedType?.default_label_customers || 'Cliente',
                appointments: selectedType?.default_label_appointments || 'Cita',
                pets: selectedType?.default_label_pets || 'Mascota',
            },
            has_pet_relationship: Boolean(selectedType?.supports_pets),
        };

        let currentConfig = null;
        try {
            currentConfig = await apiService.getBusinessConfig();
        } catch (_error) {
            currentConfig = null;
        }

        if (currentConfig) {
            await apiService.updateBusinessConfig(payload);
        } else {
            await apiService.createBusinessConfig(payload);
        }
    }

    async markOnboardingDone() {
        localStorage.setItem('user_plan', this.formData.plan || 'free');
        localStorage.setItem('user_role', this.formData.role || 'viewer');
        localStorage.setItem('onboarding_completed', 'true');

        try {
            await apiService.post('/users/me/complete-onboarding', {});
        } catch (_error) {
            // Optional fallback flag is already in localStorage.
        }
    }

    async loadBusinessTypes() {
        const response = await apiService.getBusinessTypes();
        this.businessTypes = Array.isArray(response) ? response : (response?.types || []);
    }

    async refresh() {
        const container = document.querySelector('#app');
        if (container) {
            container.innerHTML = await this.render();
            this.attachEvents();
        }
    }

    getRoleLabel(role) {
        const roleLabels = {
            team: 'Empleado (Team)',
            viewer: 'Viewer',
            manager: 'Manager',
            admin: 'Administrador',
        };
        return roleLabels[role] || role;
    }
}

export default new OnboardingWizard();
