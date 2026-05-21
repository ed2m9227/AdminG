import apiService from '../services/api.service.js';
import modal from '../components/Modal.js';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
                    <button class="btn btn-primary" id="btnNewDocument">+ Nuevo documento</button>
                </div>
                <div class="card-body">
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
        document.getElementById('btnNewDocument')?.addEventListener('click', () => this.openFormModal());

        if (this.boundClickHandler) {
            document.removeEventListener('click', this.boundClickHandler);
        }

        this.boundClickHandler = (event) => {
            const editButton = event.target.closest('[data-edit-document]');
            if (!editButton) return;
            this.openFormModal(Number(editButton.dataset.editDocument));
        };

        document.addEventListener('click', this.boundClickHandler);
        // global click handler for download PDF
        document.addEventListener('click', async (e) => {
            const pdfBtn = e.target.closest('[data-download-pdf]');
            if (pdfBtn) {
                await this.downloadDocumentPdf(Number(pdfBtn.dataset.downloadPdf));
            }
        });
    }

    async loadCustomers() {
        try {
            const result = await apiService.get('/customers/?limit=1000');
            this.customers = Array.isArray(result) ? result : [];
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
                                <td>
                                    <button class="btn btn-sm btn-secondary" data-edit-document="${record.id}">Editar</button>
                                    <button class="btn btn-sm btn-secondary" data-download-pdf="${record.id}" style="margin-left:6px;">PDF</button>
                                </td>
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

    buildCustomerOptions(selectedId) {
        return [
            '<option value="">Seleccionar cliente...</option>',
            ...this.customers.map((customer) => `
                <option value="${customer.id}" ${Number(selectedId) === Number(customer.id) ? 'selected' : ''}>
                    ${escapeHtml(customer.full_name || 'Sin nombre')}
                </option>
            `)
        ].join('');
    }

    buildFormContent(record = null) {
        const current = record || {};
        return `
            <div class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Cliente *</label>
                        <select id="documentCustomer" required>${this.buildCustomerOptions(current.customer_id)}</select>
                    </div>
                    <div class="form-group">
                        <label>Tipo *</label>
                        <select id="documentType" required>
                            <option value="consent" ${current.document_type === 'consent' ? 'selected' : ''}>Consentimiento</option>
                            <option value="responsibility" ${current.document_type === 'responsibility' ? 'selected' : ''}>Responsabilidad</option>
                            <option value="support" ${current.document_type === 'support' ? 'selected' : ''}>Soporte operativo</option>
                            <option value="receipt" ${current.document_type === 'receipt' ? 'selected' : ''}>Recepción</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Título *</label>
                        <input id="documentTitle" type="text" required placeholder="Ej: Consentimiento cirugía menor" value="${escapeHtml(current.title || '')}">
                    </div>
                    <div class="form-group">
                        <label>Estado *</label>
                        <select id="documentStatus" required>
                            <option value="draft" ${(!current.status || current.status === 'draft') ? 'selected' : ''}>Borrador</option>
                            <option value="issued" ${current.status === 'issued' ? 'selected' : ''}>Emitido</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Contenido</label>
                    <textarea id="documentContent" rows="6" placeholder="Texto del documento, alcance, observaciones, firma, etc.">${escapeHtml(current.content || '')}</textarea>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
                    <button class="btn btn-secondary" type="button" data-close-document-modal>Cancelar</button>
                    <button class="btn btn-primary" type="button" data-save-document>${record ? 'Actualizar documento' : 'Guardar documento'}</button>
                </div>
            </div>
        `;
    }

    openFormModal(documentId = null) {
        const record = documentId ? this.documents.find((item) => item.id === documentId) : null;
        const modalEl = modal.show({
            title: record ? 'Editar documento' : 'Nuevo documento',
            content: this.buildFormContent(record),
            size: 'large',
        });

        modalEl.addEventListener('click', async (event) => {
            if (event.target.closest('[data-close-document-modal]')) {
                modal.close(modalEl);
                return;
            }
            if (!event.target.closest('[data-save-document]')) return;
            await this.handleSubmit(modalEl, record?.id || 0);
        });
    }

    async handleSubmit(modalEl, id = 0) {
        const payload = {
            customer_id: Number(modalEl.querySelector('#documentCustomer')?.value || 0),
            document_type: modalEl.querySelector('#documentType')?.value,
            title: modalEl.querySelector('#documentTitle')?.value?.trim(),
            status: modalEl.querySelector('#documentStatus')?.value,
            content: modalEl.querySelector('#documentContent')?.value?.trim() || null,
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
            modal.close(modalEl);
            modal.showSuccess(id ? 'Documento actualizado' : 'Documento creado');
            await this.loadDocuments();
        } catch (error) {
            modal.showError(error.message || 'No se pudo guardar el documento');
        }
    }

    async downloadDocumentPdf(documentId) {
        const token = localStorage.getItem('token');
        if (!token) {
            modal.showWarning('Sesion expirada');
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:8000/documents/${documentId}/pdf`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                let message = `Error ${response.status}`;
                try {
                    const error = await response.json();
                    if (error?.detail) message = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
                } catch (_err) {}
                throw new Error(message);
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `documento-${documentId}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error('Error downloading document pdf:', error);
            modal.showError(error.message || 'No se pudo descargar el PDF');
        }
    }
}

export default new DocumentsView();