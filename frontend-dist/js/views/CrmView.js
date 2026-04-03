import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import table from '../components/Table.js';
import modal from '../components/Modal.js';

export class CrmView {
    constructor() {
        this.consultations = [];
        this.metrics = null;
        this.customers = [];
        this.services = [];
        this.petsByCustomer = new Map();
        this._handlerAttached = false;
    }

    render() {
        const features = authService.getFeatures();
        const canCreate = features.includes('create_crm');

        return `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">CRM Veterinario</h2>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        ${canCreate ? '<button class="btn btn-success" id="btnCrmNewOwnerPet">+ Propietario + Mascota</button>' : ''}
                        ${canCreate ? '<button class="btn btn-primary" id="btnCrmNewConsultation">+ Consulta</button>' : ''}
                    </div>
                </div>
                <div class="card-body">
                    <div id="crmMetrics"></div>
                    <div id="crmConsultationsTable">${this.renderTable()}</div>
                </div>
            </div>
        `;
    }

    renderTable() {
        const columns = [
            { key: 'consultation_date', label: 'Fecha', type: 'datetime' },
            { key: 'customer_name', label: 'Propietario' },
            { key: 'pet_name', label: 'Mascota' },
            { key: 'reason', label: 'Motivo' },
            { key: 'status', label: 'Estado', type: 'badge' },
            {
                key: 'actions',
                label: 'Acciones',
                formatter: (_, row) => `<button class="btn btn-sm" data-crm-history="${row.pet_id}">Historial</button>`
            }
        ];

        return table.render({
            columns,
            data: this.consultations,
            emptyMessage: 'No hay consultas veterinarias registradas',
            emptyIcon: '🐾'
        });
    }

    renderMetrics() {
        if (!this.metrics) return '';
        return `
            <div class="crm-metrics-grid">
                <div class="detail-item"><span class="detail-label">Consultas Totales</span><span class="detail-value">${this.metrics.consultations_total || 0}</span></div>
                <div class="detail-item"><span class="detail-label">Consultas (30 dias)</span><span class="detail-value">${this.metrics.consultations_period || 0}</span></div>
                <div class="detail-item"><span class="detail-label">Clientes Recurrentes</span><span class="detail-value">${this.metrics.recurring_clients || 0}</span></div>
            </div>
        `;
    }

    async init() {
        await this.loadReferenceData();
        await this.loadConsultations();
        await this.loadMetrics();
        this.attachEvents();
    }

    async loadReferenceData() {
        try {
            [this.customers, this.services] = await Promise.all([
                apiService.getCustomers(),
                apiService.getServices().catch(() => []),
            ]);
        } catch (_error) {
            this.customers = [];
            this.services = [];
            this.petsByCustomer = new Map();
        }
    }

    async loadConsultations() {
        try {
            const rows = await apiService.getCrmConsultations();
            this.consultations = (Array.isArray(rows) ? rows : []).map((item) => {
                const customer = this.customers.find(c => c.id === item.customer_id);
                return {
                    ...item,
                    customer_name: customer?.full_name || `#${item.customer_id}`,
                    pet_name: `#${item.pet_id}`,
                };
            });

            const tableContainer = document.getElementById('crmConsultationsTable');
            if (tableContainer) tableContainer.innerHTML = this.renderTable();
        } catch (error) {
            modal.showError('No se pudieron cargar las consultas CRM: ' + error.message);
        }
    }

    async loadMetrics() {
        try {
            this.metrics = await apiService.getCrmMetrics(30);
            const metricsEl = document.getElementById('crmMetrics');
            if (metricsEl) metricsEl.innerHTML = this.renderMetrics();
        } catch (_error) {
            this.metrics = null;
        }
    }

    attachEvents() {
        if (this._handlerAttached) return;
        this._handlerAttached = true;

        document.getElementById('btnCrmNewOwnerPet')?.addEventListener('click', () => this.showOwnerPetModal());
        document.getElementById('btnCrmNewConsultation')?.addEventListener('click', () => this.showConsultationModal());

        document.getElementById('crmConsultationsTable')?.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-crm-history]');
            if (!btn) return;
            await this.showPetHistory(btn.dataset.crmHistory);
        });
    }

    async showOwnerPetModal() {
        const content = `
            <form id="crmOwnerPetForm" class="modal-form">
                <div class="form-group"><label>Nombre propietario *</label><input name="customer_full_name" required></div>
                <div class="form-row">
                    <div class="form-group"><label>Telefono</label><input name="customer_phone"></div>
                    <div class="form-group"><label>Email</label><input name="customer_email" type="email"></div>
                </div>
                <div class="form-group"><label>Nombre mascota *</label><input name="pet_name" required></div>
                <div class="form-row">
                    <div class="form-group"><label>Tipo animal *</label><input name="animal_type" required placeholder="perro, gato..."></div>
                    <div class="form-group"><label>Raza</label><input name="breed"></div>
                </div>
                <div class="modal-actions"><button class="btn btn-success" type="submit">Guardar</button><button class="btn" type="button" data-close>Cancelar</button></div>
            </form>
        `;
        const modalEl = modal.show({ title: 'Nuevo Propietario + Mascota', content, size: 'medium' });
        document.getElementById('crmOwnerPetForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const payload = Object.fromEntries(fd.entries());
            try {
                await apiService.createCrmClientWithPet(payload);
                modal.close(modalEl);
                await this.loadReferenceData();
                await this.loadConsultations();
                await modal.alert({ title: 'Exito', message: 'Registro creado correctamente', type: 'success' });
            } catch (error) {
                await modal.alert({ title: 'Error', message: error.message, type: 'error' });
            }
        });
    }

    async showConsultationModal() {
        const selectedServices = new Map();

        const renderServicePicker = () => {
            if (!this.services.length) {
                return '<p class="crm-svc-empty">Sin servicios registrados</p>';
            }
            return this.services.map(s => {
                const qty = selectedServices.get(s.id)?.qty || 0;
                return `
                    <div class="crm-svc-item">
                        <div class="crm-svc-info">
                            <span class="crm-svc-name">${s.name}</span>
                            <span class="crm-svc-price">$${Number(s.price || 0).toLocaleString()}</span>
                        </div>
                        <div class="crm-svc-counter">
                            <button type="button" class="crm-svc-dec" data-svc-id="${s.id}"${qty === 0 ? ' disabled' : ''}>-</button>
                            <span class="crm-svc-qty${qty > 0 ? ' active' : ''}">${qty}</span>
                            <button type="button" class="crm-svc-inc" data-svc-id="${s.id}">+</button>
                        </div>
                    </div>`;
            }).join('');
        };

        const customerOptions = this.customers.map(c =>
            `<option value="${c.id}">${c.full_name}</option>`
        ).join('');

        const content = `
            <form id="crmConsultationForm" class="modal-form">
                <div class="form-group">
                    <label>Propietario *</label>
                    <select id="crmCustomerSelect" name="customer_id" required>
                        <option value="">Seleccionar...</option>${customerOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Mascota *</label>
                    <select id="crmPetSelect" name="pet_id" required>
                        <option value="">Seleccionar propietario</option>
                    </select>
                </div>
                <div class="form-group"><label>Motivo</label><input name="reason"></div>
                <div class="form-row">
                    <div class="form-group"><label>Sintomas</label><textarea name="symptoms" rows="2"></textarea></div>
                    <div class="form-group"><label>Diagnostico</label><textarea name="diagnosis" rows="2"></textarea></div>
                </div>
                <div class="form-group">
                    <label>Servicios facturados</label>
                    <div id="crmServicePicker" class="crm-svc-picker">${renderServicePicker()}</div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-success" type="submit">Guardar consulta</button>
                    <button class="btn" type="button" data-close>Cancelar</button>
                </div>
            </form>
        `;
        const modalEl = modal.show({ title: 'Nueva Consulta Veterinaria', content, size: 'medium' });

        const customerSelect = document.getElementById('crmCustomerSelect');
        const petSelect = document.getElementById('crmPetSelect');
        const pickerEl = document.getElementById('crmServicePicker');

        const syncPets = async () => {
            const customerId = Number(customerSelect?.value || 0);
            if (!customerId) {
                petSelect.innerHTML = '<option value="">Seleccionar propietario</option>';
                return;
            }
            if (!this.petsByCustomer.has(customerId)) {
                try {
                    const pets = await apiService.getPets(customerId);
                    this.petsByCustomer.set(customerId, Array.isArray(pets) ? pets : []);
                } catch (_) {
                    this.petsByCustomer.set(customerId, []);
                }
            }
            const pets = this.petsByCustomer.get(customerId) || [];
            petSelect.innerHTML = pets.length
                ? `<option value="">Seleccionar...</option>${pets.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}`
                : '<option value="">Sin mascotas registradas</option>';
        };

        customerSelect?.addEventListener('change', syncPets);

        pickerEl?.addEventListener('click', e => {
            const inc = e.target.closest('.crm-svc-inc');
            const dec = e.target.closest('.crm-svc-dec');
            const btn = inc || dec;
            if (!btn) return;
            const id = Number(btn.dataset.svcId);
            const svc = this.services.find(s => s.id === id);
            if (!svc) return;
            const current = selectedServices.get(id)?.qty || 0;
            const next = inc ? current + 1 : Math.max(0, current - 1);
            if (next === 0) selectedServices.delete(id);
            else selectedServices.set(id, { service: svc, qty: next });
            pickerEl.innerHTML = renderServicePicker();
        });

        document.getElementById('crmConsultationForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const primaryEntry = [...selectedServices.values()].sort((a, b) => b.qty - a.qty)[0];
            const payload = {
                customer_id: Number(fd.get('customer_id')),
                pet_id: Number(fd.get('pet_id')),
                reason: fd.get('reason') || null,
                symptoms: fd.get('symptoms') || null,
                diagnosis: fd.get('diagnosis') || null,
                service_id: primaryEntry?.service?.id || null,
                status: 'open',
            };
            try {
                await apiService.createCrmConsultation(payload);
                modal.close(modalEl);
                await this.loadConsultations();
                await this.loadMetrics();
            } catch (error) {
                await modal.alert({ title: 'Error', message: error.message, type: 'error' });
            }
        });
    }

    async showPetHistory(petId) {
        try {
            const data = await apiService.getCrmPetHistory(petId);
            const content = `
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Consultas</span><span class="detail-value">${data.consultations?.length || 0}</span></div>
                    <div class="detail-item"><span class="detail-label">Tratamientos</span><span class="detail-value">${data.treatments?.length || 0}</span></div>
                    <div class="detail-item"><span class="detail-label">Vacunas</span><span class="detail-value">${data.vaccines?.length || 0}</span></div>
                    <div class="detail-item"><span class="detail-label">Registros</span><span class="detail-value">${data.records?.length || 0}</span></div>
                </div>
            `;
            modal.show({ title: 'Historial Clinico', content, size: 'medium' });
        } catch (error) {
            modal.showError('No se pudo cargar historial: ' + error.message);
        }
    }
}

export default new CrmView();
