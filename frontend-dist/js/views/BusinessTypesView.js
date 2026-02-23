/**
 * Business Types Management View
 * Admin panel para gestionar tipos de negocio y visualizar
 * cómo se vería la configuración automática
 */

import apiService from '../services/api.service.js';
import modal from '../components/Modal.js';

export class BusinessTypesView {
    constructor() {
        this.businessTypes = [];
        this.selectedType = null;
        this.editingType = null;
    }

    render() {
        return `
            <div id="businessTypesContainer" class="business-types-view">
                <div class="admin-header">
                    <h2>🏢 Gestión de Tipos de Negocio</h2>
                    <p class="admin-subtitle">Configura y visualiza la automática para cada tipo de negocio</p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                    <!-- PANEL IZQUIERDO: Lista de Tipos -->
                    <div class="card business-types-list">
                        <div class="card-header">
                            <h3>Tipos de Negocio</h3>
                            <button class="btn btn-sm btn-success" id="addBusinessTypeBtn">+ Nuevo</button>
                        </div>
                        <div class="card-body" id="businessTypesList" style="max-height: 600px; overflow-y: auto;">
                            <!-- Se llena con JavaScript -->
                        </div>
                    </div>

                    <!-- PANEL DERECHO: Preview y Edición -->
                    <div id="previewPanel">
                        <div class="card business-type-preview">
                            <div class="card-header">
                                <h3 id="previewTitle">Selecciona un tipo de negocio</h3>
                            </div>
                            <div class="card-body" id="previewContent" style="min-height: 400px;">
                                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">
                                    <div style="text-align: center;">
                                        <div style="font-size: 48px; margin-bottom: 15px;">👈</div>
                                        <p>Selecciona un tipo de negocio para ver la vista previa de configuración automática</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            // Cargar tipos de negocio del backend
            const response = await apiService.getBusinessTypes();
            this.businessTypes = Array.isArray(response) ? response : (response.types || []);
            
            // Si no hay tipos, crear los por defecto
            if (this.businessTypes.length === 0) {
                this.createDefaultTypes();
            }

            this.renderBusinessTypesList();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error loading business types:', error);
            modal.showError('Error al cargar tipos de negocio');
        }
    }

    renderBusinessTypesList() {
        const container = document.getElementById('businessTypesList');
        if (!container) return;

        container.innerHTML = this.businessTypes.map((type, idx) => `
            <div class="business-type-item ${this.selectedType?.code === type.code ? 'active' : ''}" 
                 data-index="${idx}">
                <div class="bt-item-header">
                    <span class="bt-icon">${type.icon || '📋'}</span>
                    <span class="bt-label">${type.label}</span>
                </div>
                <div class="bt-item-meta">
                    <span class="badge ${type.supports_pets ? 'badge-success' : 'badge-gray'}">
                        ${type.supports_pets ? '🐾 Con Mascotas' : 'Sin Mascotas'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    renderPreview(businessType) {
        this.selectedType = businessType;
        
        const previewContent = document.getElementById('previewContent');
        const previewTitle = document.getElementById('previewTitle');
        
        if (!previewContent) return;

        previewTitle.textContent = `${businessType.icon} ${businessType.label}`;

        previewContent.innerHTML = `
            <div class="business-type-detail">
                <!-- Información General -->
                <div class="preview-section">
                    <h4>📋 Información General</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Código</label>
                            <input type="text" value="${businessType.code}" readonly class="form-input-readonly">
                        </div>
                        <div class="info-item">
                            <label>Icono</label>
                            <input type="text" value="${businessType.icon || '📋'}" id="typeIcon" class="form-input">
                        </div>
                    </div>
                    <div class="info-item">
                        <label>Descripción</label>
                        <textarea id="typeDescription" class="form-input" style="resize: vertical; min-height: 60px;">${businessType.description || ''}</textarea>
                    </div>
                </div>

                <!-- Configuración Automática -->
                <div class="preview-section">
                    <h4>🔧 Configuración Automática Aplicada</h4>
                    <div class="auto-config-grid">
                        <div class="config-item">
                            <label>Etiqueta para Clientes/Pacientes</label>
                            <div class="config-value">
                                <span class="badge badge-info">${businessType.default_label_customers}</span>
                            </div>
                        </div>
                        <div class="config-item">
                            <label>Etiqueta para Citas/Reservas</label>
                            <div class="config-value">
                                <span class="badge badge-info">${businessType.default_label_appointments}</span>
                            </div>
                        </div>
                        ${businessType.supports_pets ? `
                            <div class="config-item">
                                <label>Etiqueta para Mascotas</label>
                                <div class="config-value">
                                    <span class="badge badge-success">${businessType.default_label_pets}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Vista Previa de Formulario -->
                <div class="preview-section">
                    <h4>📝 Vista Previa del Formulario Onboarding</h4>
                    <div class="form-preview">
                        <div class="preview-form-group">
                            <label>Tipo de negocio <span style="color: red;">*</span></label>
                            <input type="text" value="${businessType.icon} ${businessType.label}" readonly class="form-input-readonly">
                            <small>Las etiquetas se configurarán automáticamente según este tipo</small>
                        </div>

                        <hr style="margin: 15px 0; border: none; border-top: 1px solid #e0e0e0;">

                        <div class="preview-form-group">
                            <label>¿Cómo llamas a tus clientes?</label>
                            <input type="text" value="${businessType.default_label_customers}" disabled class="form-input-disabled">
                            <small>✓ Aplicado automáticamente - no se personaliza</small>
                        </div>

                        <div class="preview-form-group">
                            <label>¿Cómo llamas a tus citas/reservas?</label>
                            <input type="text" value="${businessType.default_label_appointments}" disabled class="form-input-disabled">
                            <small>✓ Aplicado automáticamente - no se personaliza</small>
                        </div>

                        ${businessType.supports_pets ? `
                            <div class="preview-form-group">
                                <label>Trabajas con mascotas</label>
                                <div style="padding: 10px; background: #e8f5e9; border-radius: 4px; color: #2e7d32;">
                                    ✓ Habilitado automáticamente para ${businessType.label}
                                </div>
                            </div>

                            <div class="preview-form-group">
                                <label>¿Cómo llamas a las mascotas?</label>
                                <input type="text" value="${businessType.default_label_pets}" disabled class="form-input-disabled">
                                <small>✓ Aplicado automáticamente - no se personaliza</small>
                            </div>
                        ` : `
                            <div class="preview-form-group">
                                <label>Trabajas con mascotas</label>
                                <div style="padding: 10px; background: #f3e5f5; border-radius: 4px; color: #6a1b9a;">
                                    ✗ No aplica para ${businessType.label}
                                </div>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Botones de Acción -->
                <div class="preview-actions" style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                    <button class="btn btn-info" id="previewUserBtn">👁️ Ver como Usuario</button>
                    <button class="btn btn-primary" id="editBusinessTypeBtn">✏️ Editar</button>
                    <button class="btn btn-danger" id="deleteBusinessTypeBtn">🗑️ Eliminar</button>
                </div>
            </div>
        `;

        // Adjuntar eventos a botones de acción
        document.getElementById('previewUserBtn')?.addEventListener('click', () => {
            this.showUserPreview(businessType);
        });
        document.getElementById('editBusinessTypeBtn')?.addEventListener('click', () => {
            this.showEditModal(businessType);
        });

        document.getElementById('deleteBusinessTypeBtn')?.addEventListener('click', () => {
            this.deleteBusinessType(businessType);
        });
    }

    attachEventListeners() {
        // Clicks en lista de tipos
        document.addEventListener('click', (e) => {
            const item = e.target.closest('.business-type-item');
            if (item) {
                const index = parseInt(item.dataset.index);
                this.renderPreview(this.businessTypes[index]);
                
                // Actualizar active
                document.querySelectorAll('.business-type-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
            }

            // Botón agregar nuevo tipo
            if (e.target.id === 'addBusinessTypeBtn') {
                this.showAddModal();
            }
        });
    }

    showAddModal() {
        const content = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <label>Código (código_unico)</label>
                    <input type="text" id="newTypeCode" placeholder="ej: barberia" class="form-input">
                </div>
                <div>
                    <label>Ícono</label>
                    <input type="text" id="newTypeIcon" placeholder="ej: 💈" class="form-input">
                </div>
                <div style="grid-column: 1 / -1;">
                    <label>Etiqueta</label>
                    <input type="text" id="newTypeLabel" placeholder="ej: Barbería" class="form-input">
                </div>
                <div style="grid-column: 1 / -1;">
                    <label>Descripción</label>
                    <textarea id="newTypeDescription" placeholder="Descripción..." class="form-input" style="resize: vertical; min-height: 60px;"></textarea>
                </div>
                <div>
                    <label>Etiqueta Clientes</label>
                    <input type="text" id="newTypeLabelCustomers" placeholder="ej: Cliente" class="form-input">
                </div>
                <div>
                    <label>Etiqueta Citas</label>
                    <input type="text" id="newTypeLabelAppointments" placeholder="ej: Cita" class="form-input">
                </div>
                <div>
                    <label>Etiqueta Mascotas</label>
                    <input type="text" id="newTypeLabelPets" placeholder="ej: Mascota" class="form-input">
                </div>
                <div>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="newTypeSupportsPets">
                        ¿Soporta mascotas?
                    </label>
                </div>
            </div>
        `;

        modal.showConfirm({
            title: '➕ Agregar Nuevo Tipo de Negocio',
            content,
            confirmText: 'Crear',
            onConfirm: async () => {
                const newType = {
                    code: document.getElementById('newTypeCode').value,
                    icon: document.getElementById('newTypeIcon').value || '📋',
                    label: document.getElementById('newTypeLabel').value,
                    description: document.getElementById('newTypeDescription').value,
                    default_label_customers: document.getElementById('newTypeLabelCustomers').value || 'Cliente',
                    default_label_appointments: document.getElementById('newTypeLabelAppointments').value || 'Cita',
                    default_label_pets: document.getElementById('newTypeLabelPets').value || 'Mascota',
                    supports_pets: document.getElementById('newTypeSupportsPets').checked
                };

                if (!newType.code || !newType.label) {
                    modal.showError('Código y Etiqueta son requeridos');
                    return;
                }

                try {
                    await apiService.request('/api/admin/business-types/create', 'POST', newType);
                    modal.showSuccess('Tipo de negocio creado');
                    this.init(); // Recargar lista
                } catch (error) {
                    modal.showError(`Error: ${error.message}`);
                }
            }
        });
    }

    showEditModal(businessType) {
        const content = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <label>Código (no editable)</label>
                    <input type="text" value="${businessType.code}" readonly class="form-input-readonly">
                </div>
                <div>
                    <label>Ícono</label>
                    <input type="text" id="editTypeIcon" value="${businessType.icon || '📋'}" class="form-input">
                </div>
                <div style="grid-column: 1 / -1;">
                    <label>Etiqueta</label>
                    <input type="text" id="editTypeLabel" value="${businessType.label}" class="form-input">
                </div>
                <div style="grid-column: 1 / -1;">
                    <label>Descripción</label>
                    <textarea id="editTypeDescription" class="form-input" style="resize: vertical; min-height: 60px;">${businessType.description || ''}</textarea>
                </div>
                <div>
                    <label>Etiqueta Clientes</label>
                    <input type="text" id="editTypeLabelCustomers" value="${businessType.default_label_customers}" class="form-input">
                </div>
                <div>
                    <label>Etiqueta Citas</label>
                    <input type="text" id="editTypeLabelAppointments" value="${businessType.default_label_appointments}" class="form-input">
                </div>
                <div>
                    <label>Etiqueta Mascotas</label>
                    <input type="text" id="editTypeLabelPets" value="${businessType.default_label_pets}" class="form-input">
                </div>
                <div>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="editTypeSupportsPets" ${businessType.supports_pets ? 'checked' : ''}>
                        ¿Soporta mascotas?
                    </label>
                </div>
            </div>
        `;

        modal.showConfirm({
            title: `✏️ Editar: ${businessType.label}`,
            content,
            confirmText: 'Guardar Cambios',
            onConfirm: async () => {
                const updated = {
                    ...businessType,
                    icon: document.getElementById('editTypeIcon').value,
                    label: document.getElementById('editTypeLabel').value,
                    description: document.getElementById('editTypeDescription').value,
                    default_label_customers: document.getElementById('editTypeLabelCustomers').value,
                    default_label_appointments: document.getElementById('editTypeLabelAppointments').value,
                    default_label_pets: document.getElementById('editTypeLabelPets').value,
                    supports_pets: document.getElementById('editTypeSupportsPets').checked
                };

                try {
                    await apiService.request(`/api/admin/business-types/${businessType.code}/update`, 'PATCH', updated);
                    modal.showSuccess('Tipo de negocio actualizado');
                    this.init();
                } catch (error) {
                    modal.showError(`Error: ${error.message}`);
                }
            }
        });
    }

    async deleteBusinessType(businessType) {
        if (await modal.confirm({
            title: 'Eliminar Tipo de Negocio',
            message: `¿Estás seguro de eliminar "${businessType.label}"?`,
            type: 'warning'
        })) {
            try {
                await apiService.request(`/api/admin/business-types/${businessType.code}/delete`, 'DELETE');
                modal.showSuccess('Tipo de negocio eliminado');
                this.init();
            } catch (error) {
                modal.showError(`Error: ${error.message}`);
            }
        }
    }

    showUserPreview(businessType) {
        const labelCustomers = businessType.default_label_customers || 'Clientes';
        const labelAppointments = businessType.default_label_appointments || 'Citas';
        const labelPets = businessType.default_label_pets || 'Mascotas';
        const hasPets = !!businessType.supports_pets;

        const content = `
            <div style="display: grid; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f8fafc;">
                    <div style="font-size: 32px;">${businessType.icon || '📋'}</div>
                    <div>
                        <div style="font-size: 14px; color: #6b7280;">Tipo de negocio</div>
                        <div style="font-size: 18px; font-weight: 700; color: #111827;">${businessType.label}</div>
                        <div style="font-size: 12px; color: #6b7280;">Vista previa del usuario final</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div style="background: white; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">Modulo</div>
                        <div style="font-size: 16px; font-weight: 700;">${labelCustomers}</div>
                        <div style="font-size: 12px; color: #10b981; margin-top: 6px;">✓ Etiqueta aplicada</div>
                    </div>
                    <div style="background: white; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">Modulo</div>
                        <div style="font-size: 16px; font-weight: 700;">${labelAppointments}</div>
                        <div style="font-size: 12px; color: #10b981; margin-top: 6px;">✓ Etiqueta aplicada</div>
                    </div>
                </div>

                ${hasPets ? `
                    <div style="background: white; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">Modulo</div>
                        <div style="font-size: 16px; font-weight: 700;">${labelPets}</div>
                        <div style="font-size: 12px; color: #10b981; margin-top: 6px;">✓ Etiqueta aplicada</div>
                    </div>
                ` : `
                    <div style="background: #fef3c7; padding: 12px; border-radius: 10px; border: 1px solid #f59e0b; color: #92400e;">
                        Mascotas no aplica para ${businessType.label}
                    </div>
                `}

                <div style="background: white; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;">
                    <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Ejemplo de formulario</div>
                    <div style="display: grid; gap: 8px;">
                        <div style="font-size: 12px; color: #6b7280;">${labelCustomers} *</div>
                        <div style="height: 34px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb;"></div>
                        <div style="font-size: 12px; color: #6b7280;">${labelAppointments} *</div>
                        <div style="height: 34px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb;"></div>
                    </div>
                </div>
            </div>
        `;

        modal.show({
            title: `👁️ Vista de Usuario - ${businessType.label}`,
            content,
            size: 'large'
        });
    }

    createDefaultTypes() {
        this.businessTypes = [
            {
                code: 'veterinaria',
                label: 'Veterinaria',
                description: 'Clínicas veterinarias y hospitales para animales',
                icon: '🏥',
                default_label_customers: 'Cliente',
                default_label_appointments: 'Consulta',
                default_label_pets: 'Mascota',
                supports_pets: true
            },
            {
                code: 'barberia',
                label: 'Barbería',
                description: 'Barberías y peluquerías para hombres',
                icon: '💈',
                default_label_customers: 'Cliente',
                default_label_appointments: 'Cita',
                default_label_pets: 'N/A',
                supports_pets: false
            },
            {
                code: 'spa',
                label: 'Spa / Estética',
                description: 'Centros de estética, spas y salones de belleza',
                icon: '💆',
                default_label_customers: 'Cliente',
                default_label_appointments: 'Reserva',
                default_label_pets: 'N/A',
                supports_pets: false
            },
            {
                code: 'clinica',
                label: 'Clínica Médica',
                description: 'Clínicas médicas y consultorios',
                icon: '⚕️',
                default_label_customers: 'Paciente',
                default_label_appointments: 'Consulta',
                default_label_pets: 'N/A',
                supports_pets: false
            },
            {
                code: 'peluqueria',
                label: 'Peluquería',
                description: 'Peluquerías y salones de belleza',
                icon: '✂️',
                default_label_customers: 'Cliente',
                default_label_appointments: 'Turno',
                default_label_pets: 'N/A',
                supports_pets: false
            },
            {
                code: 'dental',
                label: 'Odontología',
                description: 'Consultorios dentales y clínicas odontológicas',
                icon: '🦷',
                default_label_customers: 'Paciente',
                default_label_appointments: 'Consulta',
                default_label_pets: 'N/A',
                supports_pets: false
            },
            {
                code: 'otro',
                label: 'Otro',
                description: 'Otros tipos de negocio',
                icon: '📋',
                default_label_customers: 'Cliente',
                default_label_appointments: 'Cita',
                default_label_pets: 'N/A',
                supports_pets: false
            }
        ];
        this.renderBusinessTypesList();
    }
}

export default new BusinessTypesView();
