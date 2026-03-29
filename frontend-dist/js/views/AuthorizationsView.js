import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import modal from '../components/Modal.js';
import router from '../utils/router.js';

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
                </div>
                <div class="card-body">
                    <form id="authorizationsForm" class="modal-form" style="margin-bottom: 20px;">
                        <input type="hidden" id="authorizationId">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Cliente *</label>
                                <select id="authorizationCustomer" required></select>
                            </div>
                            <div class="form-group">
                                <label>Documento relacionado</label>
                                <select id="authorizationDocument"></select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Título *</label>
                                <input id="authorizationTitle" type="text" required placeholder="Ej: Autorización baño medicado">
                            </div>
                            <div class="form-group">
                                <label>Responsable de aprobación</label>
                                <select id="authorizationApprover"></select>
                                <small style="display:block; margin-top:4px; color:#6b7280; font-size:11px;">Solo gerentes activos (Mi Equipo) que ya aceptaron invitación</small>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Servicio / procedimiento</label>
                                <select id="authorizationServiceId">
                                    <option value="">Seleccionar servicio...</option>
                                    <option value="__manual__">Otro (texto manual)</option>
                                </select>
                                <input id="authorizationServiceManual" type="text" placeholder="Servicio o motivo" style="display:none; margin-top:6px;">
                            </div>
                            <div class="form-group">
                                <label>Número de autorización</label>
                                <input id="authorizationNumber" type="text" placeholder="Consecutivo / referencia externa">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Estado *</label>
                                <select id="authorizationStatus" required>
                                    <option value="pending">Pendiente</option>
                                    <option value="approved">Aprobada</option>
                                    <option value="rejected">Rechazada</option>
                                    <option value="expired">Vencida</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Válida hasta</label>
                                <input id="authorizationValidUntil" type="datetime-local">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Notas de solicitud</label>
                            <textarea id="authorizationNotes" rows="3" placeholder="Observaciones clínicas, administrativas o restricciones"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Criterio / motivo de decisión</label>
                            <textarea id="authorizationDecisionReason" rows="3" placeholder="Obligatorio al aprobar o rechazar"></textarea>
                        </div>
                        <div class="form-actions">
                            <button class="btn btn-primary" type="submit">Guardar autorización</button>
                            <button class="btn btn-secondary" type="button" id="btnResetAuthorizationForm">Limpiar</button>
                        </div>
                    </form>
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
        document.getElementById('authorizationsForm')?.addEventListener('submit', (event) => this.handleSubmit(event));
        document.getElementById('btnResetAuthorizationForm')?.addEventListener('click', () => this.resetForm());
        document.getElementById('authorizationServiceId')?.addEventListener('change', (event) => {
            const manualInput = document.getElementById('authorizationServiceManual');
            if (!manualInput) return;
            if (event.target.value === '__manual__') {
                manualInput.style.display = '';
            } else {
                manualInput.style.display = 'none';
                manualInput.value = '';
            }
        });

        if (this.boundClickHandler) {
            document.removeEventListener('click', this.boundClickHandler);
        }

        this.boundClickHandler = async (event) => {
            const editButton = event.target.closest('[data-edit-authorization]');
            if (editButton) {
                this.populateForm(Number(editButton.dataset.editAuthorization));
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
            const select = document.getElementById('authorizationCustomer');
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
            const select = document.getElementById('authorizationDocument');
            if (!select) return;
            select.innerHTML = '<option value="">Sin documento relacionado</option>';
            this.documents.forEach((record) => {
                const option = document.createElement('option');
                option.value = String(record.id);
                option.textContent = `${record.title} · ${record.customer_name || `Cliente #${record.customer_id}`}`;
                select.appendChild(option);
            });
        } catch (error) {
            modal.showError(error.message || 'No se pudieron cargar los documentos');
        }
    }

    async loadServices() {
        try {
            const result = await apiService.get('/services/');
            this.services = Array.isArray(result) ? result : [];
            const select = document.getElementById('authorizationServiceId');
            if (!select) return;

            const currentValue = select.value;
            select.innerHTML = '<option value="">Seleccionar servicio...</option><option value="__manual__">Otro (texto manual)</option>';
            this.services.forEach((service) => {
                const option = document.createElement('option');
                option.value = String(service.id);
                option.textContent = service.name || `Servicio #${service.id}`;
                select.appendChild(option);
            });

            if (currentValue) {
                select.value = currentValue;
            }
        } catch (_error) {
            this.services = [];
        }
    }

    async loadAssignees() {
        try {
            const result = await apiService.get('/authorizations/assignees');
            this.assignees = Array.isArray(result) ? result : [];
            const select = document.getElementById('authorizationApprover');
            if (!select) return;
            select.innerHTML = '<option value="">Cuenta principal decide</option>';
            this.assignees.forEach((user) => {
                const option = document.createElement('option');
                option.value = String(user.id);
                const roleLabel = user.is_owner ? 'Cuenta principal' : (user.role || 'Equipo');
                option.textContent = `${user.email} · ${roleLabel}`;
                select.appendChild(option);
            });
            if (this.assignees.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No hay gerentes activos disponibles';
                select.appendChild(option);
            }
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

    populateForm(authorizationId) {
        const record = this.authorizations.find((item) => item.id === authorizationId);
        if (!record) return;

        document.getElementById('authorizationId').value = String(record.id);
        document.getElementById('authorizationCustomer').value = String(record.customer_id);
        document.getElementById('authorizationDocument').value = record.document_id ? String(record.document_id) : '';
        document.getElementById('authorizationTitle').value = record.title || '';
        document.getElementById('authorizationApprover').value = record.assigned_approver_user_id ? String(record.assigned_approver_user_id) : '';

        const serviceSelect = document.getElementById('authorizationServiceId');
        const manualInput = document.getElementById('authorizationServiceManual');
        if (serviceSelect) {
            if (record.service_id) {
                serviceSelect.value = String(record.service_id);
                if (manualInput) {
                    manualInput.style.display = 'none';
                    manualInput.value = '';
                }
            } else if (record.service_name) {
                serviceSelect.value = '__manual__';
                if (manualInput) {
                    manualInput.style.display = '';
                    manualInput.value = record.service_name;
                }
            } else {
                serviceSelect.value = '';
                if (manualInput) {
                    manualInput.style.display = 'none';
                    manualInput.value = '';
                }
            }
        }

        document.getElementById('authorizationNumber').value = record.authorization_number || '';
        document.getElementById('authorizationStatus').value = record.status || 'pending';
        document.getElementById('authorizationValidUntil').value = record.valid_until ? this.toDatetimeLocal(record.valid_until) : '';
        document.getElementById('authorizationNotes').value = record.notes || '';
        document.getElementById('authorizationDecisionReason').value = record.decision_reason || '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    toDatetimeLocal(value) {
        const date = new Date(value);
        const pad = (number) => String(number).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    resetForm() {
        document.getElementById('authorizationsForm')?.reset();
        const hiddenId = document.getElementById('authorizationId');
        if (hiddenId) hiddenId.value = '';
        const manualInput = document.getElementById('authorizationServiceManual');
        if (manualInput) {
            manualInput.style.display = 'none';
            manualInput.value = '';
        }
        const statusSelect = document.getElementById('authorizationStatus');
        if (statusSelect) statusSelect.value = 'pending';
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

    async handleSubmit(event) {
        event.preventDefault();
        const id = Number(document.getElementById('authorizationId')?.value || 0);
        const validUntil = document.getElementById('authorizationValidUntil')?.value;
        const selectedService = document.getElementById('authorizationServiceId')?.value || '';
        const manualService = document.getElementById('authorizationServiceManual')?.value?.trim() || '';
        const payload = {
            customer_id: Number(document.getElementById('authorizationCustomer')?.value || 0),
            document_id: Number(document.getElementById('authorizationDocument')?.value || 0) || null,
            assigned_approver_user_id: Number(document.getElementById('authorizationApprover')?.value || 0) || null,
            title: document.getElementById('authorizationTitle')?.value?.trim(),
            service_id: selectedService && selectedService !== '__manual__' ? Number(selectedService) : null,
            service_name: selectedService === '__manual__' ? (manualService || null) : null,
            authorization_number: document.getElementById('authorizationNumber')?.value?.trim() || null,
            status: document.getElementById('authorizationStatus')?.value,
            valid_until: validUntil ? new Date(validUntil).toISOString() : null,
            notes: document.getElementById('authorizationNotes')?.value?.trim() || null,
            decision_reason: document.getElementById('authorizationDecisionReason')?.value?.trim() || null,
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
            modal.showSuccess(id ? 'Autorización actualizada' : 'Autorización creada');
            this.resetForm();
            await this.loadAuthorizations();
        } catch (error) {
            modal.showError(error.message || 'No se pudo guardar la autorización');
        }
    }
}

export default new AuthorizationsView();
