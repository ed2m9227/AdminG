/**
 * Onboarding Wizard View (Flujo dinamico gobernanza/negocio)
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
        this.totalSteps = 2;
        this.businessTypes = [];
        this.plans = PLAN_CATALOG;
        this.contextReady = false;

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
    }

    getFallbackBusinessTypes() {
        return [
            { code: 'gobernanza', label: 'Gobernanza', icon: '🏛️', supports_pets: false, is_governance: true },
            { code: 'veterinaria', label: 'Veterinaria', icon: '🐾', supports_pets: true, is_governance: false },
            { code: 'barberia', label: 'Barberia', icon: '✂️', supports_pets: false, is_governance: false },
            { code: 'nutricion', label: 'Nutricion', icon: '🥗', supports_pets: false, is_governance: false },
            { code: 'otro', label: 'Otro', icon: '🏢', supports_pets: false, is_governance: false },
        ];
    }

    normalizeBusinessType(item) {
        return {
            code: (item?.code || item?.type || '').toLowerCase().trim(),
            label: item?.label || item?.name || item?.type || item?.code || 'Sin etiqueta',
            icon: item?.icon || '🏢',
            supports_pets: Boolean(item?.supports_pets),
            is_governance: Boolean(item?.is_governance) || (item?.supports_governance === true),
        };
    }

    isGovernanceBusinessType(typeCode) {
        const normalized = (typeCode || '').toLowerCase().trim();
        return normalized === 'gobernanza' || normalized === 'governance' || normalized === 'institucional' || normalized === 'gobernanza_y_politica';
    }

    syncFlowBySelection() {
        if (this.formData.role === 'team') {
            this.totalSteps = 1;
            this.currentStep = 1;
            return;
        }

        // Governance: 4 steps (tipo → gobernanza → plan → políticas)
        // Otros: 3 steps (tipo → plan → políticas)
        this.totalSteps = this.isGovernanceBusinessType(this.formData.business_type) ? 4 : 3;

        if (this.currentStep > this.totalSteps) {
            this.currentStep = this.totalSteps;
        }
    }

    async ensureContext() {
        if (this.contextReady) return;

        try {
            const user = authService.getCurrentUser() || await authService.loadCurrentUser();
            this.formData.role = user?.role || 'admin';

            try {
                const response = await apiService.getBusinessTypes();
                const list = Array.isArray(response) ? response : (response?.types || []);
                this.businessTypes = list.map((item) => this.normalizeBusinessType(item)).filter((item) => item.code);
            } catch (_error) {
                this.businessTypes = this.getFallbackBusinessTypes();
            }

            if (!this.businessTypes.some((item) => this.isGovernanceBusinessType(item.code))) {
                this.businessTypes.unshift({ code: 'gobernanza', label: 'Gobernanza', icon: '🏛️', supports_pets: false });
            }

            if (!this.businessTypes.some((item) => item.code === 'otro')) {
                this.businessTypes.push({ code: 'otro', label: 'Otro', icon: '🏢', supports_pets: false });
            }

            const userBusinessType = (user?.business_type || '').toLowerCase().trim();
            if (userBusinessType && userBusinessType !== 'master') {
                this.formData.business_type = userBusinessType;
            }

            try {
                const businessConfig = await apiService.getBusinessConfig();
                const configType = (businessConfig?.business_type || '').toLowerCase().trim();
                if (configType) this.formData.business_type = configType;
                this.formData.business_name = businessConfig?.business_name || this.formData.business_name;
                this.formData.entity_name = this.formData.entity_name || this.formData.business_name;
                if (businessConfig?.plan) this.formData.plan = businessConfig.plan;
            } catch (_error) {
                // Some users may not have business config yet.
            }

            if (!this.formData.business_type) {
                this.formData.business_type = 'veterinaria';
            }

            if (!this.formData.business_name) {
                this.formData.business_name = user?.full_name || '';
            }

            // Preservar entity_name si ya existe, solo setear si está vacío
            const existingEntityName = this.formData.entity_name;
            if (!existingEntityName || existingEntityName.length === 0) {
                this.formData.entity_name = this.formData.business_name || user?.full_name || '';
            }

            this.syncFlowBySelection();
        } finally {
            this.contextReady = true;
        }
    }

    async render() {
        await this.ensureContext();

        const nextLabel = this.getNextLabel();

        return `
            <div class="onboarding-wrapper">
                <div class="onboarding-card">
                    <div class="onboarding-header">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                            <div style="flex: 1;">
                                <h1 class="onboarding-title">Bienvenido</h1>
                                <p class="onboarding-subtitle">${this.getSubtitle()}</p>
                                <small style="color: #666; font-size: 12px;">
                                    Tu rol: <strong>${this.getRoleLabel(this.formData.role)}</strong>
                                </small>
                            </div>
                            <button id="btn-logout" title="Cerrar Sesion" style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 12px; cursor: pointer; color: #6b7280; font-size: 16px;">X</button>
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
                        <button id="btn-prev" class="btn btn-prev" ${this.currentStep === 1 ? 'disabled' : ''}>Anterior</button>
                        <button id="btn-next" class="btn btn-next">${nextLabel}</button>
                    </div>
                </div>
            </div>
        `;
    }

    getSubtitle() {
        if (this.formData.role === 'team') return 'Cuenta de equipo lista para usar';
        if (this.currentStep === 1) return 'Fase 1 tipo de negocio';
        if (this.currentStep === 2 && this.isGovernanceBusinessType(this.formData.business_type)) return 'Fase 2 gobernanza e instituciones';
        if (this.currentStep === 3 && this.isGovernanceBusinessType(this.formData.business_type)) return 'Fase 3 seleccion de plan';
        if (this.currentStep === 3 && !this.isGovernanceBusinessType(this.formData.business_type)) return 'Fase 2 seleccion de plan';
        if (this.currentStep === 4) return 'Fase 4 terminos y privacidad';
        return 'Configuracion';
    }

    getPlanColorClass(planCode) {
        const map = {
            free: 'gray',
            starter: 'blue',
            pro: 'purple',
            enterprise: 'indigo',
            growth: 'purple',
            team: 'blue',
        };
        return map[planCode] || 'gray';
    }

    renderPlanCards() {
        return `
            <div class="plan-grid">
                ${this.plans.map((plan) => {
                    const isSelected = this.formData.plan === plan.code;
                    const color = this.getPlanColorClass(plan.code);
                    const maxUsers = plan.max_users ?? 'Ilimitados';
                    const maxCustomers = plan.max_customers ?? 'Ilimitados';
                    const featureRows = [
                        `Usuarios: ${maxUsers}`,
                        `Clientes: ${maxCustomers}`,
                        plan.priceCOP === 0 ? 'Sin costo mensual' : 'Soporte premium incluido',
                    ];

                    return `
                        <label class="plan-card-wrapper">
                            <input type="radio" name="selected_plan" class="plan-radio" value="${plan.code}" ${isSelected ? 'checked' : ''}>
                            <div class="plan-card plan-card-content ${color} ${isSelected ? 'selected' : ''}" data-plan="${plan.code}">
                                <div class="plan-price-header">
                                    <div class="plan-name">${plan.name}</div>
                                    <div class="plan-price">
                                        ${plan.priceCOP === 0 ? 'Gratis' : '$' + Number(plan.priceCOP || 0).toLocaleString('es-CO')}
                                        ${plan.priceCOP === 0 ? '' : '<span class="plan-price-period">/mes</span>'}
                                    </div>
                                </div>
                                <div class="plan-limits">${plan.code.toUpperCase()}</div>
                                <ul class="plan-features">
                                    ${featureRows.map((item) => `<li>${item}</li>`).join('')}
                                </ul>
                            </div>
                        </label>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderBusinessTypeCards() {
        return `
            <div class="plan-grid">
                ${this.businessTypes.map((type) => {
                    const isSelected = this.formData.business_type === type.code;
                    return `
                        <label class="plan-card-wrapper">
                            <input type="radio" name="business_type" class="business-type-radio" value="${type.code}" ${isSelected ? 'checked' : ''}>
                            <div class="plan-card plan-card-content gray ${isSelected ? 'selected' : ''}" data-business-type="${type.code}">
                                <div class="plan-price-header">
                                    <div class="plan-name">${type.icon || '🏢'} ${type.label}</div>
                                </div>
                                <div class="plan-limits">Codigo: ${type.code}</div>
                            </div>
                        </label>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderStepContent() {
        if (this.formData.role === 'team') return this.renderTeamOnboarding();

        if (this.currentStep === 1) return this.renderStep1();

        // Step 2: Governance subtype (only for governance type)
        if (this.currentStep === 2 && this.isGovernanceBusinessType(this.formData.business_type)) {
            return this.renderStep2Governance();
        }

        // Step 2 for non-governance: Plan selection
        if (this.currentStep === 2 && !this.isGovernanceBusinessType(this.formData.business_type)) {
            return this.renderStep2Plan();
        }

        // Step 3: Plan selection (for governance) or Policies (for non-governance)
        if (this.currentStep === 3) {
            if (this.isGovernanceBusinessType(this.formData.business_type)) {
                return this.renderStep2Plan(); // Step 3 = plan for governance
            }
            return this.renderStep3Policies(); // Step 3 = policies for non-governance
        }

        // Step 4: Policies (only for governance)
        if (this.currentStep === 4 && this.isGovernanceBusinessType(this.formData.business_type)) {
            return this.renderStep3Policies();
        }

        return '';
    }

    renderTeamOnboarding() {
        return `
            <div class="step-content">
                <h2 class="step-title">Cuenta de Equipo Activa</h2>
                <p class="step-subtitle">Tu cuenta hereda configuracion del administrador principal.</p>
                <div class="info-box info-box-green">
                    <p>Puedes comenzar a usar la plataforma.</p>
                </div>
            </div>
        `;
    }

    renderStep1() {
        return `
            <div class="step-content">
                <h2 class="step-title">Tipo de Negocio</h2>
                <p class="step-subtitle">Selecciona tipo, subtipo y nombre base de tu operacion</p>

                <div class="form-group">
                    <label class="form-label">Tipo de negocio <span class="required">*</span></label>
                    <select id="business_type_select" class="form-select" required>
    ${this.businessTypes.map(type => `<option value="${type.code}" ${this.formData.business_type === type.code ? 'selected' : ''}>${type.icon} ${type.label}</option>`).join('')}
</select>
                </div>

                <div class="form-group">
                    <label class="form-label">Nombre del negocio o entidad <span class="required">*</span></label>
                    <input type="text" id="business_name" value="${this.formData.business_name || ''}" placeholder="Ej: Caniche Vet Center" class="form-input" required>
                </div>
            </div>
        `;
    }

    renderStep2Governance() {
        return `
            <div class="step-content">
                <h2 class="step-title">Gobernanza y Subtipo Institucional</h2>
                <p class="step-subtitle">Configura subtipo, nivel operativo y objetivo antes del plan</p>

                <div class="form-group">
                    <label class="form-label">Subtipo de gobernanza <span class="required">*</span></label>
                    <select id="governance_mode" class="form-select" required>
                        ${this.governanceModes.map((mode) => `<option value="${mode.code}" ${this.formData.governance_mode === mode.code ? 'selected' : ''}>${mode.label}</option>`).join('')}
                    </select>
                    <p class="form-help-text" id="governance_help">${this.governanceModes.find((m) => m.code === this.formData.governance_mode)?.description || ''}</p>
                </div>

                <div class="form-group">
                    <label class="form-label">Nivel operativo <span class="required">*</span></label>
                    <select id="operation_level" class="form-select" required>
                        ${this.operationLevels.map((level) => `<option value="${level.code}" ${this.formData.operation_level === level.code ? 'selected' : ''}>${level.label}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Objetivo principal <span class="required">*</span></label>
                    <select id="primary_objective" class="form-select" required>
                        ${this.objectives.map((obj) => `<option value="${obj.code}" ${this.formData.primary_objective === obj.code ? 'selected' : ''}>${obj.label}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Nombre de la entidad <span class="required">*</span></label>
                    <input type="text" id="entity_name" value="${this.formData.entity_name || this.formData.business_name || ''}" placeholder="Ej: Junta de Accion Comunal Barrio La Esperanza" class="form-input" required>
                </div>
            </div>
        `;
    }

    renderStep2Plan() {
        return `
            <div class="step-content">
                <h2 class="step-title">Seleccion de Plan</h2>
                <p class="step-subtitle">Elige el plan de activacion (vista en tarjetas)</p>
                ${this.renderPlanCards()}
                <p class="form-help-text">Las funciones premium dependen de plan activo y/o trial aprobado.</p>
            </div>
        `;
    }

    renderStep3Policies() {
        return `
            <div class="step-content">
                <h2 class="step-title">Terminos y Privacidad</h2>
                <p class="step-subtitle">Revisa y acepta nuestros terminos para continuar</p>
                
                <div class="policy-section" style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;">
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: #1f2937;">Politica de Privacidad</h3>
                    <p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6;">
                        <strong>1. Recopilacion de Datos:</strong> Recopilamos informacion personal que proporcionas al registrarte, incluyendo nombre, correo electronico, numero de telefono y datos de tu organizacion. Tambien recopilamos datos de uso de la plataforma para mejorar nuestros servicios.<br><br>
                        <strong>2. Uso de la Informacion:</strong> Utilizamos tus datos para: (a) proporcionar y mantener nuestros servicios; (b) notifyarte sobre cambios en nuestros servicios; (c) proporcionarte soporte tecnico; (d) detectar, prevenir y abordar problemas tecnicos y de seguridad.<br><br>
                        <strong>3. Proteccion de Datos:</strong> Implementamos medidas de seguridad apropiadas para proteger tu informacion personal contra accesos no autorizados, alteracion, divulgacion o destruccion. Utilizamos cifrado SSL/TLS para todas las transmisiones de datos.<br><br>
                        <strong>4. Comparticion de Datos:</strong> No vendemos, intercambiamos ni transferimos tu informacion personal a terceros sin tu consentimiento, excepto cuando sea necesario para proporcionar servicios solicitados por ti.<br><br>
                        <strong>5. Retencion de Datos:</strong> Conservamos tus datos personales solo durante el tiempo necesario para los fines establecidos en esta politica de privacidad.<br><br>
                        <strong>6. Tus Derechos:</strong> Tienes derecho a acceder, corregir, eliminar o restringir el procesamiento de tus datos personales. Para ejercer estos derechos, contactanos a traves de los canales oficiales.<br><br>
                        <strong>7. Consentimiento:</strong> Al utilizar nuestra plataforma, consientes el procesamiento de tus datos personales de acuerdo con esta politica.
                    </p>
                </div>
                
                <div class="policy-section" style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;">
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; color: #1f2937;">Terminos de Uso</h3>
                    <p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6;">
                        <strong>1. Aceptacion de Terminos:</strong> Al acceder y utilizar esta plataforma, aceptas estar vinculado por estos terminos de uso. Si no estas de acuerdo con alguno de estos terminos, no utilices nuestros servicios.<br><br>
                        <strong>2. Uso de la Plataforma:</strong> Te comprometes a utilizar la plataforma solo para fines legales y de acuerdo con estos terminos. No podras: (a) copiar, modificar o distribuir el contenido sin autorizacion; (b) utilizar la plataforma para cualquier proposito ilegal; (c) intentar acceder a sistemas no autorizados.<br><br>
                        <strong>3. Cuenta de Usuario:</strong> Eres responsable de mantener la confidencialidad de tu cuenta y contrasena. Aceptas notificar inmediatamente cualquier uso no autorizado de tu cuenta.<br><br>
                        <strong>4. Propiedad Intelectual:</strong> Todo el contenido, disenos y codigo de esta plataforma son propiedad de AdminG y estan protegidos por leyes de propiedad intelectual.<br><br>
                        <strong>5. Limitacion de Responsabilidad:</strong> La plataforma se proporciona "tal cual" sin garantias de ningun tipo. No seremos responsables de cualquier dano directo, indirecto, incidental o consecuente.<br><br>
                        <strong>6. Modificaciones:</strong> Nos reservamos el derecho de modificar estos terminos en cualquier momento. Las modificaciones entraran en vigor al momento de su publicacion.<br><br>
                        <strong>7. Ley Aplicable:</strong> Estos terminos se regiran por las leyes de Colombia. Cualquier disputa sera resuelta en los tribunales de Colombia.
                    </p>
                </div>
                
                <div class="form-group" style="margin-top: 1rem;">
                    <label class="policy-checkbox" style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; padding: 1rem; border: 2px solid #e5e7eb; border-radius: 8px; transition: all 0.2s;">
                        <input type="checkbox" id="accept_privacy" style="margin-top: 0.25rem; width: 18px; height: 18px;">
                        <div>
                            <span style="font-weight: 600; color: #1f2937;">Acepto la Politica de Privacidad</span>
                            <p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">He leido y acepto el tratamiento de mis datos personales</p>
                        </div>
                    </label>
                </div>
                
                <div class="form-group" style="margin-top: 1rem;">
                    <label class="policy-checkbox" style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; padding: 1rem; border: 2px solid #e5e7eb; border-radius: 8px; transition: all 0.2s;">
                        <input type="checkbox" id="accept_terms" style="margin-top: 0.25rem; width: 18px; height: 18px;">
                        <div>
                            <span style="font-weight: 600; color: #1f2937;">Acepto los Terminos de Uso</span>
                            <p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">He leido y acepto los terminos y condiciones de uso</p>
                        </div>
                    </label>
                </div>
            </div>
        `;
    }

    getNextLabel() {
        if (this.formData.role === 'team') return 'Finalizar';

        if (this.currentStep === this.totalSteps) {
            const isPaid = this.formData.plan && this.formData.plan !== 'free';
            return isPaid ? 'Ir a pago pendiente' : 'Entrar al dashboard';
        }

        return 'Siguiente';
    }

    attachEvents() {
        document.getElementById('btn-next')?.addEventListener('click', () => this.handleNext());
        document.getElementById('btn-prev')?.addEventListener('click', () => this.handlePrev());
        document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());

        document.getElementById('business_name')?.addEventListener('input', (e) => {
            this.formData.business_name = e.target.value;
            // Solo setear entity_name si no existe o si es el primer ingreso
            if (!this.formData.entity_name || this.formData.entity_name.length === 0) {
                this.formData.entity_name = e.target.value;
            }
        });

        document.getElementById('business_type_select')?.addEventListener('change', (e) => {
            this.formData.business_type = e.target.value;
            this.syncFlowBySelection();
            this.refresh();
        });

        document.getElementById('entity_name')?.addEventListener('input', (e) => {
            this.formData.entity_name = e.target.value;
        });

        document.getElementById('governance_mode')?.addEventListener('change', (e) => {
            this.formData.governance_mode = e.target.value;
            const mode = this.governanceModes.find((item) => item.code === e.target.value);
            const help = document.getElementById('governance_help');
            if (help) help.textContent = mode?.description || '';
        });

        document.getElementById('operation_level')?.addEventListener('change', (e) => {
            this.formData.operation_level = e.target.value;
        });

        document.getElementById('primary_objective')?.addEventListener('change', (e) => {
            this.formData.primary_objective = e.target.value;
        });

        document.querySelectorAll('.business-type-radio').forEach((radio) => {
            radio.addEventListener('change', (e) => {
                this.formData.business_type = e.target.value;
                this.syncFlowBySelection();
                this.refresh();
            });
        });

        document.querySelectorAll('.plan-radio').forEach((radio) => {
            radio.addEventListener('change', (e) => {
                this.formData.plan = e.target.value;
                this.refresh();
            });
        });
    }

    async handleNext() {
        if (this.formData.role === 'team') {
            await this.markOnboardingDone();
            await router.navigate('dashboard');
            return;
        }

        // Step 1: Business type and name
        if (this.currentStep === 1) {
            if (!this.validateStep1()) return;
            this.currentStep = 2;
            await this.refresh();
            return;
        }

        // Step 2: Governance subtype (only for governance type)
        if (this.currentStep === 2 && this.isGovernanceBusinessType(this.formData.business_type)) {
            if (!this.validateGovernanceStep()) return;
            this.currentStep = 3;
            await this.refresh();
            return;
        }

        // Step 2 for non-governance: Plan selection
        if (this.currentStep === 2 && !this.isGovernanceBusinessType(this.formData.business_type)) {
            if (!this.validatePlanStep()) return;
            this.currentStep = 3;
            await this.refresh();
            return;
        }

        // Step 3: Plan selection (for governance) or Policies (for non-governance)
        if (this.currentStep === 3) {
            if (this.isGovernanceBusinessType(this.formData.business_type)) {
                // Governance: Step 3 = Plan
                if (!this.validatePlanStep()) return;
                this.currentStep = 4;
                await this.refresh();
                return;
            }
            // Non-governance: Step 3 = Policies
            if (!this.validatePolicyStep()) return;
            const ok = await this.finalizeOnboardingWithPolicies();
            if (!ok) return;
            const isPaid = this.formData.plan && this.formData.plan !== 'free';
            await router.navigate(isPaid ? 'payment-pending' : 'dashboard');
            return;
        }

        // Step 4: Policies (only for governance)
        if (this.currentStep === 4 && this.isGovernanceBusinessType(this.formData.business_type)) {
            if (!this.validatePolicyStep()) return;
            const ok = await this.finalizeOnboardingWithPolicies();
            if (!ok) return;
            const isPaid = this.formData.plan && this.formData.plan !== 'free';
            await router.navigate(isPaid ? 'payment-pending' : 'dashboard');
            return;
        }
    }

    async handlePrev() {
        if (this.currentStep > 1) {
            this.currentStep -= 1;
            await this.refresh();
        }
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
        const businessName = (document.getElementById('business_name')?.value || '').trim();

        if (!this.formData.business_type) {
            modal.showError('Selecciona un tipo de negocio.');
            return false;
        }

        if (!businessName) {
            modal.showError('Ingresa el nombre del negocio o entidad.');
            return false;
        }

        this.formData.business_name = businessName;
        if (!this.formData.entity_name) this.formData.entity_name = businessName;
        return true;
    }

    validateGovernanceStep() {
        const entityName = (document.getElementById('entity_name')?.value || '').trim();

        if (!this.formData.governance_mode) {
            modal.showError('Selecciona un subtipo de gobernanza.');
            return false;
        }

        if (!this.formData.operation_level || !this.formData.primary_objective) {
            modal.showError('Completa nivel operativo y objetivo.');
            return false;
        }

        if (!entityName) {
            modal.showError('Ingresa el nombre de la entidad.');
            return false;
        }

        this.formData.entity_name = entityName;
        return true;
    }

    validatePlanStep() {
        if (!this.formData.plan) {
            modal.showError('Selecciona un plan.');
            return false;
        }
        return true;
    }

    validatePolicyStep() {
        const acceptPrivacy = document.getElementById('accept_privacy')?.checked;
        const acceptTerms = document.getElementById('accept_terms')?.checked;

        if (!acceptPrivacy) {
            modal.showError('Debes aceptar la Politica de Privacidad para continuar.');
            return false;
        }

        if (!acceptTerms) {
            modal.showError('Debes aceptar los Terminos de Uso para continuar.');
            return false;
        }

        return true;
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

    async finalizeOnboardingWithoutPolicies() {
        try {
            modal.showLoading('Finalizando onboarding...');

            await this.saveBusinessConfigOnly();

            if (this.isGovernanceBusinessType(this.formData.business_type)) {
                await apiService.post('/onboarding/initialize', {
                    governance_mode: this.formData.governance_mode,
                    role: this.formData.role,
                    operation_level: this.formData.operation_level,
                    primary_objective: this.formData.primary_objective,
                    entity_name: this.formData.entity_name || this.formData.business_name,
                    jurisdiction_code: this.formData.jurisdiction_code || 'CO',
                    territory_code: this.formData.territory_code || null,
                });
            }

            await this.markOnboardingDone();

            try {
                await apiService.post('/onboarding/complete', {});
            } catch (_error) {
                // Keep local and user completion flags even if backend complete fails.
            }

            modal.closeModal();
            return true;
        } catch (error) {
            modal.closeModal();
            modal.showError(error?.message || 'No se pudo finalizar onboarding.');
            return false;
        }
    }

    async finalizeOnboardingWithPolicies() {
        try {
            modal.showLoading('Finalizando onboarding con terminos...');

            await this.saveBusinessConfigOnly();

            if (this.isGovernanceBusinessType(this.formData.business_type)) {
                await apiService.post('/onboarding/initialize', {
                    governance_mode: this.formData.governance_mode,
                    role: this.formData.role,
                    operation_level: this.formData.operation_level,
                    primary_objective: this.formData.primary_objective,
                    entity_name: this.formData.entity_name || this.formData.business_name,
                    jurisdiction_code: this.formData.jurisdiction_code || 'CO',
                    territory_code: this.formData.territory_code || null,
                });
            }

            // Save policy acceptances
            try {
                await apiService.post('/onboarding/consents', {
                    items: [
                        { code: 'privacy_base', accepted: true },
                        { code: 'terms_use', accepted: true },
                    ],
                });
            } catch (_error) {
                // Continue even if consent save fails
            }

            await this.markOnboardingDone();

            try {
                await apiService.post('/onboarding/complete', {});
            } catch (_error) {
                // Keep local and user completion flags even if backend complete fails.
            }

            modal.closeModal();
            return true;
        } catch (error) {
            modal.closeModal();
            modal.showError(error?.message || 'No se pudo finalizar onboarding.');
            return false;
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
