import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import table from '../components/Table.js';
import modal from '../components/Modal.js';

export class CrmView {
    constructor() {
        this.consultations = [];
        this.metrics = null;
        this.customers = [];
        this.petsByCustomer = new Map();
        this._handlerAttached = false;
    }

    render() {
        const features = authService.getFeatures();
        const canCreate = features.includes('create_crm');

        return `
            <div class="crm-layout">
                <div class="crm-main">
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
                </div>

                <div class="crm-chat card">
                    <div class="card-header">
                        <h3 class="card-title">Chat Inteligente CRM</h3>
                    </div>
                    <div class="card-body" style="display:flex;flex-direction:column;gap:10px;">
                        <div id="crmChatFeed" class="crm-chat-feed"></div>
                        <form id="crmChatForm" style="display:flex;gap:8px;">
                            <input id="crmChatInput" type="text" placeholder="Ej: Ingresos del mes" style="flex:1;" required>
                            <button class="btn btn-success" type="submit">Consultar</button>
                        </form>
                        <div style="font-size:12px;color:#6b7280;">
                            Ejemplos: "Cuantas consultas hubo esta semana", "Mascotas sin visita en 6 meses", "Ingresos del mes".
                        </div>
                    </div>
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
                formatter: (_, row) => `<button class="btn btn-sm" data-crm-history="${row.pet_id}">📋 Historial</button>`
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
            this.customers = await apiService.getCustomers();
            const petsCalls = this.customers.map(async (c) => {
                try {
                    const pets = await apiService.getPets(c.id);
                    this.petsByCustomer.set(c.id, Array.isArray(pets) ? pets : []);
                } catch (_e) {
                    this.petsByCustomer.set(c.id, []);
                }
            });
            await Promise.all(petsCalls);
        } catch (_error) {
            this.customers = [];
            this.petsByCustomer = new Map();
        }
    }

    async loadConsultations() {
        try {
            const rows = await apiService.getCrmConsultations();
            this.consultations = (Array.isArray(rows) ? rows : []).map((item) => {
                const customer = this.customers.find(c => c.id === item.customer_id);
                const pets = this.petsByCustomer.get(item.customer_id) || [];
                const pet = pets.find(p => p.id === item.pet_id);
                return {
                    ...item,
                    customer_name: customer?.full_name || `#${item.customer_id}`,
                    pet_name: pet?.name || `#${item.pet_id}`,
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

        document.getElementById('crmChatForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('crmChatInput');
            const question = (input?.value || '').trim();
            if (!question) return;
            input.value = '';
            await this.sendChat(question);
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
        const customerOptions = this.customers.map(c => `<option value="${c.id}">${c.full_name}</option>`).join('');
        const content = `
            <form id="crmConsultationForm" class="modal-form">
                <div class="form-group"><label>Propietario *</label><select id="crmCustomerSelect" name="customer_id" required><option value="">Seleccionar...</option>${customerOptions}</select></div>
                <div class="form-group"><label>Mascota *</label><select id="crmPetSelect" name="pet_id" required><option value="">Seleccionar propietario</option></select></div>
                <div class="form-group"><label>Motivo</label><input name="reason"></div>
                <div class="form-group"><label>Sintomas</label><textarea name="symptoms" rows="3"></textarea></div>
                <div class="form-group"><label>Diagnostico</label><textarea name="diagnosis" rows="3"></textarea></div>
                <div class="modal-actions"><button class="btn btn-success" type="submit">Guardar</button><button class="btn" type="button" data-close>Cancelar</button></div>
            </form>
        `;
        const modalEl = modal.show({ title: 'Nueva Consulta Veterinaria', content, size: 'medium' });

        const customerSelect = document.getElementById('crmCustomerSelect');
        const petSelect = document.getElementById('crmPetSelect');

        const syncPets = () => {
            const customerId = Number(customerSelect.value || 0);
            const pets = this.petsByCustomer.get(customerId) || [];
            petSelect.innerHTML = pets.length
                ? `<option value="">Seleccionar...</option>${pets.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}`
                : '<option value="">No hay mascotas para este cliente</option>';
        };

        customerSelect?.addEventListener('change', syncPets);

        document.getElementById('crmConsultationForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const payload = {
                customer_id: Number(fd.get('customer_id')),
                pet_id: Number(fd.get('pet_id')),
                reason: fd.get('reason') || null,
                symptoms: fd.get('symptoms') || null,
                diagnosis: fd.get('diagnosis') || null,
                status: 'open'
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

    async sendChat(question) {
        const feed = document.getElementById('crmChatFeed');
        if (!feed) return;

        feed.innerHTML += `<div class="crm-chat-msg user"><strong>Tu:</strong> ${question}</div>`;

        try {
            const response = await apiService.crmChat(question);
            const table = response?.table || { columns: [], rows: [] };
            const tableHtml = table.columns.length
                ? `<div class="crm-chat-table"><table><thead><tr>${table.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${table.rows.map(r => `<tr>${r.map(v => `<td>${v ?? '-'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
                : '';

            feed.innerHTML += `<div class="crm-chat-msg bot"><strong>CRM:</strong> ${response.answer || 'Sin respuesta'}${tableHtml}</div>`;
            feed.scrollTop = feed.scrollHeight;
        } catch (error) {
            feed.innerHTML += `<div class="crm-chat-msg bot"><strong>CRM:</strong> Error: ${error.message}</div>`;
        }
    }
}

export default new CrmView();
