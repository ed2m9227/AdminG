import apiService from '../services/api.service.js';
import modal from '../components/Modal.js';

class DocumentsView {
    constructor() {
        this.documents = [];
        this.customers = [];
        this.boundClickHandler = null;
    }

    render() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Documentos</h2>
                </div>
                <div class="card-body">
                    <form id="documentsForm" class="modal-form" style="margin-bottom: 20px;">
                        <input type="hidden" id="documentId">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Cliente *</label>
                                <select id="documentCustomer" required></select>
                            </div>
                            <div class="form-group">
                                <label>Tipo *</label>
                                <select id="documentType" required>
                                    <option value="consent">Consentimiento</option>
                                    <option value="responsibility">Responsabilidad</option>
                                    <option value="support">Soporte operativo</option>
                                    <option value="receipt">Recepción</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Título *</label>
                                <input id="documentTitle" type="text" required placeholder="Ej: Consentimiento cirugía menor">
                            </div>
                            <div class="form-group">
                                <label>Estado *</label>
                                <select id="documentStatus" required>
                                    <option value="draft">Borrador</option>
                                    <option value="issued">Emitido</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Contenido</label>
                            <textarea id="documentContent" rows="6" placeholder="Texto del documento, alcance, observaciones, firma, etc."></textarea>
                        </div>
                        <div class="form-actions">
                            <button class="btn btn-primary" type="submit">Guardar documento</button>
                            <button class="btn btn-secondary" type="button" id="btnResetDocumentForm">Limpiar</button>
                        </div>
                    </form>
                    <div id="documentsList"></div>
                </div>
            </div>
        `;
    }

    async init() {
        await this.loadCustomers();
        await this.loadDocuments();
        this.attachEvents();
    }

    attachEvents() {
        document.getElementById('documentsForm')?.addEventListener('submit', (event) => this.handleSubmit(event));
        document.getElementById('btnResetDocumentForm')?.addEventListener('click', () => this.resetForm());

        if (this.boundClickHandler) {
            document.removeEventListener('click', this.boundClickHandler);
        }

        this.boundClickHandler = (event) => {
            const editButton = event.target.closest('[data-edit-document]');
            if (!editButton) return;
            const documentId = Number(editButton.dataset.editDocument);
            this.populateForm(documentId);
        };

        document.addEventListener('click', this.boundClickHandler);
    }

    async loadCustomers() {
        try {
            const result = await apiService.get('/customers/?limit=1000');
            this.customers = Array.isArray(result) ? result : [];
            const select = document.getElementById('documentCustomer');
            if (!select) return;
            select.innerHTML = '<option value="">Seleccionar cliente...</option>';
            this.customers.forEach((customer) => {
                const option = document.createElement('option');
                option.value = String(customer.id);
                option.textContent = customer.full_name || 'Sin nombre';
                select.appendChild(option);
            });
        } catch (error) {
            modal.showError(error.message || 'No se pudieron cargar los clientes');
        }
    }

    async loadDocuments() {
        try {
            const result = await apiService.get('/documents/');
            this.documents = Array.isArray(result) ? result : [];
            this.renderDocuments();
        } catch (error) {
            modal.showError(error.message || 'No se pudieron cargar los documentos');
        }
    }

    renderDocuments() {
        const container = document.getElementById('documentsList');
        if (!container) return;

        if (!this.documents.length) {
            container.innerHTML = '<p>No hay documentos registrados.</p>';
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Tipo</th>
                            <th>Título</th>
                            <th>Gestionado por</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.documents.map((record) => `
                            <tr>
                                <td>${record.customer_name || `Cliente #${record.customer_id}`}</td>
                                <td>${this.getTypeLabel(record.document_type)}</td>
                                <td>${record.title || '-'}</td>
                                <td>${record.created_by_name || '-'}</td>
                                <td>${this.getStatusLabel(record.status)}</td>
                                <td>${record.created_at ? new Date(record.created_at).toLocaleString('es-CO') : '-'}</td>
                                <td><button class="btn btn-sm btn-secondary" data-edit-document="${record.id}">Editar</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    getTypeLabel(type) {
        const labels = {
            consent: 'Consentimiento',
            responsibility: 'Responsabilidad',
            support: 'Soporte',
            receipt: 'Recepción'
        };
        return labels[type] || type || '-';
    }

    getStatusLabel(status) {
        return status === 'issued' ? 'Emitido' : 'Borrador';
    }

    populateForm(documentId) {
        const record = this.documents.find((item) => item.id === documentId);
        if (!record) return;

        document.getElementById('documentId').value = String(record.id);
        document.getElementById('documentCustomer').value = String(record.customer_id);
        document.getElementById('documentType').value = record.document_type || 'consent';
        document.getElementById('documentTitle').value = record.title || '';
        document.getElementById('documentStatus').value = record.status || 'draft';
        document.getElementById('documentContent').value = record.content || '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    resetForm() {
        document.getElementById('documentsForm')?.reset();
        const hiddenId = document.getElementById('documentId');
        if (hiddenId) hiddenId.value = '';
    }

    async handleSubmit(event) {
        event.preventDefault();
        const id = Number(document.getElementById('documentId')?.value || 0);
        const payload = {
            customer_id: Number(document.getElementById('documentCustomer')?.value || 0),
            document_type: document.getElementById('documentType')?.value,
            title: document.getElementById('documentTitle')?.value?.trim(),
            status: document.getElementById('documentStatus')?.value,
            content: document.getElementById('documentContent')?.value?.trim() || null,
        };

        if (!payload.customer_id || !payload.title || !payload.document_type) {
            modal.showWarning('Completa cliente, tipo y título');
            return;
        }

        try {
            if (id) {
                await apiService.put(`/documents/${id}`, payload);
            } else {
                await apiService.post('/documents/', payload);
            }
            modal.showSuccess(id ? 'Documento actualizado' : 'Documento creado');
            this.resetForm();
            await this.loadDocuments();
        } catch (error) {
            modal.showError(error.message || 'No se pudo guardar el documento');
        }
    }
}

export default new DocumentsView();
