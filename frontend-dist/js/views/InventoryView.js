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
        const canCreateProducts = isAdmin || features.includes('create_products');
        const canCreateCategory = canCreateProducts;
        
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Inventario y Servicios</h2>
                    <div style="display: flex; gap: 10px;">
                        ${canCreateCategory ? '<button class="btn btn-primary" id="btnNewCategory">+ 📂 Nueva Categoría</button>' : ''}
                        ${canCreateProducts ? `<button class="btn btn-success" id="btnNewProduct" style="${this.activeTab === 'products' ? '' : 'display: none;'}">+ 📦 Nuevo Producto</button>` : ''}
                        ${canCreateProducts ? `<button class="btn btn-success" id="btnNewService" style="${this.activeTab === 'services' ? '' : 'display: none;'}">+ 📋 Nuevo Servicio</button>` : ''}
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
        const features = authService.getFeatures();
        const canViewProducts = isAdmin || features.includes('view_inventory');
        const canEditProducts = isAdmin || features.includes('edit_products');
        const canDeleteProducts = isAdmin || features.includes('delete_products');
        
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
                    let buttons = '';
                    if (canViewProducts) {
                        buttons += `<button class="btn btn-sm" data-view-item="${row.id}">👁️ Ver</button>`;
                    }
                    if (canEditProducts) {
                        buttons += ` <button class="btn btn-sm btn-primary" data-edit="${row.id}">✏️ Editar</button>`;
                    }
                    if (canDeleteProducts) {
                        buttons += ` <button class="btn btn-sm btn-danger" data-delete-item="${row.id}">🗑️ Eliminar</button>`;
                    }
                    return buttons || '-';
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
        const features = authService.getFeatures();
        const canViewServices = isAdmin || features.includes('view_inventory');
        const canEditServices = isAdmin || features.includes('edit_products');
        const canDeleteServices = isAdmin || features.includes('delete_products');
        
        const columns = [
            { key: 'name', label: 'Nombre' },
            { key: 'description', label: 'Descripción' },
            { key: 'unit_price', label: 'Precio', formatter: (v) => this.formatCurrency(v || 0) },
            { key: 'duration_minutes', label: 'Duración (min)', formatter: (v) => (v || v === 0) ? `${v} min` : 'N/A' },
            {
                key: 'actions',
                label: 'Acciones',
                formatter: (_, row) => {
                    let buttons = '';
                    if (canViewServices) {
                        buttons += `<button class="btn btn-sm" data-view-service="${row.id}">👁️ Ver</button>`;
                    }
                    if (canEditServices) {
                        buttons += ` <button class="btn btn-sm btn-primary" data-edit-service="${row.id}">✏️ Editar</button>`;
                    }
                    if (canDeleteServices) {
                        buttons += ` <button class="btn btn-sm btn-danger" data-delete-service="${row.id}">🗑️ Eliminar</button>`;
                    }
                    return buttons || '-';
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
            this.services = Array.isArray(services)
                ? services.map((s) => ({
                    ...s,
                    unit_price: s.unit_price ?? s.price ?? 0,
                    duration_minutes: s.duration_minutes ?? null,
                }))
                : [];
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

            const viewItemBtn = e.target.closest('[data-view-item]');
            if (viewItemBtn) {
                const productId = viewItemBtn.dataset.viewItem;
                this.showProductViewModal(productId);
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

            const viewServiceBtn = e.target.closest('[data-view-service]');
            if (viewServiceBtn) {
                const serviceId = viewServiceBtn.dataset.viewService;
                this.showServiceViewModal(serviceId);
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
                ${product?.id ? `<input type="hidden" name="product_id" value="${product.id}">` : ''}
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
        
        const productId = formData.get('product_id') ? parseInt(formData.get('product_id')) : null;
        const requiredFeature = productId ? 'edit_products' : 'create_products';

        // Si no es admin y no tiene la característica requerida, bloquear
        if (user && user.role !== 'admin' && !features.includes(requiredFeature)) {
            modal.alert({
                type: 'warning',
                title: 'Aumenta tu plan',
                message: 'No tienes permisos para esta acción en productos con tu plan actual.'
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
            if (productId) {
                await apiService.updateInventoryItem(productId, productData);
            } else {
                await apiService.createInventoryItem(productData);
            }
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
        const user = authService.getCurrentUser();
        const features = authService.getFeatures();
        if (user && user.role !== 'admin' && !features.includes('delete_products')) {
            await modal.alert({
                type: 'warning',
                title: 'Sin permisos',
                message: 'No tienes permisos para eliminar productos.'
            });
            return;
        }

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
                        <input type="number" name="duration_minutes" value="${service?.duration_minutes ?? 60}" placeholder="60">
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
        const user = authService.getCurrentUser();
        const features = authService.getFeatures();
        const requiredFeature = existingService ? 'edit_products' : 'create_products';

        if (user && user.role !== 'admin' && !features.includes(requiredFeature)) {
            await modal.alert({
                type: 'warning',
                title: 'Sin permisos',
                message: 'No tienes permisos para guardar servicios.'
            });
            return;
        }

        const serviceData = {
            name: formData.get('name'),
            description: formData.get('description') || null,
            price: parseFloat(formData.get('unit_price')),
            duration_minutes: formData.get('duration_minutes') ? parseInt(formData.get('duration_minutes'), 10) : null,
            is_active: true,
        };

        try {
            if (existingService) {
                await apiService.updateService(existingService.id, serviceData);
            } else {
                await apiService.createService(serviceData);
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

    showProductViewModal(itemId) {
        const item = this.items.find(i => i.id == itemId);
        if (!item) return;

        const content = `
            <div class="modal-form">
                <div class="form-group"><label>SKU</label><input type="text" value="${item.sku || '-'}" disabled></div>
                <div class="form-group"><label>Nombre</label><input type="text" value="${item.name || '-'}" disabled></div>
                <div class="form-group"><label>Categoría</label><input type="text" value="${item.category || '-'}" disabled></div>
                <div class="form-row">
                    <div class="form-group"><label>Stock</label><input type="text" value="${item.quantity ?? 0}" disabled></div>
                    <div class="form-group"><label>Precio</label><input type="text" value="${this.formatCurrency(item.unit_price || 0)}" disabled></div>
                </div>
                <div class="form-group"><label>Descripción</label><textarea rows="3" disabled>${item.description || '-'}</textarea></div>
            </div>
        `;

        modal.show({ title: 'Ver Producto', content, size: 'medium' });
    }

    showServiceViewModal(serviceId) {
        const service = this.services.find(s => s.id == serviceId);
        if (!service) return;

        const content = `
            <div class="modal-form">
                <div class="form-group"><label>Nombre</label><input type="text" value="${service.name || '-'}" disabled></div>
                <div class="form-row">
                    <div class="form-group"><label>Precio</label><input type="text" value="${this.formatCurrency(service.unit_price || service.price || 0)}" disabled></div>
                    <div class="form-group"><label>Duración</label><input type="text" value="${(service.duration_minutes || service.duration_minutes === 0) ? `${service.duration_minutes} min` : 'N/A'}" disabled></div>
                </div>
                <div class="form-group"><label>Descripción</label><textarea rows="3" disabled>${service.description || '-'}</textarea></div>
            </div>
        `;

        modal.show({ title: 'Ver Servicio', content, size: 'medium' });
    }
    
    async deleteService(serviceId) {
        const user = authService.getCurrentUser();
        const features = authService.getFeatures();
        if (user && user.role !== 'admin' && !features.includes('delete_products')) {
            await modal.alert({
                type: 'warning',
                title: 'Sin permisos',
                message: 'No tienes permisos para eliminar servicios.'
            });
            return;
        }

        const confirmed = await modal.confirm({
            title: 'Confirmar eliminación',
            message: '¿Estás seguro de que quieres eliminar este servicio?',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar'
        });
        
        if (confirmed) {
            try {
                await apiService.deleteService(serviceId);
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

    async showInvoiceModal() {
        // Cargar clientes, servicios e inventario EN PARALELO
        let customersOptions = '<option value="">Cargando clientes...</option>';
        let itemsOptions = '<option value="">Seleccionar item...</option>';
        let customers = [];
        let services = [];
        let inventory = [];
        
        try {
            [customers, services, inventory] = await Promise.all([
                apiService.getCustomers(),
                apiService.getServices(),
                apiService.getInventoryItems()
            ]);
            
            if (Array.isArray(customers) && customers.length > 0) {
                customersOptions = '<option value="">Seleccionar cliente...</option>';
                customers.forEach(c => {
                    customersOptions += `<option value="${c.id}">${c.full_name || 'Sin nombre'}</option>`;
                });
            } else {
                customersOptions = '<option value="">No hay clientes registrados</option>';
            }
            
            // SERVICIOS
            if (Array.isArray(services) && services.length > 0) {
                itemsOptions = '<optgroup label="Servicios">';
                services.forEach(s => {
                    itemsOptions += `<option value="service:${s.id}" data-price="${s.unit_price || 0}">${s.name || 'Sin nombre'} (${this.formatCurrency(s.unit_price || 0)})</option>`;
                });
                itemsOptions += '</optgroup>';
            }
            
            // PRODUCTOS
            if (Array.isArray(inventory) && inventory.length > 0) {
                itemsOptions += '<optgroup label="Productos">';
                inventory.forEach(p => {
                    if (p.item_type === 'product' && p.is_active) {
                        itemsOptions += `<option value="product:${p.id}" data-price="${p.unit_price || 0}">${p.name || 'Sin nombre'} (${this.formatCurrency(p.unit_price || 0)})</option>`;
                    }
                });
                itemsOptions += '</optgroup>';
            }
        } catch (error) {
            console.error('Error loading data:', error);
            customersOptions = '<option value="">Error al cargar clientes</option>';
        }

        const html = `
            <form id="invoiceForm">
                <div class="form-group">
                    <label>Cliente *</label>
                    <select name="customer_id" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px;">
                        ${customersOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label>Items de Factura</label>
                    <div style="border: 1px solid #eee; border-radius: 4px; padding: 12px; margin-bottom: 12px;">
                        <div id="invoiceItems" style="margin-bottom: 12px;">
                            <!-- Items agregados aquí -->
                        </div>
                        <div class="form-row" style="display: flex; gap: 8px; align-items: flex-end;">
                            <div style="flex: 1;">
                                <label style="font-size: 12px; display: block; margin-bottom: 4px;">Ítem</label>
                                <select id="itemSelect" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
                                    ${itemsOptions}
                                    <optgroup label="Otros">
                                        <option value="custom:0">Descripción personalizada</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div style="width: 80px;">
                                <label style="font-size: 12px; display: block; margin-bottom: 4px;">Cant.</label>
                                <input type="number" id="itemQty" min="1" value="1" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
                            </div>
                            <button type="button" id="btnAddItem" style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">+ Agregar</button>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Subtotal</label>
                    <input type="number" id="invoiceSubtotal" name="subtotal" step="0.01" placeholder="0.00" readonly style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px; background: #f9f9f9;">
                </div>

                <div class="form-group">
                    <label>Notas</label>
                    <textarea name="notes" placeholder="Notas adicionales..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 12px; height: 60px;"></textarea>
                </div>

                <div class="modal-actions">
                    <button type="submit" class="btn btn-success">Generar Factura</button>
                    <button type="button" class="btn" data-close>Cancelar</button>
                </div>
            </form>
        `;

        const invoiceModal = modal.show({ 
            title: 'Nueva Factura', 
            content: html, 
            size: 'medium' 
        });

        const quickParams = new URLSearchParams(window.location.search || '');
        const prefillCustomerId = quickParams.get('customer_id');
        const prefillSubtotal = Number(quickParams.get('subtotal') || 0);
        const prefillNotes = quickParams.get('notes') || '';

        // Setup item management
        const invoiceItems = [];
        const itemsContainer = document.getElementById('invoiceItems');
        const itemSelect = document.getElementById('itemSelect');
        const itemQty = document.getElementById('itemQty');
        const btnAddItem = document.getElementById('btnAddItem');
        const subtotalInput = document.getElementById('invoiceSubtotal');
        
        // Store services/products for reference
        const itemsMap = {};
        services.forEach(s => itemsMap[`service:${s.id}`] = s);
        inventory.forEach(p => itemsMap[`product:${p.id}`] = p);

        const updateTotal = () => {
            const total = invoiceItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
            subtotalInput.value = total.toFixed(2);
        };

        const renderItems = () => {
            itemsContainer.innerHTML = invoiceItems.map((item, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f9f9f9; border-radius: 4px; margin-bottom: 6px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; font-size: 13px;">${item.description}</div>
                        <div style="font-size: 11px; color: #7f8c8d;">Cantidad: ${item.quantity} × ${this.formatCurrency(item.unit_price)}</div>
                    </div>
                    <div style="font-weight: 600; margin-right: 12px;">${this.formatCurrency(item.unit_price * item.quantity)}</div>
                    <button type="button" class="btn btn-sm btn-danger" data-remove="${idx}" style="padding: 4px 8px; font-size: 11px;">✕</button>
                </div>
            `).join('');

            // Attach remove handlers
            itemsContainer.querySelectorAll('[data-remove]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.dataset.remove);
                    invoiceItems.splice(idx, 1);
                    renderItems();
                    updateTotal();
                });
            });
        };

        const form = document.getElementById('invoiceForm');
        const customerSelect = form?.querySelector('select[name="customer_id"]');
        const notesField = form?.querySelector('textarea[name="notes"]');
        if (customerSelect && prefillCustomerId) {
            customerSelect.value = prefillCustomerId;
        }
        if (notesField && prefillNotes) {
            notesField.value = prefillNotes;
        }
        if (prefillSubtotal > 0 && invoiceItems.length === 0) {
            invoiceItems.push({
                source_type: 'custom',
                description: prefillNotes || 'Concepto facturable',
                unit_price: prefillSubtotal,
                quantity: 1,
            });
            renderItems();
            updateTotal();
        }

        btnAddItem.addEventListener('click', () => {
            const selectedValue = itemSelect.value;
            const quantity = parseInt(itemQty.value) || 1;

            if (!selectedValue) {
                alert('Por favor selecciona un ítem');
                return;
            }

            let item = null;
            if (selectedValue.startsWith('service:')) {
                const serviceId = parseInt(selectedValue.split(':')[1]);
                const service = itemsMap[selectedValue];
                if (service) {
                    item = {
                        source_type: 'service',
                        service_id: serviceId,
                        description: service.name,
                        unit_price: parseFloat(service.unit_price),
                        quantity: quantity
                    };
                }
            } else if (selectedValue.startsWith('product:')) {
                const productId = parseInt(selectedValue.split(':')[1]);
                const product = itemsMap[selectedValue];
                if (product) {
                    item = {
                        source_type: 'product',
                        inventory_item_id: productId,
                        description: product.name,
                        unit_price: parseFloat(product.unit_price),
                        quantity: quantity
                    };
                }
            } else if (selectedValue === 'custom:0') {
                const customDesc = prompt('Descripción del ítem:');
                if (customDesc) {
                    const customPrice = prompt('Precio unitario:');
                    if (customPrice) {
                        item = {
                            source_type: 'custom',
                            description: customDesc,
                            unit_price: parseFloat(customPrice),
                            quantity: quantity
                        };
                    }
                }
            }

            if (item) {
                invoiceItems.push(item);
                renderItems();
                updateTotal();
                itemQty.value = 1;
                itemSelect.value = '';
            }
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            if (invoiceItems.length === 0) {
                alert('Por favor agrega al menos un ítem a la factura');
                return;
            }
            
            // Convertir items al formato de InvoiceItem
            const invoiceItemsData = invoiceItems.map(item => ({
                source_type: item.source_type,
                service_id: item.service_id || null,
                inventory_item_id: item.inventory_item_id || null,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price
            }));
            
            const invoiceData = {
                customer_id: parseInt(formData.get('customer_id')),
                items: invoiceItemsData,
                notes: formData.get('notes') || null
            };
            
            try {
                const response = await apiService.post('/invoices/generate', invoiceData);
                modal.close(invoiceModal);
                
                await modal.alert({ 
                    title: 'Éxito', 
                    message: `Factura ${response.invoice_number} generada correctamente`,
                    type: 'success'
                });
                
                await this.loadData();
                if (window.location.search) {
                    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
                }
            } catch (error) {
                console.error('Error creating invoice:', error);
                let errorMsg = error.message || 'Error desconocido';
                if (error.detail) {
                    errorMsg = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
                }
                await modal.alert({ 
                    title: 'Error', 
                    message: errorMsg, 
                    type: 'error'
                });
            }
        });
    }
}

export default new InventoryView();
