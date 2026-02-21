/**
 * Business Types Admin View
 * CRUD management for business types (admin only)
 */

import apiService from '../services/api.service.js';
import modal from '../components/Modal.js';

class BusinessTypesAdminView {
    constructor() {
        this.businessTypes = [];
        this.editingId = null;
        this.newBusinessType = {
            code: '',
            label: '',
            description: '',
            icon: '',
            is_active: true,
            default_label_customers: 'Cliente',
            default_label_appointments: 'Cita',
            default_label_pets: 'Mascota',
            supports_pets: false,
            order: 0
        };
    }

    async render() {
        await this.loadBusinessTypes();

        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900">Tipos de Negocio</h2>
                        <p class="text-gray-600 mt-1">Gestiona los tipos de negocio disponibles en el sistema</p>
                    </div>
                    <button id="btn-new-type" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        ➕ Nuevo Tipo
                    </button>
                </div>

                <!-- Form Section (for create/edit) -->
                <div id="form-section" style="display: none;" class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-xl font-semibold text-gray-800 mb-4">
                        ${this.editingId ? 'Editar Tipo de Negocio' : 'Crear Nuevo Tipo de Negocio'}
                    </h3>
                    
                    <form id="business-type-form" class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Code <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="form-code" 
                                       value="${this.newBusinessType.code}"
                                       placeholder="ej: veterinaria" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                       ${this.editingId ? 'disabled' : 'required'}>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Label <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="form-label" 
                                       value="${this.newBusinessType.label}"
                                       placeholder="ej: Veterinaria" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                       required>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea id="form-description" 
                                      placeholder="Descripción del tipo de negocio"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20">${this.newBusinessType.description}</textarea>
                        </div>

                        <div class="grid grid-cols-3 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                                <input type="text" id="form-icon" 
                                       value="${this.newBusinessType.icon}"
                                       placeholder="ej: 🏥" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Order</label>
                                <input type="number" id="form-order" 
                                       value="${this.newBusinessType.order}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="flex items-center mt-6">
                                    <input type="checkbox" id="form-supports-pets" 
                                           ${this.newBusinessType.supports_pets ? 'checked' : ''}
                                           class="rounded">
                                    <span class="ml-2 text-sm text-gray-700">Soporta mascotas</span>
                                </label>
                            </div>
                        </div>

                        <div class="grid grid-cols-3 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Etiqueta: Clientes</label>
                                <input type="text" id="form-label-customers" 
                                       value="${this.newBusinessType.default_label_customers}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Etiqueta: Citas</label>
                                <input type="text" id="form-label-appointments" 
                                       value="${this.newBusinessType.default_label_appointments}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Etiqueta: Mascotas</label>
                                <input type="text" id="form-label-pets" 
                                       value="${this.newBusinessType.default_label_pets}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>

                        <div class="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" id="btn-cancel" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                Cancelar
                            </button>
                            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                ${this.editingId ? 'Actualizar' : 'Crear'}
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Business Types Table -->
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Icon</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Label</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Code</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mascotas</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Activo</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${this.businessTypes.map((type, idx) => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-2xl">${type.icon || '📋'}</td>
                                    <td class="px-6 py-4">
                                        <div class="font-medium text-gray-900">${type.label}</div>
                                        <div class="text-sm text-gray-500">${type.description || '-'}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <code class="text-sm bg-gray-100 px-2 py-1 rounded">${type.code}</code>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="text-sm">${type.supports_pets ? '✓ Sí' : '✗ No'}</span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 rounded-full text-xs font-medium ${type.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                            ${type.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button class="edit-btn text-blue-600 hover:text-blue-900 mr-3" data-id="${type.id}">Editar</button>
                                        <button class="delete-btn text-red-600 hover:text-red-900" data-id="${type.id}">Eliminar</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${this.businessTypes.length === 0 ? `
                        <div class="px-6 py-12 text-center">
                            <p class="text-gray-500">No hay tipos de negocio registrados</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async loadBusinessTypes() {
        try {
            const response = await apiService.get('/api/admin/business-types');
            this.businessTypes = response || [];
        } catch (error) {
            console.error('Error loading business types:', error);
            modal.showError('Error al cargar los tipos de negocio');
            this.businessTypes = [];
        }
    }

    attachEvents() {
        // New button
        document.getElementById('btn-new-type')?.addEventListener('click', () => {
            this.editingId = null;
            this.newBusinessType = {
                code: '',
                label: '',
                description: '',
                icon: '',
                is_active: true,
                default_label_customers: 'Cliente',
                default_label_appointments: 'Cita',
                default_label_pets: 'Mascota',
                supports_pets: false,
                order: 0
            };
            document.getElementById('form-section').style.display = '';
        });

        // Cancel button
        document.getElementById('btn-cancel')?.addEventListener('click', () => {
            document.getElementById('form-section').style.display = 'none';
            this.editingId = null;
        });

        // Form submit
        document.getElementById('business-type-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveBusinessType();
        });

        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.editBusinessType(id);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.deleteBusinessType(id);
            });
        });
    }

    editBusinessType(id) {
        const type = this.businessTypes.find(t => t.id === parseInt(id));
        if (type) {
            this.editingId = id;
            this.newBusinessType = { ...type };
            document.getElementById('form-section').style.display = '';
            document.getElementById('form-label').focus();
        }
    }

    async saveBusinessType() {
        try {
            const data = {
                code: document.getElementById('form-code').value,
                label: document.getElementById('form-label').value,
                description: document.getElementById('form-description').value,
                icon: document.getElementById('form-icon').value,
                order: parseInt(document.getElementById('form-order').value) || 0,
                supports_pets: document.getElementById('form-supports-pets').checked,
                default_label_customers: document.getElementById('form-label-customers').value,
                default_label_appointments: document.getElementById('form-label-appointments').value,
                default_label_pets: document.getElementById('form-label-pets').value,
                is_active: true
            };

            modal.showLoading('Guardando...');

            if (this.editingId) {
                await apiService.put(`/api/admin/business-types/${this.editingId}`, data);
                modal.showSuccess('Tipo de negocio actualizado');
            } else {
                await apiService.post('/api/admin/business-types', data);
                modal.showSuccess('Tipo de negocio creado');
            }

            document.getElementById('form-section').style.display = 'none';
            this.editingId = null;
            await this.refresh();
        } catch (error) {
            modal.showError('Error: ' + (error.message || 'Error desconocido'));
        }
    }

    async deleteBusinessType(id) {
        if (confirm('¿Estás seguro de que deseas eliminar este tipo de negocio?')) {
            try {
                modal.showLoading('Eliminando...');
                await apiService.delete(`/api/admin/business-types/${id}`);
                modal.showSuccess('Tipo de negocio eliminado');
                await this.refresh();
            } catch (error) {
                modal.showError('Error al eliminar: ' + (error.message || 'Error desconocido'));
            }
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

export default new BusinessTypesAdminView();
