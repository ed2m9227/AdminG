/**
 * Inventory View
 * Responsabilidad: Gestionar vista de inventario y servicios
 * Principio SOLID: Single Responsibility
 */

import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import table from '../components/Table.js';
import modal from '../components/Modal.js';

export class InventoryView {
    constructor() {
        this.items = [];
        this.services = [];
        this.activeTab = 'products'; // 'products' or 'services'
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    render() {
        const user = authService.getCurrentUser();
        const isAdmin = user && user.role === 'admin';
        const features = authService.getFeatures();
        const canCreateCategory = isAdmin || features.includes('create_products');
        
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Inventario y Servicios</h2>
                    <div style="display: flex; gap: 10px;">
                        ${canCreateCategory ? '<button class="btn btn-primary" id="btnNewCategory">+ 📂 Nueva Categoría</button>' : ''}
                        <button class="btn btn-success" id="btnNewProduct" style="${this.activeTab === 'products' ? '' : 'display: none;'}">
                            + 📦 Nuevo Producto
                        </button>
                        <button class="btn btn-success" id="btnNewService" style="${this.activeTab === 'services' ? '' : 'display: none;'}">
                            + 📋 Nuevo Servicio
                        </button>
                    </div>
                </div>
                
                <!-- Tabs -->
                <div class="tabs" style="border-bottom: 1px solid #e1e5e9; margin-bottom: 20px;">
                    <button class="tab-button ${this.activeTab === 'products' ? 'active' : ''}" data-tab="products">
                        📦 Productos
                    </button>
                    <button class="tab-button ${this.activeTab === 'services' ? 'active' : ''}" data-tab="services">
                        📋 Servicios
                    </button>
                </div>
                
                <div class="card-body" id="inventoryTableContainer">
                    ${this.activeTab === 'products' ? this.renderProductsTable() : this.renderServicesTable()}
                </div>
            </div>
            
            <style>
                .tabs {
                    display: flex;
                    background: #f8f9fa;
                    border-radius: 8px 8px 0 0;
                }
                .tab-button {
                    flex: 1;
                    padding: 12px 20px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-weight: 500;
                    color: #6b7280;
                    border-radius: 8px 8px 0 0;
                    transition: all 0.2s;
                }
                .tab-button:hover {
                    background: #e5e7eb;
                    color: #374151;
                }
                .tab-button.active {
                    background: white;
                    color: #667eea;
                    border-bottom: 2px solid #667eea;
                }
            </style>
        `;
    }

    renderProductsTable() {
        const user = authService.getCurrentUser();
        const isAdmin = user && user.role === 'admin';
        
        const columns = [
            { key: 'sku', label: 'SKU' },
            { key: 'name', label: 'Nombre' },
            { key: 'category', label: 'Categoría' },
            { key: 'quantity', label: 'Stock' },
            { key: 'unit_price', label: 'Precio', formatter: (v) => this.formatCurrency(v || 0) },
            {
                key: 'actions',
                label: 'Acciones',
                formatter: (_, row) => {
                    let buttons = `<button class="btn btn-sm btn-primary" data-edit="${row.id}">✏️ Editar</button>`;
                    if (isAdmin) {
                        buttons += ` <button class="btn btn-sm btn-danger" data-delete-item="${row.id}">🗑️ Eliminar</button>`;
                    }
                    return buttons;
                }
            }
        ];

        return table.render({
            columns,
            data: this.items,
            emptyMessage: 'No hay productos en el inventario',
            emptyIcon: '📦'
        });
    }

    renderServicesTable() {
        const user = authService.getCurrentUser();
        const isAdmin = user && user.role === 'admin';
        
        const columns = [
            { key: 'name', label: 'Nombre' },
            { key: 'description', label: 'Descripción' },
            { key: 'unit_price', label: 'Precio', formatter: (v) => this.formatCurrency(v || 0) },
            { key: 'duration_minutes', label: 'Duración (min)', formatter: (v) => v ? `${v} min` : 'N/A' },
            {
                key: 'actions',
                label: 'Acciones',
                formatter: (_, row) => {
                    let buttons = `<button class="btn btn-sm btn-primary" data-edit-service="${row.id}">✏️ Editar</button>`;
                    if (isAdmin) {
                        buttons += ` <button class="btn btn-sm btn-danger" data-delete-service="${row.id}">🗑️ Eliminar</button>`;
                    }
                    return buttons;
                }
            }
        ];

        return table.render({
            columns,
            data: this.services,
            emptyMessage: 'No hay servicios registrados',
            emptyIcon: '📋'
        });
    }

    async init() {
        await this.loadData();
        this.attachEventListeners();
    }

    async loadData() {
        if (this.activeTab === 'products') {
            await this.loadInventory();
        } else {
            await this.loadServices();
        }
    }

    async loadInventory() {
        try {
            const items = await apiService.getInventoryItems();
            // enrich with category name so table can display it
            let categories = [];
            try {
                categories = await apiService.getInventoryCategories();
            } catch (_e) {
                // ignore, categories may be unavailable (user without access)
            }
            this.items = Array.isArray(items)
                ? items.map(i => ({
                      ...i,
                      category: categories.find(c => c.id === i.category_id)?.name || ''
                  }))
                : [];
            this.updateTable();
        } catch (error) {
            console.error('Error loading inventory:', error);
            modal.alert({
                type: 'error',
                title: 'Error',
                message: 'No se pudo cargar el inventario: ' + error.message
            });
        }
    }

    async loadServices() {
        try {
            const services = await apiService.getServices();
            this.services = Array.isArray(services) ? services : [];
            this.updateTable();
        } catch (error) {
            console.error('Error loading services:', error);
            modal.alert({
                type: 'error',
                title: 'Error',
                message: 'No se pudo cargar los servicios: ' + error.message
            });
        }
    }

    updateTable() {
        const container = document.getElementById('inventoryTableContainer');
        if (container) {
            container.innerHTML = this.activeTab === 'products' ? this.renderProductsTable() : this.renderServicesTable();
        }
        this.updateButtonVisibility();
    }

    updateButtonVisibility() {
        const btnNewProduct = document.getElementById('btnNewProduct');
        const btnNewService = document.getElementById('btnNewService');
        
        if (btnNewProduct) btnNewProduct.style.display = this.activeTab === 'products' ? '' : 'none';
        if (btnNewService) btnNewService.style.display = this.activeTab === 'services' ? '' : 'none';
    }

    attachEventListeners() {
        // Tab switching
        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab-button');
            if (tabBtn) {
                const tab = tabBtn.dataset.tab;
                this.switchTab(tab);
            }
        });

        // Product buttons
        document.getElementById('btnNewProduct')?.addEventListener('click', () => {
            this.showProductModal();
        });
        
        document.getElementById('btnNewCategory')?.addEventListener('click', () => {
            this.showCategoryModal();
        });

        // Service buttons
        document.getElementById('btnNewService')?.addEventListener('click', () => {
            this.showServiceModal();
        });

        // Action buttons
        document.addEventListener('click', (e) => {
            // Product actions
            const editBtn = e.target.closest('[data-edit]');
            if (editBtn) {
                const productId = editBtn.dataset.edit;
                this.editProduct(productId);
            }
            
            const deleteBtn = e.target.closest('[data-delete-item]');
            if (deleteBtn) {
                const itemId = deleteBtn.dataset.deleteItem;
                this.deleteItem(itemId);
            }

            // Service actions
            const editServiceBtn = e.target.closest('[data-edit-service]');
            if (editServiceBtn) {
                const serviceId = editServiceBtn.dataset.editService;
                this.editService(serviceId);
            }
            
            const deleteServiceBtn = e.target.closest('[data-delete-service]');
            if (deleteServiceBtn) {
                const serviceId = deleteServiceBtn.dataset.deleteService;
                this.deleteService(serviceId);
            }
        });
    }

    switchTab(tab) {
        if (this.activeTab === tab) return;
        
        this.activeTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Load data for the new tab
        this.loadData();
    }

    async showProductModal(product = null) {
        const isEdit = !!product;
        const title = isEdit ? 'Editar Producto' : 'Nuevo Producto';

        // Cargar categorías ANTES de mostrar modal
        let categoriesOptions = '<option value="">Sin categoría</option>';
        try {
            const categories = await apiService.getInventoryCategories();
            if (Array.isArray(categories) && categories.length > 0) {
                categories.forEach(cat => {
                    const selected = product?.category_id === cat.id ? 'selected' : '';
                    categoriesOptions += `<option value="${cat.id}" ${selected}>${cat.name}</option>`;
                });
            }
        } catch (error) {
            console.log('Categorías no disponibles:', error);
        }

        const content = `
            <form id="productForm" class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>
                            SKU 
                            <span class="help-icon" title="Código único del producto (Stock Keeping Unit). Ejemplo: ALM-001, PROD-001" style="cursor: help; color: #667eea; font-weight: bold; margin-left: 4px;">ℹ️</span>
                        </label>
                        <input type="text" name="sku" value="${product?.sku || ''}" placeholder="Ej: PROD-001">
                    </div>
                    <div class="form-group">
                        <label>Nombre *</label>
                        <input type="text" name="name" value="${product?.name || ''}" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea name="description" rows="3">${product?.description || ''}</textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Categoría</label>
                        <select name="category_id" id="productCategory" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            ${categoriesOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Cantidad *</label>
                        <input type="number" name="quantity" value="${product?.quantity || 0}" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Precio *</label>
                        <input type="number" step="0.01" name="unit_price" value="${product?.unit_price || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Costo</label>
                        <input type="number" step="0.01" name="cost" value="${product?.cost || ''}">
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Guardar</button>
                    <button type="button" class="btn" data-close>Cancelar</button>
                </div>
            </form>
        `;

        const productModal = modal.show({ title, content, size: 'medium' });

        const form = document.getElementById('productForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProduct(e, productModal);
        });
    }

    async saveProduct(e, modalElement) {
        const form = e.target;
        const formData = new FormData(form);

        // Validar permiso ANTES de enviar al servidor
        const user = authService.getCurrentUser();
        const features = authService.getFeatures();
        
        // Si no es admin y no tiene la característica, bloquear
        if (user && user.role !== 'admin' && !features.includes('create_products')) {
            modal.alert({
                type: 'warning',
                title: 'Aumenta tu plan',
                message: 'No puedes añadir productos con tu plan actual. Aumenta tu plan para acceder a esta función.'
            });
            return;
        }

        const productData = {
            sku: formData.get('sku') || null,
            name: formData.get('name'),
            description: formData.get('description') || null,
            category_id: formData.get('category_id') ? parseInt(formData.get('category_id')) : null,
            quantity: parseInt(formData.get('quantity')),
            unit_price: parseFloat(formData.get('unit_price')),
            cost: formData.get('cost') ? parseFloat(formData.get('cost')) : null
        };

        try {
            await apiService.createInventoryItem(productData);
            modal.close(modalElement);
            await this.loadInventory();
            
            modal.alert({
                type: 'success',
                title: 'Éxito',
                message: 'Producto guardado correctamente'
            });
        } catch (error) {
            console.error('Error guardando producto:', error);
            let errorMsg = error.message || 'Error desconocido';
            
            // Si el error tiene detalles de validación (422), mostrarlos
            if (error.detail) {
                if (Array.isArray(error.detail)) {
                    errorMsg = error.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
                } else if (typeof error.detail === 'string') {
                    errorMsg = error.detail;
                }
            }
            
            modal.alert({
                type: 'error',
                title: 'Error',
                message: 'Error al guardar producto: ' + errorMsg
            });
        }
    }

    editProduct(productId) {
        const product = this.items.find(p => p.id == productId);
        if (product) {
            this.showProductModal(product);
        }
    }
    
    async deleteItem(itemId) {
        const confirmed = await modal.confirm({
            title: 'Confirmar eliminación',
            message: '¿Estás seguro de que quieres eliminar este producto?',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar'
        });
        
        if (confirmed) {
            try {
                await apiService.delete(`/inventory/items/${itemId}`);
                await this.loadInventory();
                await modal.alert({ 
                    title: 'Éxito', 
                    message: 'Producto eliminado correctamente',
                    type: 'success'
                });
            } catch (error) {
                await modal.alert({ 
                    title: 'Error', 
                    message: error.message,
                    type: 'error'
                });
            }
        }
    }
    
    async showCategoryModal() {
        const content = `
            <form id="categoryForm" class="modal-form">
                <div class="form-group">
                    <label>Nombre *</label>
                    <input type="text" name="name" required placeholder="Ej: Alimentos">
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea name="description" rows="3" placeholder="Descripción opcional..."></textarea>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Guardar</button>
                    <button type="button" class="btn" data-close>Cancelar</button>
                </div>
            </form>
        `;
        
        const categoryModal = modal.show({ 
            title: 'Nueva Categoría', 
            content, 
            size: 'medium' 
        });
        
        const form = document.getElementById('categoryForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            const categoryData = {
                name: formData.get('name'),
                description: formData.get('description') || null
            };
            
            try {
                await apiService.createInventoryCategory(categoryData);
                modal.close(categoryModal);
                await modal.alert({
                    type: 'success',
                    title: 'Éxito',
                    message: 'Categoría creada correctamente'
                });
            } catch (error) {
                await modal.alert({
                    type: 'error',
                    title: 'Error',
                    message: error.message || 'Error al crear categoría'
                });
            }
        });
    }

    async showServiceModal(service = null) {
        const isEdit = !!service;
        const title = isEdit ? 'Editar Servicio' : 'Nuevo Servicio';

        const content = `
            <form id="serviceForm" class="modal-form">
                <div class="form-group">
                    <label>Nombre *</label>
                    <input type="text" name="name" value="${service?.name || ''}" required placeholder="Ej: Corte de cabello">
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea name="description" rows="3" placeholder="Descripción del servicio...">${service?.description || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Precio *</label>
                        <input type="number" step="0.01" name="unit_price" value="${service?.unit_price || ''}" required placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>Duración (minutos)</label>
                        <input type="number" name="duration_minutes" value="${service?.duration_minutes || 60}" placeholder="60">
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Guardar</button>
                    <button type="button" class="btn" data-close>Cancelar</button>
                </div>
            </form>
        `;

        const serviceModal = modal.show({ title, content, size: 'medium' });

        const form = document.getElementById('serviceForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveService(e, serviceModal, service);
        });
    }

    async saveService(e, modalElement, existingService = null) {
        const form = e.target;
        const formData = new FormData(form);

        // Generate SKU from name if not provided
        let naming = formData.get('name');
        let sku = naming ? naming.toUpperCase().slice(0, 3) : 'SVC';
        
        const serviceData = {
            sku: sku + '-' + Date.now(),
            name: formData.get('name'),
            description: formData.get('description') || null,
            unit_price: parseFloat(formData.get('unit_price')),
            category_id: null,
            cost: null,
            item_type: 'service'
        };

        try {
            if (existingService) {
                await apiService.put(`/inventory/services/${existingService.id}`, serviceData);
            } else {
                await apiService.post('/inventory/services', serviceData);
            }
            
            modal.close(modalElement);
            await this.loadServices();
            
            modal.alert({
                type: 'success',
                title: 'Éxito',
                message: `Servicio ${existingService ? 'actualizado' : 'creado'} correctamente`
            });
        } catch (error) {
            console.error('Error guardando servicio:', error);
            let errorMsg = error.message || 'Error desconocido';
            
            if (error.detail) {
                if (Array.isArray(error.detail)) {
                    errorMsg = error.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
                } else if (typeof error.detail === 'string') {
                    errorMsg = error.detail;
                }
            }
            
            modal.alert({
                type: 'error',
                title: 'Error',
                message: 'Error al guardar servicio: ' + errorMsg
            });
        }
    }

    editService(serviceId) {
        const service = this.services.find(s => s.id == serviceId);
        if (service) {
            this.showServiceModal(service);
        }
    }
    
    async deleteService(serviceId) {
        const confirmed = await modal.confirm({
            title: 'Confirmar eliminación',
            message: '¿Estás seguro de que quieres eliminar este servicio?',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar'
        });
        
        if (confirmed) {
            try {
                await apiService.delete(`/inventory/services/${serviceId}`);
                await this.loadServices();
                await modal.alert({ 
                    title: 'Éxito', 
                    message: 'Servicio eliminado correctamente',
                    type: 'success'
                });
            } catch (error) {
                await modal.alert({ 
                    title: 'Error', 
                    message: error.message,
                    type: 'error'
                });
            }
        }
    }
}

export default new InventoryView();
