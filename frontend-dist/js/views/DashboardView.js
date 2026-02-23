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
        const isAdmin = user?.role === 'admin';

        const roleLabel = this.getRoleLabel(user?.role);
        const roleBgColor = user?.role === 'admin' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                            user?.role === 'manager' ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';

        return `
            <!-- Header de Bienvenida Mejorado -->
            <div style="margin-bottom: 24px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 12px; padding: 24px; border: 1px solid rgba(102, 126, 234, 0.1); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;">
                    <div style="flex: 1;">
                        <h1 style="font-size: 32px; font-weight: 700; color: #1f2937; margin: 0 0 8px 0;">${greeting}</h1>
                        <p style="font-size: 14px; color: #6b7280; margin: 0 0 16px 0;">Bienvenido de vuelta a AdminG</p>
                        
                        <!-- Recuadro separado para Plan y Rol -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div style="background: white; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #667eea; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
                                <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Plan</div>
                                <div style="font-size: 16px; font-weight: 700; color: #667eea;">${user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : '-'}</div>
                            </div>
                            <div style="background: white; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #08a88a; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
                                <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Rol</div>
                                <div style="font-size: 16px; font-weight: 700; color: #08a88a;">${roleLabel}</div>
                            </div>
                        </div>

                        ${businessConfig?.business_name ? `
                            <div style="background: white; padding: 12px 16px; border-radius: 8px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
                                <span style="font-size: 24px;">${this.getEmojiForBusinessType(businessConfig.business_type)}</span>
                                <div>
                                    <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Negocio</div>
                                    <div style="font-size: 15px; font-weight: 700; color: #1f2937;">${businessConfig.business_name}</div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 72px; margin-bottom: 12px;">${this.getEmojiForBusinessType(businessConfig?.business_type)}</div>
                        ${isAdmin ? `
                            <button id="btnViewAsUser" style="display: inline-block; padding: 10px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); text-transform: uppercase; letter-spacing: 0.5px;">
                                👁️ Ver como Usuario
                            </button>
                        ` : ''}
                    </div>
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
                    <h2 class="card-title">Funciones Disponibles por Plan</h2>
                </div>
                <div class="card-body" id="planFeaturesBox">
                    <div style="padding: 12px; color: #7f8c8d;">Cargando funciones disponibles...</div>
                </div>
            </div>

            ${isAdmin || user?.role === 'manager' ? `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Configuración del Negocio</h2>
                    </div>
                    <div class="card-body" id="businessConfigBox">
                        <div style="padding: 12px; color: #7f8c8d;">Cargando configuración...</div>
                    </div>
                </div>
            ` : ''}

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
        
        // Solo cargar configuración de negocio para admin y manager
        const user = authService.getCurrentUser();
        if (user?.role === 'admin' || user?.role === 'manager') {
            await this.loadBusinessConfig();
        }
        
        this.attachEventListeners();
    }

    attachEventListeners() {
        const btnViewAsUser = document.getElementById('btnViewAsUser');
        if (btnViewAsUser) {
            btnViewAsUser.addEventListener('click', () => this.openUserPreviewModal());
        }
    }

    openUserPreviewModal() {
        const user = authService.getCurrentUser();
        const businessConfig = this.businessConfig;
        const roleLabel = this.getRoleLabel(user?.role);
        const roleDescription = this.getRoleDescription(user?.role);

        const planName = user?.plan === 'admin' ? 'MAX (Administrador)' : (user?.plan || 'free').toUpperCase();
        const planDescription = this.getPlanDescription(user?.plan);

        const modalContent = `
            <div style="max-width: 500px;">
                <h3 style="font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px;">Vista del Usuario: Especificaciones de Plan y Negocio</h3>
                
                <!-- Plan Section -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">PLAN ACTUAL</div>
                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">${planName}</div>
                    <div style="font-size: 13px; opacity: 0.95;">${planDescription}</div>
                </div>

                <!-- Role Section -->
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">ROL ASIGNADO</div>
                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">${roleLabel}</div>
                    <div style="font-size: 13px; opacity: 0.95;">${roleDescription}</div>
                </div>

                <!-- Business Config Section -->
                ${businessConfig?.business_name ? `
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">CONFIGURACIÓN DEL NEGOCIO</div>
                        <div>${this.getEmojiForBusinessType(businessConfig.business_type)} <strong>${businessConfig.business_name}</strong></div>
                        <div style="margin-top: 8px; font-size: 12px; opacity: 0.95;">
                            <div>Tipo: ${businessConfig.business_type?.toUpperCase()}</div>
                            <div>Etiqueta de Clientes: ${businessConfig.customer_label || 'Cliente'}</div>
                            <div>Etiqueta de Citas: ${businessConfig.appointment_label || 'Cita'}</div>
                            ${businessConfig.has_pet_relationship ? `<div>Etiqueta de Mascotas: ${businessConfig.pet_label || 'Mascota'}</div>` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- Features Section -->
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
                    <div style="font-size: 12px; font-weight: 700; color: #1f2937; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Funciones Disponibles</div>
                    <div id="userPreviewFeatures" style="font-size: 13px; color: #6b7280;"></div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;`;
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 24px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15); animation: slideIn 0.3s ease-out;">
                ${modalContent}
                <div style="display: flex; gap: 8px; margin-top: 24px;">
                    <button id="closeUserPreview" style="flex: 1; padding: 10px 16px; background: #e5e7eb; color: #1f2937; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Cerrar</button>
                    <button onclick="location.href='#/onboarding'" style="flex: 1; padding: 10px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s;">Editar Configuración</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('closeUserPreview').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Load features
        this.loadUserPreviewFeatures();
    }

    async loadUserPreviewFeatures() {
        try {
            const response = await apiService.getFeatures();
            const features = response.features || [];
            
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

            const container = document.getElementById('userPreviewFeatures');
            if (container) {
                container.innerHTML = featureLabels.map(label => `
                    <div style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="color: #10b981;">✓</span> ${label}
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading user preview features:', error);
        }
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
                    <div style="color: #e74c3c;">Error cargando configuración: ${error.message}</div>
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
                        Tiene relación con mascotas
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
                    <div style="color: #e74c3c; margin-top: 8px;">Error guardando configuración: ${error.message}</div>
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
                    <div style="color: #e74c3c; margin-top: 8px;">Error restaurando configuración: ${error.message}</div>
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

    getRoleLabel(role) {
        const roleLabels = {
            'admin': '🔑 Admin (Cuenta Maestra)',
            'manager': '👔 Manager (Dueño del Plan)',
            'team': '👥 Equipo',
            'viewer': '👥 Equipo'
        };
        return roleLabels[role] || role;
    }

    getRoleDescription(role) {
        const roleDescriptions = {
            'admin': '✓ Cuenta maestra con acceso total y control global',
            'manager': '✓ Dueño del plan con control de configuración, planes y equipo',
            'team': '✓ Cuenta de equipo con acceso limitado según permisos',
            'viewer': '✓ Cuenta de equipo con acceso limitado según permisos'
        };
        return roleDescriptions[role] || 'Rol personalizado';
    }

    getPlanDescription(plan) {
        const planDescriptions = {
            'free': 'Ideal para comenzar. Funciones básicas limitadas.',
            'basic': 'Plan recomendado. Incluye la mayoría de funciones.',
            'pro': 'Plan avanzado. Todas las funciones y reportes avanzados.',
            'admin': 'Plan MAX. Acceso completo a todas las funciones del sistema.'
        };
        return planDescriptions[plan] || 'Plan personalizado';
    }
}

export default new DashboardView();
