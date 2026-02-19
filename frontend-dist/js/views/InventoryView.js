/**
 * Inventory View
 * Responsabilidad: Gestionar vista de inventario
 * Principio SOLID: Single Responsibility
 */

import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import table from '../components/Table.js';
import modal from '../components/Modal.js';

export class InventoryView {
    constructor() {
        this.items = [];
    }

    render() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Inventario de Productos</h2>
                    <button class="btn btn-success" id="btnNewProduct">
                        + Nuevo Producto
                    </button>
                </div>
                <div class="card-body" id="inventoryTableContainer">
                    ${this.renderTable()}
                </div>
            </div>
        `;
    }

    renderTable() {
        const columns = [
            { key: 'sku', label: 'SKU' },
            { key: 'name', label: 'Nombre' },
            { key: 'category', label: 'Categoría' },
            { key: 'quantity', label: 'Stock' },
            { key: 'unit_price', label: 'Precio', type: 'currency' },
            {
                key: 'actions',
                label: 'Acciones',
                formatter: (_, row) => `
                    <button class="btn btn-sm" data-edit="${row.id}">Editar</button>
                `
            }
        ];

        return table.render({
            columns,
            data: this.items,
            emptyMessage: 'No hay productos en el inventario',
            emptyIcon: '📦'
        });
    }

    async init() {
        await this.loadInventory();
        this.attachEventListeners();
    }

    async loadInventory() {
        try {
            this.items = await apiService.getInventoryItems();
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

    updateTable() {
        const container = document.getElementById('inventoryTableContainer');
        if (container) {
            container.innerHTML = this.renderTable();
        }
    }

    attachEventListeners() {
        document.getElementById('btnNewProduct')?.addEventListener('click', () => {
            this.showProductModal();
        });

        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('[data-edit]');
            if (editBtn) {
                const productId = editBtn.dataset.edit;
                this.editProduct(productId);
            }
        });
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
}

export default new InventoryView();
