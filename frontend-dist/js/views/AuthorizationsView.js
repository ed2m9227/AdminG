import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import modal from '../components/Modal.js';
import router from '../utils/router.js';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

class AuthorizationsView {
    constructor() {
        this.authorizations = [];
        this.customers = [];
        this.documents = [];
        this.services = [];
        this.assignees = [];
        this.currentUser = null;
        this.boundClickHandler = null;
    }

    render() {
        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Autorizaciones</h2>
                    <button class="btn btn-primary" id="btnNewAuthorization">+ Nueva autorización</button>
                </div>
                <div class="card-body">
                    <div id="authorizationsList"></div>
                </div>
            </div>
        `;
    }

    async init() {
        this.currentUser = authService.getCurrentUser() || await authService.loadCurrentUser();
        await Promise.all([
            this.loadCustomers(),
            this.loadDocuments(),
            this.loadServices(),
            this.loadAssignees(),
        ]);
        await this.loadAuthorizations();
        this.attachEvents();
    }

    attachEvents() {
        document.getElementById('btnNewAuthorization')?.addEventListener('click', () => this.openFormModal());

        if (this.boundClickHandler) {
            document.removeEventListener('click', this.boundClickHandler);
        }

        this.boundClickHandler = async (event) => {
            const editButton = event.target.closest('[data-edit-authorization]');
            if (editButton) {
                this.openFormModal(Number(editButton.dataset.editAuthorization));
                return;
            }

            const invoiceButton = event.target.closest('[data-create-invoice]');
            if (invoiceButton) {
                const record = this.authorizations.find((item) => item.id === Number(invoiceButton.dataset.createInvoice));
                if (record) {
                    await this.openInvoiceForAuthorization(record);
                }
                return;
            }

            const paymentButton = event.target.closest('[data-create-payment]');
            if (paymentButton) {
                const record = this.authorizations.find((item) => item.id === Number(paymentButton.dataset.createPayment));
                if (record) {
                    await this.openPaymentForAuthorization(record);
                }
            }
        };

        document.addEventListener('click', this.boundClickHandler);
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
        } catch (error) {
            modal.showError(error.message || 'No se pudieron cargar los documentos');
        }
    }

    async loadServices() {
        try {
            const result = await apiService.get('/services/');
            this.services = Array.isArray(result) ? result : [];
        } catch (_error) {
            this.services = [];
        }
    }

    async loadAssignees() {
        try {
            const result = await apiService.get('/authorizations/assignees');
            this.assignees = Array.isArray(result) ? result : [];
        } catch (error) {
            modal.showError(error.message || 'No se pudo cargar el equipo de aprobación');
        }
    }

    async loadAuthorizations() {
        try {
            const result = await apiService.get('/authorizations/');
            this.authorizations = Array.isArray(result) ? result : [];
            this.renderAuthorizations();
        } catch (error) {
            modal.showError(error.message || 'No se pudieron cargar las autorizaciones');
        }
    }

    renderAuthorizations() {
        const container = document.getElementById('authorizationsList');
        if (!container) return;

        if (!this.authorizations.length) {
            container.innerHTML = '<p>No hay autorizaciones registradas.</p>';
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Título</th>
                            <th>Servicio</th>
                            <th>Solicitó</th>
                            <th>Responsable</th>
                            <th>Estado</th>
                            <th>Decisión</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.authorizations.map((record) => `
                            <tr>
                                <td>${record.customer_name || `Cliente #${record.customer_id}`}</td>
                                <td>${record.title || '-'}</td>
                                <td>${record.service_name || '-'}</td>
                                <td>${record.requested_by_name || '-'}</td>
                                <td>${record.assigned_approver_name || 'Cuenta principal'}</td>
                                <td>${this.getStatusLabel(record.status)}</td>
                                <td>${record.decision_reason || '-'}</td>
                                <td>${this.renderRowActions(record)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderRowActions(record) {
        const actions = [`<button class="btn btn-sm btn-secondary" data-edit-authorization="${record.id}">Editar</button>`];
        if (record.status === 'approved' && !record.linked_invoice_id) {
            actions.push(`<button class="btn btn-sm btn-primary" data-create-invoice="${record.id}">Facturar</button>`);
        }
        if (record.status === 'approved' && !record.linked_payment_id) {
            actions.push(`<button class="btn btn-sm btn-success" data-create-payment="${record.id}">Pago</button>`);
        }
        if (record.linked_invoice_number) {
            actions.push(`<span class="badge badge-secondary">${record.linked_invoice_number}</span>`);
        }
        if (record.linked_payment_id) {
            actions.push(`<span class="badge badge-success">Pago #${record.linked_payment_id}</span>`);
        }
        return actions.join(' ');
    }

    getStatusLabel(status) {
        const labels = {
            pending: 'Pendiente',
            approved: 'Aprobada',
            rejected: 'Rechazada',
            expired: 'Vencida'
        };
        return labels[status] || status || '-';
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

    buildDocumentOptions(selectedId) {
        return [
            '<option value="">Sin documento relacionado</option>',
            ...this.documents.map((record) => `
                <option value="${record.id}" ${Number(selectedId) === Number(record.id) ? 'selected' : ''}>
                    ${escapeHtml(`${record.title} · ${record.customer_name || `Cliente #${record.customer_id}`}`)}
                </option>
            `)
        ].join('');
    }

    buildApproverOptions(selectedId) {
        const options = ['<option value="">Cuenta principal decide</option>'];
        this.assignees.forEach((user) => {
            const roleLabel = user.is_owner ? 'Cuenta principal' : (user.role || 'Equipo');
            const displayName = user.full_name || user.email || `Usuario #${user.id}`;
            options.push(`
                <option value="${user.id}" ${Number(selectedId) === Number(user.id) ? 'selected' : ''}>
                    ${escapeHtml(`${displayName} · ${roleLabel}`)}
                </option>
            `);
        });
        if (this.assignees.length === 0) {
            options.push('<option value="">No hay gerentes activos disponibles</option>');
        }
        return options.join('');
    }

    buildServiceOptions(selectedValue) {
        return [
            '<option value="">Seleccionar servicio...</option>',
            `<option value="__manual__" ${selectedValue === '__manual__' ? 'selected' : ''}>Otro (texto manual)</option>`,
            ...this.services.map((service) => `
                <option value="${service.id}" ${String(selectedValue) === String(service.id) ? 'selected' : ''}>
                    ${escapeHtml(service.name || `Servicio #${service.id}`)}
                </option>
            `)
        ].join('');
    }

    buildFormContent(record = null) {
        const current = record || {};
        const serviceSelectValue = current.service_id ? String(current.service_id) : (current.service_name ? '__manual__' : '');
        const showManual = serviceSelectValue === '__manual__';

        return `
            <div class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Cliente *</label>
                        <select id="authorizationCustomer" required>${this.buildCustomerOptions(current.customer_id)}</select>
                    </div>
                    <div class="form-group">
                        <label>Documento relacionado</label>
                        <select id="authorizationDocument">${this.buildDocumentOptions(current.document_id)}</select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Título *</label>
                        <input id="authorizationTitle" type="text" required placeholder="Ej: Autorización baño medicado" value="${escapeHtml(current.title || '')}">
                    </div>
                    <div class="form-group">
                        <label>Responsable de aprobación</label>
                        <select id="authorizationApprover">${this.buildApproverOptions(current.assigned_approver_user_id)}</select>
                        <small style="display:block; margin-top:4px; color:#6b7280; font-size:11px;">Solo gerentes activos (Mi Equipo) que ya aceptaron invitación</small>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Servicio / procedimiento</label>
                        <select id="authorizationServiceId">${this.buildServiceOptions(serviceSelectValue)}</select>
                        <input id="authorizationServiceManual" type="text" placeholder="Servicio o motivo" value="${escapeHtml(current.service_name || '')}" style="${showManual ? '' : 'display:none; '}margin-top:6px;">
                    </div>
                    <div class="form-group">
                        <label>Número de autorización</label>
                        <input id="authorizationNumber" type="text" placeholder="Consecutivo / referencia externa" value="${escapeHtml(current.authorization_number || '')}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Estado *</label>
                        <select id="authorizationStatus" required>
                            <option value="pending" ${(!current.status || current.status === 'pending') ? 'selected' : ''}>Pendiente</option>
                            <option value="approved" ${current.status === 'approved' ? 'selected' : ''}>Aprobada</option>
                            <option value="rejected" ${current.status === 'rejected' ? 'selected' : ''}>Rechazada</option>
                            <option value="expired" ${current.status === 'expired' ? 'selected' : ''}>Vencida</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Válida hasta</label>
                        <input id="authorizationValidUntil" type="datetime-local" value="${current.valid_until ? this.toDatetimeLocal(current.valid_until) : ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Notas de solicitud</label>
                    <textarea id="authorizationNotes" rows="3" placeholder="Observaciones clínicas, administrativas o restricciones">${escapeHtml(current.notes || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>Criterio / motivo de decisión</label>
                    <textarea id="authorizationDecisionReason" rows="3" placeholder="Obligatorio al aprobar o rechazar">${escapeHtml(current.decision_reason || '')}</textarea>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
                    <button class="btn btn-secondary" type="button" data-close-authorization-modal>Cancelar</button>
                    <button class="btn btn-primary" type="button" data-save-authorization>${record ? 'Actualizar autorización' : 'Guardar autorización'}</button>
                </div>
            </div>
        `;
    }

    openFormModal(authorizationId = null) {
        const record = authorizationId ? this.authorizations.find((item) => item.id === authorizationId) : null;
        const modalEl = modal.show({
            title: record ? 'Editar autorización' : 'Nueva autorización',
            content: this.buildFormContent(record),
            size: 'large',
        });

        modalEl.querySelector('#authorizationServiceId')?.addEventListener('change', () => this.toggleManualServiceInput(modalEl));

        modalEl.addEventListener('click', async (event) => {
            if (event.target.closest('[data-close-authorization-modal]')) {
                modal.close(modalEl);
                return;
            }
            if (!event.target.closest('[data-save-authorization]')) return;
            await this.handleSubmit(modalEl, record?.id || 0);
        });
    }

    toggleManualServiceInput(modalEl) {
        const serviceSelect = modalEl.querySelector('#authorizationServiceId');
        const manualInput = modalEl.querySelector('#authorizationServiceManual');
        if (!serviceSelect || !manualInput) return;

        if (serviceSelect.value === '__manual__') {
            manualInput.style.display = '';
        } else {
            manualInput.style.display = 'none';
            manualInput.value = '';
        }
    }

    toDatetimeLocal(value) {
        const date = new Date(value);
        const pad = (number) => String(number).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    buildPrefillQuery(record) {
        const params = new URLSearchParams();
        params.set('customer_id', String(record.customer_id));
        params.set('authorization_id', String(record.id));
        if (record.service_id) {
            params.set('service_id', String(record.service_id));
        }
        params.set('notes', `${record.title || 'Autorización'}${record.authorization_number ? ` · ${record.authorization_number}` : ''}`);
        return params.toString();
    }

    async openInvoiceForAuthorization(record) {
        const query = this.buildPrefillQuery(record);
        window.history.replaceState({}, document.title, `${window.location.pathname}?${query}${window.location.hash}`);
        await router.navigate('invoices');
        setTimeout(() => document.getElementById('btnShowGenerateInvoice')?.click(), 80);
    }

    async openPaymentForAuthorization(record) {
        const query = this.buildPrefillQuery(record);
        window.history.replaceState({}, document.title, `${window.location.pathname}?${query}${window.location.hash}`);
        await router.navigate('payments');
        setTimeout(() => document.getElementById('btnNewPayment')?.click(), 80);
    }

    async handleSubmit(modalEl, id = 0) {
        const validUntil = modalEl.querySelector('#authorizationValidUntil')?.value;
        const selectedService = modalEl.querySelector('#authorizationServiceId')?.value || '';
        const manualService = modalEl.querySelector('#authorizationServiceManual')?.value?.trim() || '';
        const payload = {
            customer_id: Number(modalEl.querySelector('#authorizationCustomer')?.value || 0),
            document_id: Number(modalEl.querySelector('#authorizationDocument')?.value || 0) || null,
            assigned_approver_user_id: Number(modalEl.querySelector('#authorizationApprover')?.value || 0) || null,
            title: modalEl.querySelector('#authorizationTitle')?.value?.trim(),
            service_id: selectedService && selectedService !== '__manual__' ? Number(selectedService) : null,
            service_name: selectedService === '__manual__' ? (manualService || null) : null,
            authorization_number: modalEl.querySelector('#authorizationNumber')?.value?.trim() || null,
            status: modalEl.querySelector('#authorizationStatus')?.value,
            valid_until: validUntil ? new Date(validUntil).toISOString() : null,
            notes: modalEl.querySelector('#authorizationNotes')?.value?.trim() || null,
            decision_reason: modalEl.querySelector('#authorizationDecisionReason')?.value?.trim() || null,
        };

        if (!payload.customer_id || !payload.title) {
            modal.showWarning('Completa cliente y título');
            return;
        }

        try {
            if (id) {
                await apiService.put(`/authorizations/${id}`, payload);
            } else {
                const createPayload = { ...payload };
                delete createPayload.status;
                delete createPayload.decision_reason;
                await apiService.post('/authorizations/', createPayload);
                if (payload.status && payload.status !== 'pending') {
                    const latest = await apiService.get('/authorizations/');
                    const created = Array.isArray(latest) ? latest[0] : null;
                    if (created?.id) {
                        await apiService.put(`/authorizations/${created.id}`, {
                            status: payload.status,
                            decision_reason: payload.decision_reason,
                        });
                    }
                }
            }
            modal.close(modalEl);
            modal.showSuccess(id ? 'Autorización actualizada' : 'Autorización creada');
            await this.loadAuthorizations();
        } catch (error) {
            modal.showError(error.message || 'No se pudo guardar la autorización');
        }
    }
}

export default new AuthorizationsView();