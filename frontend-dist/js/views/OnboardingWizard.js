/**
 * Onboarding Wizard View
 * Initial business configuration before dashboard access
 */

import apiService from '../services/api.service.js';
import modal from '../components/Modal.js';

class OnboardingWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.businessTypes = [];
        this.plans = [
            { code: 'free', name: 'FREE', price: '$0', color: 'gray', features: ['Hasta 10 clientes', 'Hasta 20 citas', 'Ver clientes y citas', 'Ideal para pruebas'], limits: '10 clientes, 20 citas, lectura' },
            { code: 'basic', name: 'BASIC', price: '$29', color: 'blue', features: ['Hasta 500 clientes', 'Hasta 500 citas', 'CRUD completo', 'Servicios (50 max)', 'Reportes básicos'], limits: '500 clientes, 500 citas' },
            { code: 'plus', name: 'PLUS', price: '$79', color: 'purple', features: ['Hasta 2000 clientes', 'Hasta 2000 citas', 'Todas las funciones BASIC', 'Servicios (200 max)', 'Reportes avanzados', 'Exportar datos', 'Gestión de usuarios'], limits: '2000 clientes, 2000 citas' },
            { code: 'max', name: 'PRO MAX', price: '$149', color: 'indigo', features: ['Clientes ilimitados', 'Citas ilimitadas', 'Todas las funciones PLUS', 'Servicios ilimitados', 'Analytics avanzado', 'API completa', 'Soporte prioritario'], limits: 'Ilimitado' }
        ];
        this.roles = [
            { code: 'admin', label: 'Administrador', description: 'Acceso completo a todas las funciones. Gestiona el negocio y otros usuarios.' },
            { code: 'employee', label: 'Empleado', description: 'Acceso limitado. Necesita email del administrador para vincularse.' }
        ];
        this.formData = {
            business_type: '',
            business_name: '',
            custom_labels: {},
            has_pet_relationship: false,
            pet_fields_enabled: {},
            plan: 'basic',
            role: 'admin',
            admin_email: ''
        };
    }

    async render() {
        // Load business types
        await this.loadBusinessTypes();

        return `
            <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg shadow-2xl max-w-4xl w-full p-8">
                    <!-- Header -->
                    <div class="text-center mb-8">
                        <h1 class="text-3xl font-bold text-gray-800 mb-2">¡Bienvenido a AdminG!</h1>
                        <p class="text-gray-600">Configuremos tu negocio en 2 simples pasos</p>
                    </div>

                    <!-- Progress Bar -->
                    <div class="mb-8">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-medium text-gray-700">Paso ${this.currentStep} de ${this.totalSteps}</span>
                            <span class="text-sm text-gray-500">${Math.round((this.currentStep / this.totalSteps) * 100)}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                 style="width: ${(this.currentStep / this.totalSteps) * 100}%"></div>
                        </div>
                    </div>

                    <!-- Step Content -->
                    <div id="onboarding-content">
                        ${this.renderStepContent()}
                    </div>

                    <!-- Navigation Buttons -->
                    <div class="flex justify-between mt-8 pt-6 border-t">
                        <button id="btn-prev" 
                                class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                ${this.currentStep === 1 ? 'disabled' : ''}>
                            ← Anterior
                        </button>
                        <button id="btn-next" 
                                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            ${this.currentStep === this.totalSteps ? '✓ Finalizar' : 'Siguiente →'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderStepContent() {
        switch (this.currentStep) {
            case 1:
                return this.renderStep1();
            case 2:
                return this.renderStep2();
            case 3:
                return this.renderStep3();
            case 4:
                return this.renderStep4();
            case 5:
                return this.renderStep5();
            default:
                return '';
        }
    }

    renderStep1() {
        const businessTypeOptions = this.businessTypes.map(type => `
            <option value="${type.code}" ${this.formData.business_type === type.code ? 'selected' : ''}>
                ${type.label}
            </option>
        `).join('');

        return `
            <div class="space-y-6">
                <h2 class="text-2xl font-semibold text-gray-800 mb-4">Información Básica</h2>
                
                <!-- Business Type -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        ¿Qué tipo de negocio tienes? <span class="text-red-500">*</span>
                    </label>
                    <select id="business_type" 
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required>
                        <option value="">Selecciona tu tipo de negocio...</option>
                        ${businessTypeOptions}
                    </select>
                    <p class="mt-2 text-sm text-gray-500">
                        Esto nos ayudará a personalizar la aplicación para tu negocio
                    </p>
                </div>

                <!-- Business Name -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de tu negocio <span class="text-red-500">*</span>
                    </label>
                    <input type="text" 
                           id="business_name" 
                           value="${this.formData.business_name || ''}"
                           placeholder="Ej: Veterinaria San Francisco"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           required>
                </div>

                <!-- Pet Relationship -->
                <div class="bg-blue-50 p-4 rounded-lg">
                    <label class="flex items-center cursor-pointer">
                        <input type="checkbox" 
                               id="has_pet_relationship" 
                               ${this.formData.has_pet_relationship ? 'checked' : ''}
                               class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500">
                        <span class="ml-3 text-sm font-medium text-gray-700">
                            Mi negocio trabaja con mascotas
                        </span>
                    </label>
                    <p class="ml-8 mt-1 text-sm text-gray-500">
                        Activar campos para registrar información de mascotas
                    </p>
                </div>
            </div>
        `;
    }

    renderStep2() {
        const currentType = this.businessTypes.find(t => t.code === this.formData.business_type);
        const showPetFields = this.formData.has_pet_relationship;

        return `
            <div class="space-y-6">
                <h2 class="text-2xl font-semibold text-gray-800 mb-4">Personalización de Etiquetas</h2>
                <p class="text-gray-600 mb-6">
                    Personaliza cómo se llaman los elementos en tu negocio
                </p>

                <!-- Customer Label -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        ¿Cómo llamas a tus clientes?
                    </label>
                    <input type="text" 
                           id="label_customers" 
                           value="${this.formData.custom_labels?.customers || currentType?.default_labels?.customers || 'Cliente'}"
                           placeholder="Ej: Cliente, Paciente, Dueño"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <!-- Appointment Label -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        ¿Cómo llamas a tus citas/reservas?
                    </label>
                    <input type="text" 
                           id="label_appointments" 
                           value="${this.formData.custom_labels?.appointments || currentType?.default_labels?.appointments || 'Cita'}"
                           placeholder="Ej: Cita, Reserva, Turno"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                ${showPetFields ? `
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="font-medium text-gray-800 mb-3">Campos de Mascotas</h3>
                    <p class="text-sm text-gray-600 mb-3">Selecciona qué información quieres registrar de las mascotas:</p>
                    
                    <div class="space-y-2">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="pet_field_name" checked disabled
                                   class="w-4 h-4 text-green-600 rounded focus:ring-green-500">
                            <span class="ml-2 text-sm text-gray-700">Nombre (requerido)</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="pet_field_breed" checked
                                   class="w-4 h-4 text-green-600 rounded focus:ring-green-500">
                            <span class="ml-2 text-sm text-gray-700">Raza</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="pet_field_species" checked
                                   class="w-4 h-4 text-green-600 rounded focus:ring-green-500">
                            <span class="ml-2 text-sm text-gray-700">Tipo de animal</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="pet_field_color" checked
                                   class="w-4 h-4 text-green-600 rounded focus:ring-green-500">
                            <span class="ml-2 text-sm text-gray-700">Color</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="pet_field_birthdate"
                                   class="w-4 h-4 text-green-600 rounded focus:ring-green-500">
                            <span class="ml-2 text-sm text-gray-700">Fecha de nacimiento</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="pet_field_weight"
                                   class="w-4 h-4 text-green-600 rounded focus:ring-green-500">
                            <span class="ml-2 text-sm text-gray-700">Peso</span>
                        </label>
                    </div>

                    <!-- Pet Label -->
                    <div class="mt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            ¿Cómo llamas a las mascotas?
                        </label>
                        <input type="text" 
                               id="label_pets" 
                               value="${this.formData.custom_labels?.pets || currentType?.default_labels?.pets || 'Mascota'}"
                               placeholder="Ej: Mascota, Paciente, Animal"
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    </div>
                </div>
                ` : ''}

                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
                    <p class="text-sm text-yellow-700">
                        💡 <strong>Tip:</strong> Puedes cambiar estas configuraciones más tarde desde el dashboard
                    </p>
                </div>
            </div>
        `;
    }

    renderStep3() {
        return `
            <div class="space-y-6">
                <h2 class="text-2xl font-semibold text-gray-800 mb-2">Selecciona tu Plan</h2>
                <p class="text-gray-600 mb-8">Elige el plan que mejor se adapte a tus necesidades</p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${this.plans.map((plan, idx) => `
                        <label class="cursor-pointer">
                            <input type="radio" name="plan" value="${plan.code}" 
                                   ${this.formData.plan === plan.code ? 'checked' : ''}
                                   class="hidden" id="plan_${plan.code}">
                            <div class="p-6 border-2 rounded-lg transition-all ${this.formData.plan === plan.code ? `border-${plan.color}-500 bg-${plan.color}-50` : 'border-gray-200 hover:border-gray-300'}">
                                <div class="flex justify-between items-start mb-3">
                                    <h3 class="text-lg font-bold text-gray-800">${plan.name}</h3>
                                    <span class="text-2xl font-bold text-${plan.color}-600">${plan.price}<span class="text-sm">/mes</span></span>
                                </div>
                                <p class="text-xs text-gray-500 mb-4 font-medium">${plan.limits}</p>
                                <ul class="space-y-2">
                                    ${plan.features.map(feature => `
                                        <li class="flex items-center text-sm text-gray-700">
                                            <span class="text-${plan.color}-500 mr-2">✓</span>
                                            ${feature}
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        </label>
                    `).join('')}
                </div>

                <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
                    <p class="text-sm text-blue-700">
                        ℹ️ <strong>Nota:</strong> Puedes cambiar de plan en cualquier momento desde la configuración
                    </p>
                </div>
            </div>
        `;
    }

    renderStep4() {
        return `
            <div class="space-y-6">
                <h2 class="text-2xl font-semibold text-gray-800 mb-2">Selecciona tu Rol</h2>
                <p class="text-gray-600 mb-8">¿Eres el administrador o un empleado?</p>

                <div class="space-y-4">
                    ${this.roles.map(role => `
                        <label class="cursor-pointer">
                            <input type="radio" name="role" value="${role.code}" 
                                   ${this.formData.role === role.code ? 'checked' : ''}
                                   class="hidden" id="role_${role.code}">
                            <div class="p-6 border-2 rounded-lg transition-all ${this.formData.role === role.code ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}">
                                <div class="flex items-start">
                                    <div class="flex-1">
                                        <h3 class="text-lg font-bold text-gray-800">${role.label}</h3>
                                        <p class="text-sm text-gray-600 mt-1">${role.description}</p>
                                    </div>
                                    <div class="ml-4">
                                        ${role.code === 'admin' ? '<span class="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">Recomendado</span>' : ''}
                                    </div>
                                </div>
                            </div>
                        </label>
                    `).join('')}
                </div>

                ${this.formData.role === 'employee' ? `
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                        <p class="text-sm text-gray-700 mb-3 font-medium">Email del Administrador:</p>
                        <input type="email" 
                               id="admin_email" 
                               value="${this.formData.admin_email || ''}"
                               placeholder="email@empresa.com"
                               class="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                               required>
                        <p class="text-xs text-gray-500 mt-2">
                            Necesitamos el email del administrador para vincular tu cuenta
                        </p>
                    </div>
                ` : ''}

                <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
                    <p class="text-sm text-blue-700">
                        👥 <strong>Nota:</strong> Los administradores pueden agregar empleados después de configurar el negocio
                    </p>
                </div>
            </div>
        `;
    }

    renderStep5() {
        const planSelected = this.plans.find(p => p.code === this.formData.plan);
        const roleSelected = this.roles.find(r => r.code === this.formData.role);

        return `
            <div class="space-y-6">
                <h2 class="text-2xl font-semibold text-gray-800 mb-2">¡Revisa tu Configuración!</h2>
                <p class="text-gray-600 mb-6">Verifica que todo sea correcto antes de finalizar</p>

                <div class="space-y-4">
                    <!-- Business Info Summary -->
                    <div class="bg-blue-50 rounded-lg p-6">
                        <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                            <span class="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">1</span>
                            Información del Negocio
                        </h3>
                        <div class="ml-11 space-y-2 text-sm">
                            <p><span class="font-medium text-gray-700">Tipo:</span> <span class="text-gray-600">${this.businessTypes.find(t => t.code === this.formData.business_type)?.label || this.formData.business_type}</span></p>
                            <p><span class="font-medium text-gray-700">Nombre:</span> <span class="text-gray-600">${this.formData.business_name}</span></p>
                            <p><span class="font-medium text-gray-700">Mascotas:</span> <span class="text-gray-600">${this.formData.has_pet_relationship ? 'Sí' : 'No'}</span></p>
                        </div>
                    </div>

                    <!-- Labels Summary -->
                    <div class="bg-purple-50 rounded-lg p-6">
                        <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                            <span class="bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">2</span>
                            Personalizaciones
                        </h3>
                        <div class="ml-11 space-y-2 text-sm">
                            <p><span class="font-medium text-gray-700">Clientes:</span> <span class="text-gray-600">${this.formData.custom_labels?.customers || 'Cliente'}</span></p>
                            <p><span class="font-medium text-gray-700">Citas:</span> <span class="text-gray-600">${this.formData.custom_labels?.appointments || 'Cita'}</span></p>
                            ${this.formData.has_pet_relationship ? `<p><span class="font-medium text-gray-700">Mascotas:</span> <span class="text-gray-600">${this.formData.custom_labels?.pets || 'Mascota'}</span></p>` : ''}
                        </div>
                    </div>

                    <!-- Plan Summary -->
                    <div class="bg-indigo-50 rounded-lg p-6">
                        <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                            <span class="bg-indigo-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">3</span>
                            Plan: ${planSelected?.name} - ${planSelected?.price}/mes
                        </h3>
                        <div class="ml-11 space-y-2 text-sm">
                            <p class="text-gray-600">${planSelected?.limits}</p>
                        </div>
                    </div>

                    <!-- Role Summary -->
                    <div class="bg-green-50 rounded-lg p-6">
                        <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
                            <span class="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">4</span>
                            ${roleSelected?.label}
                        </h3>
                        <div class="ml-11 space-y-2 text-sm">
                            <p class="text-gray-600">${roleSelected?.description}</p>
                            ${this.formData.role === 'employee' ? `<p class="font-medium text-gray-700">Email del Admin: <span class="text-gray-600">${this.formData.admin_email}</span></p>` : ''}
                        </div>
                    </div>
                </div>

                <div class="bg-green-50 border-l-4 border-green-400 p-4 mt-6">
                    <p class="text-sm text-green-700">
                        ✓ Haz clic en "Finalizar" para completar la configuración y acceder al dashboard
                    </p>
                </div>
            </div>
        `;
    }
    }

    async loadBusinessTypes() {
        try {
            const response = await apiService.getBusinessTypes();
            this.businessTypes = response.types || [];
        } catch (error) {
            console.error('Error loading business types:', error);
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
        
        // Step 1 events
        document.getElementById('business_type')?.addEventListener('change', (e) => {
            this.formData.business_type = e.target.value;
        });
        document.getElementById('business_name')?.addEventListener('input', (e) => {
            this.formData.business_name = e.target.value;
        });
        document.getElementById('has_pet_relationship')?.addEventListener('change', (e) => {
            this.formData.has_pet_relationship = e.target.checked;
        });

        // Step 2 events
        document.getElementById('label_customers')?.addEventListener('input', (e) => {
            this.formData.custom_labels.customers = e.target.value;
        });
        document.getElementById('label_appointments')?.addEventListener('input', (e) => {
            this.formData.custom_labels.appointments = e.target.value;
        });
        document.getElementById('label_pets')?.addEventListener('input', (e) => {
            this.formData.custom_labels.pets = e.target.value;
        });

        // Pet fields checkboxes
        ['breed', 'species', 'color', 'birthdate', 'weight'].forEach(field => {
            document.getElementById(`pet_field_${field}`)?.addEventListener('change', (e) => {
                this.formData.pet_fields_enabled[field] = e.target.checked;
            });
        });

        // Step 3 events (Plan selection)
        this.plans.forEach(plan => {
            document.getElementById(`plan_${plan.code}`)?.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.formData.plan = plan.code;
                }
            });
        });

        // Step 4 events (Role selection)
        this.roles.forEach(role => {
            document.getElementById(`role_${role.code}`)?.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.formData.role = role.code;
                    // Refresh to show/hide admin email field
                    if (role.code === 'employee') {
                        setTimeout(() => {
                            document.getElementById('admin_email')?.addEventListener('input', (evt) => {
                                this.formData.admin_email = evt.target.value;
                            });
                        }, 0);
                    }
                }
            });
        });

        // Admin email input
        document.getElementById('admin_email')?.addEventListener('input', (e) => {
            this.formData.admin_email = e.target.value;
        });
    }

    async handleNext() {
        if (this.currentStep === 1) {
            // Validate Step 1
            if (!this.validateStep1()) {
                return;
            }
            this.currentStep = 2;
            await this.refresh();
        } else if (this.currentStep === 2) {
            this.currentStep = 3;
            await this.refresh();
        } else if (this.currentStep === 3) {
            // Step 3 - Plan already captured by radio button
            this.currentStep = 4;
            await this.refresh();
        } else if (this.currentStep === 4) {
            // Validate Step 4
            if (!this.validateStep4()) {
                return;
            }
            this.currentStep = 5;
            await this.refresh();
        } else if (this.currentStep === 5) {
            // Final step - save configuration
            await this.saveConfiguration();
        }
    }

    handlePrev() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.refresh();
        }
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
        this.formData.has_pet_relationship = document.getElementById('has_pet_relationship').checked;

        return true;
    }

    validateStep4() {
        if (this.formData.role === 'employee') {
            const adminEmail = document.getElementById('admin_email')?.value.trim();
            
            if (!adminEmail) {
                modal.showError('Por favor ingresa el email del administrador');
                return false;
            }

            // Simple email validation
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
                modal.showError('Por favor ingresa un email válido');
                return false;
            }

            this.formData.admin_email = adminEmail;
        }

        return true;
    }

    async saveConfiguration() {
        try {
            // Collect Step 2 data
            this.formData.custom_labels = {
                customers: document.getElementById('label_customers')?.value || 'Cliente',
                appointments: document.getElementById('label_appointments')?.value || 'Cita',
                pets: document.getElementById('label_pets')?.value || 'Mascota'
            };

            if (this.formData.has_pet_relationship) {
                this.formData.pet_fields_enabled = {
                    name: true,
                    breed: document.getElementById('pet_field_breed')?.checked || false,
                    species: document.getElementById('pet_field_species')?.checked || false,
                    color: document.getElementById('pet_field_color')?.checked || false,
                    birthdate: document.getElementById('pet_field_birthdate')?.checked || false,
                    weight: document.getElementById('pet_field_weight')?.checked || false,
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

            // Prepare data with plan and role
            const configData = {
                ...this.formData,
                plan: this.formData.plan,
                role: this.formData.role,
                admin_email: this.formData.admin_email || null
            };

            // Save or create configuration
            if (config) {
                await apiService.updateBusinessConfig(configData);
            } else {
                await apiService.createBusinessConfig(configData);
            }

            modal.closeModal();
            modal.showSuccess('¡Configuración guardada! Redirigiendo al dashboard...');

            // Save plan to user preferences if needed
            localStorage.setItem('user_plan', this.formData.plan);
            localStorage.setItem('user_role', this.formData.role);
            
            // Mark onboarding as complete and redirect
            localStorage.setItem('onboarding_completed', 'true');
            
            setTimeout(() => {
                window.location.hash = '#dashboard';
                window.location.reload();
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
}

export default new OnboardingWizard();
