/**
 * Dashboard View
 * Responsabilidad: Renderizar vista principal del dashboard
 * Principio SOLID: Single Responsibility
 */

import authService from '../services/auth.service.js';
import apiService from '../services/api.service.js';

export class DashboardView {
    constructor() {
        this.stats = {
            customers: 0,
            appointments: 0,
            inventory: 0,
            revenue: 0
        };
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
        const greeting = this.getGreeting();
        const businessConfig = this.businessConfig;

        return `
            <!-- Personalized Greeting Header -->
            <div class="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                <div class="flex justify-between items-start">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-800">${greeting}</h1>
                        <p class="text-gray-600 mt-1">Bienvenido de vuelta a AdminG</p>
                        ${businessConfig?.business_name ? `
                            <div class="mt-3 flex items-center gap-2">
                                <span class="text-2xl">${businessConfig.business_type || '📋'}</span>
                                <div>
                                    <p class="text-sm text-gray-600">Negocio</p>
                                    <p class="font-semibold text-gray-800">${businessConfig.business_name}</p>
                                </div>
                            </div>
                        ` : ''}
                        <div class="mt-4 flex gap-4">
                            <div class="bg-white px-3 py-2 rounded text-sm border border-gray-200">
                                <span class="text-gray-600">Plan:</span> <span class="font-semibold text-blue-600">${user?.plan?.toUpperCase() || '-'}</span>
                            </div>
                            <div class="bg-white px-3 py-2 rounded text-sm border border-gray-200">
                                <span class="text-gray-600">Rol:</span> <span class="font-semibold text-green-600">${user?.role?.toUpperCase() || '-'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-6xl">${this.getEmojiForBusinessType(businessConfig?.business_type)}</div>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Clientes Totales</h3>
                    <div class="value" id="statCustomers">${this.stats.customers}</div>
                </div>
                <div class="stat-card">
                    <h3>Citas Hoy</h3>
                    <div class="value" id="statAppointments">${this.stats.appointments}</div>
                </div>
                <div class="stat-card">
                    <h3>Productos</h3>
                    <div class="value" id="statInventory">${this.stats.inventory}</div>
                </div>
                <div class="stat-card">
                    <h3>Ingresos Mes</h3>
                    <div class="value" id="statRevenue">$0.00</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Funciones disponibles por plan</h2>
                </div>
                <div class="card-body" id="planFeaturesBox">
                    <div style="padding: 12px; color: #7f8c8d;">Cargando funciones disponibles...</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Configuracion del negocio</h2>
                </div>
                <div class="card-body" id="businessConfigBox">
                    <div style="padding: 12px; color: #7f8c8d;">Cargando configuracion...</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Información de la Cuenta</h2>
                </div>
                <div class="card-body">
                    <table class="info-table">
                        <tr>
                            <th>Email</th>
                            <td>${user?.email || '-'}</td>
                        </tr>
                        <tr>
                            <th>Plan</th>
                            <td><span class="badge badge-info">${user?.plan?.toUpperCase() || '-'}</span></td>
                        </tr>
                        <tr>
                            <th>Rol</th>
                            <td><span class="badge badge-success">${user?.role?.toUpperCase() || '-'}</span></td>
                        </tr>
                        <tr>
                            <th>Tipo de Negocio</th>
                            <td>${user?.business_type || 'No especificado'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;
    }

    async init() {
        await this.loadStats();
        await this.loadFeatures();
        await this.loadBusinessConfig();
    }

    async loadStats() {
        try {
            const [customersData, inventoryData, appointmentsData, paymentsData] = await Promise.allSettled([
                apiService.getCustomers(),
                apiService.getInventoryItems(),
                apiService.getAppointments(),
                apiService.getPayments()
            ]);

            // Customers
            if (customersData.status === 'fulfilled' && Array.isArray(customersData.value)) {
                this.stats.customers = customersData.value.length || 0;
                this.updateStat('statCustomers', this.stats.customers);
            }

            // Inventory
            if (inventoryData.status === 'fulfilled' && Array.isArray(inventoryData.value)) {
                this.stats.inventory = inventoryData.value.length || 0;
                this.updateStat('statInventory', this.stats.inventory);
            }

            // Appointments (count for today)
            if (appointmentsData.status === 'fulfilled' && Array.isArray(appointmentsData.value)) {
                this.stats.appointments = appointmentsData.value.length || 0;
                this.updateStat('statAppointments', this.stats.appointments);
            }

            // Revenue calculation
            if (paymentsData.status === 'fulfilled' && Array.isArray(paymentsData.value)) {
                this.stats.revenue = paymentsData.value.reduce((sum, p) => sum + (p.amount || 0), 0);
                this.updateStat('statRevenue', this.stats.revenue);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    updateStat(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            if (elementId === 'statRevenue') {
                // Format as currency with proper formatting
                element.textContent = '$' + parseFloat(value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                element.textContent = value;
            }
        }
    }

    async loadFeatures() {
        try {
            const response = await apiService.getFeatures();
            const features = response.features || [];
            const limits = response.limits || {};
            const plan = response.plan || 'free';

            const featureTranslations = {
                'view inventory': 'Ver inventario',
                'view reports': 'Ver reportes',
                'view customers': 'Ver clientes',
                'create products': 'Crear productos',
                'edit products': 'Editar productos',
                'edit appointments': 'Editar citas',
                'create appointments': 'Crear citas',
                'view team': 'Ver equipo',
                'edit customers': 'Editar clientes',
                'manage team users': 'Gestionar equipo',
                'view appointments': 'Ver citas',
                'create payments': 'Crear pagos',
                'create customers': 'Crear clientes',
                'view payments': 'Ver pagos',
                'use cashregister': 'Usar caja registradora'
            };

            const featureLabels = features.map(f => {
                const label = f.replace(/_/g, ' ').toLowerCase();
                return featureTranslations[label] || f.replace(/_/g, ' ');
            });

            const planName = plan === 'admin' ? 'MAX (Administrador)' : plan.toUpperCase();
            const container = document.getElementById('planFeaturesBox');

            if (container) {
                container.innerHTML = `
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <div style="color: white; font-size: 14px; margin-bottom: 8px;">Tu plan actual</div>
                        <div style="color: white; font-size: 24px; font-weight: bold;">${planName}</div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong style="color: #2c3e50;">✨ Funciones disponibles:</strong>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;">
                        ${featureLabels.map(label => `
                            <div style="background: #f8f9fa; border-left: 3px solid #667eea; padding: 10px; border-radius: 4px; font-size: 13px;">
                                <span style="color: #28a745;">✓</span> ${label}
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 16px; padding: 12px; background: #e3f2fd; border-radius: 4px; font-size: 12px; color: #1976d2;">
                        <strong>Límites:</strong> Equipo: ${limits.team_members || 1} miembros | Clientes: ${limits.customers === 0 ? 'Ilimitados' : limits.customers}
                    </div>
                `;
            }
        } catch (error) {
            const container = document.getElementById('planFeaturesBox');
            if (container) {
                container.innerHTML = `
                    <div style="color: #e74c3c;">Error cargando funciones: ${error.message}</div>
                `;
            }
        }
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
                    <label>Tipo de negocio</label>
                    <select name="business_type" required>
                        ${typeOptions}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre del negocio</label>
                        <input type="text" name="business_name" value="${config.business_name || ''}">
                    </div>
                    <div class="form-group">
                        <label>Etiqueta de clientes</label>
                        <input type="text" name="customer_label" value="${config.customer_label || 'Cliente'}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Etiqueta de citas</label>
                        <input type="text" name="appointment_label" value="${config.appointment_label || 'Cita'}">
                    </div>
                    <div class="form-group">
                        <label>Etiqueta de mascotas</label>
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
                    <label>Campos de mascotas</label>
                    <div class="checkbox-grid">
                        ${petFieldsHtml}
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Guardar</button>
                    <button type="button" class="btn" id="btnResetBusinessConfig">Restaurar defaults</button>
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
                    <div style="color: #e74c3c; margin-top: 8px;">Error guardando: ${error.message}</div>
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
                    <div style="color: #e74c3c; margin-top: 8px;">Error restaurando: ${error.message}</div>
                `);
            }
        }
    }

    getGreeting() {
        const user = authService.getCurrentUser();
        const hour = new Date().getHours();
        let greeting = '';

        if (hour < 12) {
            greeting = 'Buenos días';
        } else if (hour < 18) {
            greeting = 'Buenas tardes';
        } else {
            greeting = 'Buenas noches';
        }

        const firstName = user?.email?.split('@')[0]?.split('.')[0] || 'Usuario';
        const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

        return `${greeting}, ${capitalizedName}`;
    }

    getEmojiForBusinessType(businessType) {
        const emojiMap = {
            'veterinaria': '🏥',
            'barberia': '💈',
            'spa': '💆',
            'clinica': '⚕️',
            'salon': '💅',
            'peluqueria': '✂️',
            'farmacia': '💊',
            'dental': '🦷',
            'odontologia': '🦷',
            'otro': '📋'
        };

        return emojiMap[businessType?.toLowerCase()] || '📋';
    }
}

export default new DashboardView();
