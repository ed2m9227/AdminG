/**
 * Onboarding Wizard View
 * Initial business configuration before dashboard access
 */

import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import modal from '../components/Modal.js';

class OnboardingWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.businessTypes = [];
        this.plans = [
            { code: 'free', name: 'GRATUITO', price: 0, priceCOP: 0, color: 'gray', features: ['1 usuario', 'Funciones básicas', 'Solo lectura', 'Ideal para pruebas'], limits: '1 usuario, solo lectura', nequiLink: null },
            { code: 'starter', name: 'STARTER', price: 10, priceCOP: 39900, color: 'blue', features: ['Hasta 5 usuarios', 'Hasta 100 clientes', 'Hasta 200 citas', 'CRUD completo', 'Reportes básicos'], limits: '5 usuarios, 100 clientes', nequiLink: 'https://buy.nequi.com.co/AdminG-Starter' },
            { code: 'pro', name: 'PRO', price: 25, priceCOP: 99900, color: 'purple', features: ['Hasta 25 usuarios', 'Hasta 1000 clientes', 'Citas ilimitadas', 'Reportes avanzados', 'Exportar datos', 'API acceso'], limits: '25 usuarios, 1000 clientes', nequiLink: 'https://buy.nequi.com.co/AdminG-Pro' },
            { code: 'max', name: 'MAX', price: 62, priceCOP: 249900, color: 'indigo', features: ['Hasta 100 usuarios', 'Clientes ilimitados', 'Citas ilimitadas', 'Analytics avanzado', 'API completa', 'IA integrada', 'Soporte prioritario'], limits: 'Ilimitado', nequiLink: 'https://buy.nequi.com.co/AdminG-Max' }
        ];
        this.formData = {
            business_type: '',
            business_name: '',
            plan: 'starter',
            role: 'admin'
        };
    }

    async render() {
        // Load business types BEFORE rendering - don't render without them
        try {
            await this.loadBusinessTypes();
            if (!this.businessTypes || this.businessTypes.length === 0) {
                console.warn('⚠️ No business types available');
                // Show fallback types if API fails
                this.businessTypes = [
                    { code: 'veterinaria', label: 'Veterinaria', icon: '🐾', supports_pets: true },
                    { code: 'barberia', label: 'Barbería', icon: '✂️', supports_pets: false },
                    { code: 'spa', label: 'Spa / Estética', icon: '💆', supports_pets: false },
                    { code: 'clinica', label: 'Clínica', icon: '⚕️', supports_pets: false },
                    { code: 'otro', label: 'Otro', icon: '📋', supports_pets: false }
                ];
            }
        } catch (error) {
            console.error('❌ Error loading business types:', error);
            // Use fallback types
            this.businessTypes = [
                { code: 'veterinaria', label: 'Veterinaria', icon: '🐾', supports_pets: true },
                { code: 'barberia', label: 'Barbería', icon: '✂️', supports_pets: false },
                { code: 'spa', label: 'Spa / Estética', icon: '💆', supports_pets: false },
                { code: 'clinica', label: 'Clínica', icon: '⚕️', supports_pets: false },
                { code: 'otro', label: 'Otro', icon: '📋', supports_pets: false }
            ];
        }
        
        // Get current user role (already loaded by authService)
        const user = authService.getCurrentUser();
        this.formData.role = user?.role || 'admin';

        // Si es Team, ajustar total de pasos
        if (this.formData.role === 'team') {
            this.totalSteps = 1;
        }

        return `
            <div class="onboarding-wrapper">
                <div class="onboarding-card">
                    <!-- Header -->
                    <div class="onboarding-header">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h1 class="onboarding-title">¡Bienvenido a AdminG!</h1>
                                <p class="onboarding-subtitle">${this.formData.role === 'team' ? 'Cuasi-configuración de tu cuenta de equipo' : 'Configuremos tu negocio en 3 pasos simples'}</p>
                                <small style="color: #666; font-size: 12px;">
                                    Tu rol: <strong>${this.getRoleLabel(this.formData.role)}</strong>
                                </small>
                            </div>
                            <button id="btn-logout" title="Volver a Login (Cerrar Sesión)" style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 12px; cursor: pointer; color: #6b7280; font-size: 16px; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">
                                ✕
                            </button>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="progress-container">
                        <div class="progress-info">
                            <span class="progress-step">Paso ${this.currentStep} de ${this.totalSteps}</span>
                            <span class="progress-percent">${Math.round((this.currentStep / this.totalSteps) * 100)}%</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${(this.currentStep / this.totalSteps) * 100}%"></div>
                        </div>
                    </div>

                    <!-- Step Content -->
                    <div id="onboarding-content">
                        ${this.renderStepContent()}
                    </div>

                    <!-- Navigation Buttons -->
                    <div class="nav-buttons">
                        <button id="btn-prev" class="btn btn-prev" ${this.currentStep === 1 ? 'disabled' : ''}>
                            ← Anterior
                        </button>
                        <button id="btn-next" class="btn btn-next">
                            ${this.currentStep === this.totalSteps ? '✓ Finalizar' : 'Siguiente →'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderStepContent() {
        // Si es Team, mostrar solo confirmación simplificada
        if (this.formData.role === 'team') {
            return this.renderTeamOnboarding();
        }

        switch (this.currentStep) {
            case 1:
                return this.renderStep1();
            case 2:
                return this.renderStep2();
            case 3:
                return this.renderStep3();
            default:
                return '';
        }
    }

    renderTeamOnboarding() {
        return `
            <div class="step-content">
                <h2 class="step-title">¡Bienvenido a tu Cuenta de Equipo!</h2>
                <p class="step-subtitle">Tu acceso ha sido configurado por el administrador</p>

                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <div class="info-box info-box-blue" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 8px; border: none;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.6;">
                            <strong>📌 Información Importante:</strong><br><br>
                            Tu cuenta de equipo funciona bajo la configuración del administrador del negocio. Esto significa:
                        </p>
                    </div>

                    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div style="margin-bottom: 12px;">
                            <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">✓ Plan Heredado</div>
                            <div style="font-size: 13px; color: #6b7280;">Tu plan se determina según la suscripción del administrador. Tendrás acceso a las funciones permitidas para tu rol.</div>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">✓ Acceso Limitado</div>
                            <div style="font-size: 13px; color: #6b7280;">Como miembro del equipo, tu acceso está limitado según el rol asignado. Contacta al administrador si necesitas más permisos.</div>
                        </div>
                    </div>

                    <!-- Summary Card for Team -->
                    <div class="summary-card role" style="background: linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%); border-left: 4px solid #667eea; padding: 16px; border-radius: 8px;">
                        <span class="summary-label" style="color: #667eea; font-weight: 600;">👨‍💼 Tu Rol: Empleado (Team)</span>
                        <small style="display: block; margin-top: 8px; color: #6b7280;">Puedes comenzar a usar AdminG inmediatamente. El administrador puede cambiar tus permisos en cualquier momento.</small>
                    </div>

                    <div class="info-box info-box-green" style="background: #d1fae5; color: #065f46; padding: 12px; border-radius: 8px; border: 1px solid #6ee7b7; font-size: 12px;">
                        ✓ <strong>Lista para comenzar:</strong> Tu cuenta está completamente configurada. ¡Accede al dashboard y comienza a trabajar!
                    </div>
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
                <h2 class="step-title">Información de tu Negocio</h2>
                <p class="step-subtitle">Cuéntanos sobre tu negocio</p>
                
                <!-- Business Type -->
                <div class="form-group">
                    <label class="form-label">
                        Tipo de negocio <span class="required">*</span>
                    </label>
                    <select id="business_type" class="form-select" required>
                        <option value="">Selecciona tu tipo de negocio...</option>
                        ${businessTypeOptions}
                    </select>
                    <p class="form-help-text">
                        Las etiquetas y campos se configurarán automáticamente según tu tipo de negocio
                    </p>
                </div>

                <!-- Business Name -->
                <div class="form-group">
                    <label class="form-label">
                        Nombre de tu negocio <span class="required">*</span>
                    </label>
                    <input type="text" 
                           id="business_name" 
                           value="${this.formData.business_name || ''}"
                           placeholder="Ej: Veterinaria San Francisco, Barbería El Corte"
                           class="form-input"
                           required>
                </div>
            </div>
        `;
    }

    renderStep2() {
        return `
            <div class="step-content">
                <h2 class="step-title">Selecciona tu Plan</h2>
                <p class="step-subtitle">Elige el plan que mejor se adapte a tus necesidades</p>

                <div class="plan-grid">
                    ${this.plans.map(plan => `
                        <label class="plan-card-wrapper">
                            <input type="radio" name="plan" value="${plan.code}" 
                                   ${this.formData.plan === plan.code ? 'checked' : ''}
                                   id="plan_${plan.code}">
                            <div class="plan-card plan-card-content ${plan.code}">
                                <div class="plan-price-header">
                                    <h3 class="plan-name">${plan.name}</h3>
                                    <div class="plan-price">${plan.price === 0 ? 'GRATIS' : `$${plan.priceCOP.toLocaleString('es-CO')}`}<span class="plan-price-period">/mes</span></div>
                                </div>
                                <p class="plan-limits">${plan.limits}</p>
                                <ul class="plan-features">
                                    ${plan.features.map(feature => `
                                        <li>✓ ${feature}</li>
                                    `).join('')}
                                </ul>
                                ${plan.nequiLink ? `
                                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                                        <a href="${plan.nequiLink}" target="_blank" class="btn btn-next" style="display: inline-block; width: 100%; text-align: center; text-decoration: none; padding: 8px;">
                                            💳 Pagar con Nequi
                                        </a>
                                    </div>
                                ` : ''}
                            </div>
                        </label>
                    `).join('')}
                </div>

                <div class="info-box info-box-blue">
                    <p>ℹ️ <strong>Nota:</strong> Al seleccionar un plan de pago, serás redirigido a Nequi para completar la compra. Puedes cambiar de plan en cualquier momento.</p>
                </div>
            </div>
        `;
    }

    renderStep3() {
        const selectedType = this.businessTypes.find(t => t.code === this.formData.business_type);
        const selectedPlan = this.plans.find(p => p.code === this.formData.plan);

        return `
            <div class="step-content">
                <h2 class="step-title">¡Confirma tu Configuración!</h2>
                <p class="step-subtitle">Verifica que todo sea correcto antes de comenzar</p>

                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <!-- Business Info Summary -->
                    <div class="summary-card info">
                        <div class="summary-card-header">
                            <span class="summary-step-number">1</span>
                            Información del Negocio
                        </div>
                        <div class="summary-content">
                            <div class="summary-item">
                                <span class="summary-label">Tipo:</span>
                                <span class="summary-value">${selectedType?.icon || ''} ${selectedType?.label || this.formData.business_type}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Nombre:</span>
                                <span class="summary-value">${this.formData.business_name}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Mascotas:</span>
                                <span class="summary-value">${selectedType?.supports_pets ? 'Activado automáticamente' : 'No aplica'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Plan Summary -->
                    <div class="summary-card plan">
                        <div class="summary-card-header">
                            <span class="summary-step-number">2</span>
                            Plan Seleccionado
                        </div>
                        <div class="summary-content">
                            <div class="summary-item">
                                <span class="summary-label">Plan:</span>
                                <span class="summary-value">${selectedPlan?.name} - ${selectedPlan?.price === 0 ? 'GRATIS' : `$${selectedPlan?.priceCOP.toLocaleString('es-CO')}/mes`}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Límites:</span>
                                <span class="summary-value">${selectedPlan?.limits}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Role Summary -->
                    <div class="summary-card role" style="background: linear-gradient(135deg, #667eea15, #764ba215); border-left: 4px solid #667eea;">
                        <div class="summary-card-header">
                            <span class="summary-step-number">👤</span>
                            Tu Rol en el Sistema
                        </div>
                        <div class="summary-content">
                            <div class="summary-item">
                                <span class="summary-label">Rol Asignado:</span>
                                <span class="summary-value">${this.getRoleLabel(this.formData.role)}</span>
                            </div>
                            <div class="summary-item" style="grid-column: 1 / -1;">
                                <small style="color: #666; font-size: 11px;">
                                    ${this.getRoleDescription(this.formData.role)}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                ${this.formData.plan !== 'free' && selectedPlan?.nequiLink ? `
                    <div class="info-box info-box-yellow">
                        <p><strong>⚠️ Último paso:</strong> Después de confirmar, podrás completar el pago a través de Nequi. Tu cuenta quedará activa una vez confirmado el pago.</p>
                        <a href="${selectedPlan.nequiLink}" target="_blank" class="btn btn-next" style="display: inline-block; margin-top: 12px; text-decoration: none;">
                            💳 Ir a Pagar con Nequi
                        </a>
                    </div>
                ` : ''}

                <div class="info-box info-box-green">
                    <p>✓ Haz clic en "Finalizar" para completar la configuración${this.formData.plan !== 'free' ? ' y proceder al pago' : ''}</p>
                </div>
            </div>
        `;
    }

    async loadBusinessTypes() {
        try {
            const response = await apiService.getBusinessTypes();
            // Response is array directly from public endpoint
            this.businessTypes = Array.isArray(response) ? response : (response.types || []);
        } catch (error) {
            console.error('Error loading business types:', error);
            // Fallback to hardcoded types
            this.businessTypes = [
                { code: 'veterinaria', label: 'Veterinaria' },
                { code: 'barberia', label: 'Barbería' },
                { code: 'spa', label: 'Spa / Estética' },
                { code: 'clinica', label: 'Clínica' },
                { code: 'otro', label: 'Otro' }
            ];
        }
    }

    attachEvents() {
        document.getElementById('btn-next')?.addEventListener('click', () => this.handleNext());
        document.getElementById('btn-prev')?.addEventListener('click', () => this.handlePrev());
        document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());
        
        // Step 1 events - Business info
        document.getElementById('business_type')?.addEventListener('change', (e) => {
            this.formData.business_type = e.target.value;
        });
        document.getElementById('business_name')?.addEventListener('input', (e) => {
            this.formData.business_name = e.target.value;
        });

        // Step 2 events - Plan selection
        this.plans.forEach(plan => {
            document.getElementById(`plan_${plan.code}`)?.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.formData.plan = plan.code;
                }
            });
        });

        // Step 3 - No events needed (confirmation view only)
    }

    async handleNext() {
        // Si es Team, saltar directamente a salvar configuración
        if (this.formData.role === 'team') {
            await this.saveConfiguration();
            return;
        }

        if (this.currentStep === 1) {
            // Validate Step 1 - Business info
            if (!this.validateStep1()) {
                return;
            }
            this.currentStep = 2;
            await this.refresh();
        } else if (this.currentStep === 2) {
            // Validate Step 2 - Plan selection
            if (!this.formData.plan) {
                modal.showError('Por favor selecciona un plan');
                return;
            }
            this.currentStep = 3;
            await this.refresh();
        } else if (this.currentStep === 3) {
            // Final step - save configuration
            await this.saveConfiguration();
        }
    }

    handlePrev() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.refresh();
        } else if (this.currentStep === 1) {
            // En paso 1, "Anterior" significa volver a login (cerrar sesión)
            this.handleLogout();
        }
    }

    handleLogout() {
        // Confirm logout
        if (!confirm('¿Deseas cerrar sesión y volver a login?')) {
            return;
        }

        // Clear auth data and localStorage completely
        authService.logout();
        // Remove ALL onboarding-related flags to ensure fresh start
        localStorage.removeItem('onboarding_completed');
        localStorage.removeItem('onboarding_user_email');
        localStorage.removeItem('user_plan');
        localStorage.removeItem('user_role');
        localStorage.removeItem('currentBusinessType'); // If any temp data
        
        console.log('✓ Session cleared, redirecting to login...');
        // Navigate to login
        window.location.hash = '#login';
    }

    validateStep1() {
        const businessType = document.getElementById('business_type').value;
        const businessName = document.getElementById('business_name').value.trim();

        if (!businessType) {
            modal.showError('Por favor selecciona el tipo de negocio');
            return false;
        }

        if (!businessName) {
            modal.showError('Por favor ingresa el nombre de tu negocio');
            return false;
        }

        this.formData.business_type = businessType;
        this.formData.business_name = businessName;

        return true;
    }

    async saveConfiguration() {
        try {
            // Find selected business type to get default labels
            const selectedType = this.businessTypes.find(t => t.code === this.formData.business_type);
            
            // Auto-apply labels from business type
            this.formData.custom_labels = {
                customers: selectedType?.default_label_customers || 'Cliente',
                appointments: selectedType?.default_label_appointments || 'Cita',
                pets: selectedType?.default_label_pets || 'Mascota'
            };

            // Auto-detect pet relationship from business type
            this.formData.has_pet_relationship = selectedType?.supports_pets || false;

            // Set default pet fields if pets are supported
            if (this.formData.has_pet_relationship) {
                this.formData.pet_fields_enabled = {
                    name: true,
                    breed: true,
                    species: true,
                    color: true,
                    birthdate: false,
                    weight: false,
                };
            }

            modal.showLoading('Guardando configuración...');

            // Try to get existing config
            let config;
            try {
                config = await apiService.getBusinessConfig();
            } catch (error) {
                config = null;
            }

            // Prepare data with plan and role from user
            const configData = {
                ...this.formData,
                plan: this.formData.plan,
                role: this.formData.role  // Use the role from current user
            };

            console.log('💾 Saving configuration:', configData);

            // Save or create configuration
            if (config) {
                console.log('📝 Updating existing config with plan:', this.formData.plan);
                await apiService.updateBusinessConfig(configData);
            } else {
                console.log('📝 Creating new config with plan:', this.formData.plan);
                await apiService.createBusinessConfig(configData);
            }

            modal.closeModal();
            modal.showSuccess('¡Configuración guardada! Redirigiendo al dashboard...');

            // Save plan and role to user preferences
            localStorage.setItem('user_plan', this.formData.plan);
            localStorage.setItem('user_role', this.formData.role);
            
            console.log('✓ Saved to localStorage - plan:', this.formData.plan);
            
            // Mark onboarding as complete in localStorage
            localStorage.setItem('onboarding_completed', 'true');
            
            // Mark onboarding as complete in backend
            try {
                await apiService.post('/users/me/complete-onboarding', {});
                console.log('✅ Onboarding marked as completed in backend');
            } catch (error) {
                console.error('⚠️ Failed to update onboarding status in backend:', error);
                // Continue anyway, localStorage will work for now
            }
            
            // Navigate to dashboard without reloading
            setTimeout(async () => {
                const router = (await import('../utils/router.js')).default;
                await router.navigate('dashboard');
            }, 1500);

        } catch (error) {
            console.error('Error saving configuration:', error);
            modal.closeModal();
            modal.showError('Error al guardar la configuración: ' + (error.message || 'Error desconocido'));
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
            'team': '👨‍💼 Empleado (Team)',
            'viewer': '👁️ Empleado (Solo Ver)',
            'manager': '👔 Manager (Gestionar)',
            'admin': '🔑 Administrador (Control Total)'
        };
        return roleLabels[role] || role;
    }

    getRoleDescription(role) {
        const roleDescriptions = {
            'team': '✓ Cuenta de equipo con acceso restringido. Tu administrador controla tus permisos y plan.',
            'viewer': '✓ Podrás ver clientes, citas y reportes básicos. Ideal para empleados que consultan información.',
            'manager': '✓ Podrás crear y editar clientes, citas, y gestionar el día a día. Perfecto para gerentes y supervisores.',
            'admin': '✓ Acceso completo: gestión de usuarios, planes, reportes avanzados y todas las funcionalidades del sistema.'
        };
        return roleDescriptions[role] || 'Rol personalizado';
    }
}

export default new OnboardingWizard();
