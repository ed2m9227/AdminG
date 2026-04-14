import apiService from '../services/api.service.js';
import modal from '../components/Modal.js';
import table from '../components/Table.js';

class InvoicesView {
    constructor() {
        this.invoices = [];
        this.customers = [];
        this.customerById = new Map();
        this.services = [];
        this.inventory = [];
        this.invoiceItemsMap = {};
    }

    render() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Facturas</h2>
                    <button class="btn btn-primary" id="btnShowGenerateInvoice">+ Nueva Factura</button>
                </div>
                <div class="card-body">
                    <div style="display:flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                        <button class="btn btn-secondary" id="tabInvoicesList">Listado</button>
                        <button class="btn btn-secondary" id="tabInvoicesGenerate">Generar</button>
                        <button class="btn btn-secondary" id="tabTaxConfig">Impuestos</button>
                    </div>

                    <section id="sectionInvoicesList">
                        <div class="table-container" id="invoicesTableContainer"></div>
                    </section>

                    <section id="sectionInvoicesGenerate" style="display:none;">
                        <form id="invoiceForm" class="modal-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Cliente *</label>
                                    <select id="invoiceCustomer" required></select>
                                </div>
                                <div class="form-group">
                                    <label>Notas</label>
                                    <input id="invoiceNotes" type="text" placeholder="Notas opcionales">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group" style="display:flex; align-items:center; gap:8px;">
                                    <input type="checkbox" id="applyIva" checked>
                                    <label for="applyIva">Aplicar IVA</label>
                                </div>
                                <div class="form-group">
                                    <label>% IVA (opcional)</label>
                                    <input id="ivaPercentage" type="number" min="0" max="100" step="0.01" placeholder="Ej: 19">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group" style="display:flex; align-items:center; gap:8px;">
                                    <input type="checkbox" id="applyRetencion">
                                    <label for="applyRetencion">Aplicar Retencion</label>
                                </div>
                                <div class="form-group">
                                    <label>% Retencion (opcional)</label>
                                    <input id="retencionPercentage" type="number" min="0" max="100" step="0.01" placeholder="Ej: 2.5">
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Items</label>
                                <div id="invoiceItems"></div>
                                <button id="btnAddInvoiceItem" class="btn btn-secondary" type="button">+ Agregar Item</button>
                            </div>

                            <div class="form-actions" style="margin-top: 12px;">
                                <button class="btn btn-success" type="submit">Generar Factura</button>
                            </div>
                        </form>
                    </section>

                    <section id="sectionTaxConfig" style="display:none;">
                        <form id="taxConfigForm" class="modal-form" style="margin-bottom: 16px;">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Nombre *</label>
                                    <input id="taxName" type="text" required placeholder="IVA General">
                                </div>
                                <div class="form-group">
                                    <label>Tipo *</label>
                                    <select id="taxType" required>
                                        <option value="iva">IVA</option>
                                        <option value="retencion">Retencion</option>
                                        <option value="other">Otro</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Porcentaje *</label>
                                    <input id="taxPercentage" type="number" min="0" max="100" step="0.01" required>
                                </div>
                                <div class="form-group">
                                    <label>Aplica a</label>
                                    <select id="taxAppliesTo">
                                        <option value="all">Todo</option>
                                        <option value="products">Productos</option>
                                        <option value="services">Servicios</option>
                                    </select>
                                </div>
                            </div>
                            <button class="btn btn-primary" type="submit">Guardar Impuesto</button>
                        </form>
                        <div id="taxConfigsContainer"></div>
                    </section>
                </div>
            </div>
        `;
    }

    async init() {
        this.attachEvents();
        await this.loadCustomers();
        await this.loadServices();
        await this.loadInvoices();
    }

    async loadServices() {
        try {
            [this.services, this.inventory] = await Promise.all([
                apiService.getServices(),
                apiService.getInventoryItems()
            ]);
        } catch (error) {
            console.warn('Error loading services/inventory:', error);
            this.services = [];
            this.inventory = [];
        }
    }

    attachEvents() {
        document.getElementById('tabInvoicesList')?.addEventListener('click', () => this.showSection('list'));
        document.getElementById('tabInvoicesGenerate')?.addEventListener('click', () => this.showSection('generate'));
        document.getElementById('tabTaxConfig')?.addEventListener('click', () => this.showSection('tax'));
        document.getElementById('btnShowGenerateInvoice')?.addEventListener('click', () => this.showInvoiceModal());
        document.getElementById('btnAddInvoiceItem')?.addEventListener('click', () => this.addInvoiceItem());
        document.getElementById('invoiceForm')?.addEventListener('submit', (e) => this.handleGenerateInvoice(e));
        document.getElementById('taxConfigForm')?.addEventListener('submit', (e) => this.handleCreateTaxConfig(e));

        document.addEventListener('click', async (e) => {
            const removeBtn = e.target.closest('[data-remove-item]');
            if (removeBtn) {
                const row = document.getElementById(removeBtn.dataset.removeItem);
                if (row) row.remove();
            }

            const pdfBtn = e.target.closest('[data-download-pdf]');
            if (pdfBtn) {
                await this.downloadInvoicePdf(Number(pdfBtn.dataset.downloadPdf));
            }
        });
    }

    showSection(section) {
        const list = document.getElementById('sectionInvoicesList');
        const generate = document.getElementById('sectionInvoicesGenerate');
        const tax = document.getElementById('sectionTaxConfig');

        if (!list || !generate || !tax) return;

        list.style.display = section === 'list' ? '' : 'none';
        generate.style.display = section === 'generate' ? '' : 'none';
        tax.style.display = section === 'tax' ? '' : 'none';

        if (section === 'tax') {
            this.loadTaxConfigs();
        }
    }

    async loadCustomers() {
        try {
            const customers = await apiService.get('/customers/?limit=1000');
            this.customers = Array.isArray(customers) ? customers : [];
            this.customerById = new Map(this.customers.map((c) => [c.id, c.full_name]));

            const select = document.getElementById('invoiceCustomer');
            if (!select) return;
            select.innerHTML = '<option value="">Seleccionar cliente...</option>';
            for (const customer of this.customers) {
                const option = document.createElement('option');
                option.value = String(customer.id);
                option.textContent = customer.full_name;
                select.appendChild(option);
            }
        } catch (error) {
            console.error('Error loading customers:', error);
            modal.showError('No se pudieron cargar los clientes');
        }
    }

    async loadInvoices() {
        try {
            const invoices = await apiService.get('/invoices');
            this.invoices = Array.isArray(invoices) ? invoices : [];
            this.renderInvoicesTable();
        } catch (error) {
            console.error('Error loading invoices:', error);
            modal.showError('No se pudieron cargar las facturas');
        }
    }

    renderInvoicesTable() {
        const container = document.getElementById('invoicesTableContainer');
        if (!container) return;

        if (!this.invoices.length) {
            container.innerHTML = '<p>No hay facturas registradas.</p>';
            return;
        }

        container.innerHTML = table.render({
            data: this.invoices,
            columns: [
                { key: 'invoice_number', label: 'Numero' },
                { key: 'customer_id', label: 'Cliente', formatter: (value) => this.customerById.get(value) || `Cliente #${value}` },
                { key: 'subtotal', label: 'Subtotal', formatter: (value) => Number(value || 0).toFixed(2) },
                { key: 'iva_amount', label: 'IVA', formatter: (value) => Number(value || 0).toFixed(2) },
                { key: 'retencion_amount', label: 'Retencion', formatter: (value) => Number(value || 0).toFixed(2) },
                { key: 'total', label: 'Total', formatter: (value) => `<strong>${Number(value || 0).toFixed(2)}</strong>` },
                { key: 'status', label: 'Estado' },
                { key: 'issued_at', label: 'Fecha', formatter: (value) => value ? new Date(value).toLocaleString('es-CO') : '-' },
                { key: 'id', label: 'Acciones', formatter: (value) => `<button class="btn btn-sm btn-secondary" data-download-pdf="${value}">PDF</button>` },
            ],
        });
    }

    addInvoiceItem() {
        const container = document.getElementById('invoiceItems');
        if (!container) return;

        // Build itemsOptions from services and inventory
        let itemsOptions = '<option value="">Seleccionar item...</option>';
        const itemsMap = {};

        if (Array.isArray(this.services) && this.services.length > 0) {
            itemsOptions += '<optgroup label="Servicios">';
            this.services.forEach(s => {
                const key = `service:${s.id}`;
                itemsMap[key] = s;
                itemsOptions += `<option value="${key}" data-price="${s.price ?? s.unit_price ?? 0}">${s.name || 'Sin nombre'}</option>`;
            });
            itemsOptions += '</optgroup>';
        }

        if (Array.isArray(this.inventory) && this.inventory.length > 0) {
            itemsOptions += '<optgroup label="Productos">';
            this.inventory.forEach(p => {
                if (p.item_type === 'product' && p.is_active) {
                    const key = `product:${p.id}`;
                    itemsMap[key] = p;
                    itemsOptions += `<option value="${key}" data-price="${p.unit_price || 0}">${p.name || 'Sin nombre'}</option>`;
                }
            });
            itemsOptions += '</optgroup>';
        }

        itemsOptions += '<optgroup label="Otros">';
        itemsOptions += '<option value="custom:0">Descripción personalizada</option>';
        itemsOptions += '</optgroup>';

        const id = `invoice-item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const row = document.createElement('div');
        row.id = id;
        row.className = 'form-row';
        row.innerHTML = `
            <div class="form-group" style="flex:2;">
                <label>Item *</label>
                <select data-field="item-select" required style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                    ${itemsOptions}
                </select>
            </div>
            <div class="form-group" style="flex:1;">
                <label>Cantidad *</label>
                <input type="number" min="1" step="0.01" value="1" data-field="quantity" required style="width: 100%; padding: 6px;">
            </div>
            <div class="form-group" style="flex:1;">
                <label>Precio Unit. *</label>
                <input type="number" min="0" step="0.01" data-field="unit_price" required readonly style="width: 100%; padding: 6px; background: #f9f9f9;">
            </div>
            <div class="form-group" style="display:flex; align-items:flex-end;">
                <button class="btn btn-danger" type="button" data-remove-item="${id}">Quitar</button>
            </div>
        `;
        container.appendChild(row);

        // Handle item selection
        const itemSelect = row.querySelector('[data-field="item-select"]');
        const priceInput = row.querySelector('[data-field="unit_price"]');
        const descField = row.querySelector('[data-field="description"]');

        itemSelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            if (selectedValue === 'custom:0') {
                // For custom items, show prompt
                const customDesc = prompt('Descripción del ítem:');
                if (customDesc) {
                    const customPrice = prompt('Precio unitario:');
                    if (customPrice) {
                        priceInput.value = customPrice;
                        priceInput.dataset.description = customDesc;
                    }
                } else {
                    itemSelect.value = '';
                }
            } else if (selectedValue.startsWith('service:') || selectedValue.startsWith('product:')) {
                const item = itemsMap[selectedValue];
                if (item) {
                    priceInput.value = item.price ?? item.unit_price ?? 0;
                    priceInput.dataset.itemType = selectedValue.split(':')[0];
                    priceInput.dataset.itemId = selectedValue.split(':')[1];
                }
            }
        });
    }

    collectInvoiceItems() {
        const rows = document.querySelectorAll('#invoiceItems .form-row');
        const items = [];

        for (const row of rows) {
            const itemSelect = row.querySelector('[data-field="item-select"]')?.value?.trim();
            const quantity = Number(row.querySelector('[data-field="quantity"]')?.value || 0);
            const unitPrice = Number(row.querySelector('[data-field="unit_price"]')?.value || 0);
            const priceInput = row.querySelector('[data-field="unit_price"]');

            if (!itemSelect || quantity <= 0 || unitPrice < 0) {
                continue;
            }

            let item = {
                quantity,
                unit_price: unitPrice,
                service_id: null,
                inventory_item_id: null,
                description: ''
            };

            if (itemSelect === 'custom:0') {
                // Custom items
                item.source_type = 'custom';
                item.description = priceInput.dataset.description || 'Item personalizado';
            } else if (itemSelect.startsWith('service:')) {
                // Service items
                item.source_type = 'service';
                const serviceId = parseInt(itemSelect.split(':')[1]);
                const service = this.services.find(s => s.id === serviceId);
                item.service_id = serviceId;
                item.description = service?.name || 'Servicio';
            } else if (itemSelect.startsWith('product:')) {
                // Product items
                item.source_type = 'product';
                const productId = parseInt(itemSelect.split(':')[1]);
                const product = this.inventory.find(p => p.id === productId);
                item.inventory_item_id = productId;
                item.description = product?.name || 'Producto';
            }

            items.push(item);
        }

        return items;
    }

    async handleGenerateInvoice(event) {
        event.preventDefault();

        const customerId = Number(document.getElementById('invoiceCustomer')?.value || 0);
        const items = this.collectInvoiceItems();

        if (!customerId) {
            modal.showWarning('Selecciona un cliente');
            return;
        }

        if (!items.length) {
            modal.showWarning('Agrega al menos un item valido');
            return;
        }

        const ivaInput = document.getElementById('ivaPercentage')?.value;
        const retInput = document.getElementById('retencionPercentage')?.value;

        const payload = {
            customer_id: customerId,
            items,
            notes: document.getElementById('invoiceNotes')?.value?.trim() || null,
            apply_iva: !!document.getElementById('applyIva')?.checked,
            apply_retencion: !!document.getElementById('applyRetencion')?.checked,
            iva_percentage: ivaInput ? Number(ivaInput) : null,
            retencion_percentage: retInput ? Number(retInput) : null
        };

        try {
            const invoice = await apiService.post('/invoices/generate', payload);
            modal.showSuccess(`Factura ${invoice.invoice_number} generada`);
            document.getElementById('invoiceForm')?.reset();
            document.getElementById('invoiceItems').innerHTML = '';
            this.addInvoiceItem();
            await this.loadInvoices();
            this.showSection('list');
        } catch (error) {
            console.error('Error generating invoice:', error);
            modal.showError(error.message || 'No se pudo generar la factura');
        }
    }

    async handleCreateTaxConfig(event) {
        event.preventDefault();
        const payload = {
            name: document.getElementById('taxName')?.value?.trim(),
            tax_type: document.getElementById('taxType')?.value,
            percentage: Number(document.getElementById('taxPercentage')?.value || 0),
            applies_to: document.getElementById('taxAppliesTo')?.value,
            is_active: true
        };

        if (!payload.name) {
            modal.showWarning('El nombre del impuesto es obligatorio');
            return;
        }

        try {
            await apiService.post('/tax-config', payload);
            modal.showSuccess('Configuracion de impuesto guardada');
            document.getElementById('taxConfigForm')?.reset();
            await this.loadTaxConfigs();
        } catch (error) {
            console.error('Error creating tax config:', error);
            modal.showError(error.message || 'No se pudo guardar la configuracion');
        }
    }

    async loadTaxConfigs() {
        const container = document.getElementById('taxConfigsContainer');
        if (!container) return;
        try {
            const configs = await apiService.get('/tax-config');
            if (!Array.isArray(configs) || configs.length === 0) {
                container.innerHTML = '<p>No hay configuraciones de impuestos.</p>';
                return;
            }

            container.innerHTML = configs.map((config) => `
                <div class="card" style="margin-bottom:8px;">
                    <div class="card-body" style="padding:10px 12px;">
                        <strong>${config.name}</strong> - ${config.tax_type.toUpperCase()} ${Number(config.percentage).toFixed(2)}%
                        <div style="font-size:12px; color:#666;">Aplica a: ${config.applies_to} | Activo: ${config.is_active ? 'Si' : 'No'}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading tax configs:', error);
            container.innerHTML = '<p>No se pudieron cargar los impuestos.</p>';
        }
    }

    async downloadInvoicePdf(invoiceId) {
        const token = localStorage.getItem('token');
        if (!token) {
            modal.showWarning('Sesion expirada');
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:8000/invoices/${invoiceId}/pdf`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                let message = `Error ${response.status}`;
                try {
                    const error = await response.json();
                    if (error?.detail) message = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
                } catch (_err) {
                    // No-op
                }
                throw new Error(message);
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `factura-${invoiceId}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error('Error downloading invoice pdf:', error);
            modal.showError(error.message || 'No se pudo descargar el PDF');
        }
    }

    formatCurrency(value) {
        if (!value) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
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
                    const servicePrice = s.price ?? s.unit_price ?? 0;
                    itemsOptions += `<option value="service:${s.id}" data-price="${servicePrice}">${s.name || 'Sin nombre'} (${this.formatCurrency(servicePrice)})</option>`;
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

        // Read URL params and clear them immediately so they don't persist on re-open
        const quickParams = new URLSearchParams(window.location.search || '');
        const prefillCustomerId = quickParams.get('customer_id');
        const prefillSubtotal = Number(quickParams.get('subtotal') || 0);
        const prefillNotes = quickParams.get('notes') || '';
        const prefillServiceId = Number(quickParams.get('service_id') || 0);
        const prefillAuthorizationId = Number(quickParams.get('authorization_id') || 0);
        if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }

        // Setup item management — scope ALL queries to the modal element to avoid
        // collisions with same-ID elements in the embedded page form
        const invoiceItems = [];
        const form = invoiceModal.querySelector('#invoiceForm');
        const itemsContainer = invoiceModal.querySelector('#invoiceItems');
        const itemSelect = invoiceModal.querySelector('#itemSelect');
        const itemQty = invoiceModal.querySelector('#itemQty');
        const btnAddItem = invoiceModal.querySelector('#btnAddItem');
        const subtotalInput = invoiceModal.querySelector('#invoiceSubtotal');
        
        // Store services/products for reference
        const itemsMap = {};
        services.forEach(s => itemsMap[`service:${s.id}`] = s);
        inventory.forEach(p => itemsMap[`product:${p.id}`] = p);

        // Capture formatCurrency context
        const formatCurrency = (value) => {
            if (!value) return '$0';
            return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
        };

        const updateTotal = () => {
            const total = invoiceItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
            subtotalInput.value = total.toFixed(2);
        };

        const renderItems = () => {
            itemsContainer.innerHTML = invoiceItems.map((item, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f9f9f9; border-radius: 4px; margin-bottom: 6px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; font-size: 13px;">${item.description}</div>
                        <div style="font-size: 11px; color: #7f8c8d;">Cantidad: ${item.quantity} × ${formatCurrency(item.unit_price)}</div>
                    </div>
                    <div style="font-weight: 600; margin-right: 12px;">${formatCurrency(item.unit_price * item.quantity)}</div>
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

        const customerSelect = form?.querySelector('select[name="customer_id"]');
        const notesField = form?.querySelector('textarea[name="notes"]');
        if (customerSelect && prefillCustomerId) {
            customerSelect.value = prefillCustomerId;
        }
        if (notesField && prefillNotes) {
            notesField.value = prefillNotes;
        }
        if (prefillServiceId > 0 && invoiceItems.length === 0) {
            const service = services.find((item) => item.id === prefillServiceId);
            if (service) {
                invoiceItems.push({
                    source_type: 'service',
                    service_id: service.id,
                    description: service.name || 'Servicio',
                    unit_price: parseFloat(service.price ?? service.unit_price ?? 0),
                    quantity: 1,
                });
                renderItems();
                updateTotal();
            }
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
                        unit_price: parseFloat(service.price ?? service.unit_price ?? 0),
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
                const existingIdx = invoiceItems.findIndex(i =>
                    i.source_type === item.source_type &&
                    (i.service_id ?? null) === (item.service_id ?? null) &&
                    (i.inventory_item_id ?? null) === (item.inventory_item_id ?? null) &&
                    i.source_type !== 'custom'
                );
                if (existingIdx >= 0) {
                    invoiceItems[existingIdx].quantity += item.quantity;
                } else {
                    invoiceItems.push(item);
                }
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
                authorization_id: prefillAuthorizationId || null,
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
                
                await this.loadInvoices();
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

export default new InvoicesView();
