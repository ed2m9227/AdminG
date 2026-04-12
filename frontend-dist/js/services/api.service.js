/**
 * API Service - Capa de abstracción para llamadas HTTP
 * Responsabilidad: Comunicación con el backend
 * Principio SOLID: Single Responsibility
 */

// En producción el frontend se sirve desde el mismo servidor FastAPI,
// por lo que la base de la API es el origen actual.
// En desarrollo apuntamos a localhost:8000.
const API_BASE_URL = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
    ? 'http://127.0.0.1:8000'
    : window.location.origin;
const REQUEST_TIMEOUT_MS = 10000;

export class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this._isRefreshing = false;
    }

    /**
     * Realiza una petición HTTP genérica
     * @param {string} endpoint - Ruta del endpoint
     * @param {string} method - Método HTTP
     * @param {object|null} body - Cuerpo de la petición
     * @param {boolean} requiresAuth - Si requiere autenticación
     * @returns {Promise<any>}
     */
    async request(endpoint, method = 'GET', body = null, requiresAuth = true, timeoutMs = REQUEST_TIMEOUT_MS) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (requiresAuth) {
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const options = {
            method,
            headers,
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            let response;
            try {
                response = await fetch(`${this.baseUrl}${endpoint}`, {
                    ...options,
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timeoutId);
            }

            if (!response.ok) {
                // Auto-refresh on 401 (once) when we have a refresh token
                if (response.status === 401 && requiresAuth && !this._isRefreshing) {
                    const refreshed = await this._tryRefreshToken();
                    if (refreshed) {
                        // Retry original request with new access token
                        headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
                        options.headers = headers;
                        const retryCtrl = new AbortController();
                        const retryTimeout = setTimeout(() => retryCtrl.abort(), timeoutMs);
                        try {
                            const retryResp = await fetch(`${this.baseUrl}${endpoint}`, {
                                ...options,
                                signal: retryCtrl.signal,
                            });
                            if (retryResp.ok) {
                                if (retryResp.status === 204) return null;
                                return await retryResp.json();
                            }
                        } finally {
                            clearTimeout(retryTimeout);
                        }
                    }
                }
                let errorMessage = `HTTP Error: ${response.status}`;
                try {
                    const error = await response.json();
                    const detail = error?.detail;
                    if (typeof detail === 'string' && detail.trim()) {
                        errorMessage = detail;
                    } else if (Array.isArray(detail)) {
                        const first = detail[0];
                        errorMessage = first?.msg || JSON.stringify(first) || errorMessage;
                    } else if (detail && typeof detail === 'object') {
                        errorMessage = detail.msg || JSON.stringify(detail);
                    }
                } catch (_parseError) {
                    // Keep default message when response is not JSON.
                }

                const requestError = new Error(errorMessage);
                requestError.status = response.status;
                throw requestError;
            }

            // 204 No Content (DELETE) has no body to parse
            if (response.status === 204) return null;

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const raw = await response.text();
                const requestError = new Error(`Respuesta no JSON del servidor en ${method} ${endpoint}`);
                requestError.status = response.status;
                requestError.raw = raw?.slice?.(0, 200) || '';
                throw requestError;
            }

            return await response.json();
        } catch (error) {
            if (error?.name === 'AbortError') {
                const timeoutError = new Error(`Tiempo de espera agotado en ${method} ${endpoint}`);
                timeoutError.status = 408;
                console.error(`API Timeout [${method} ${endpoint}]`);
                throw timeoutError;
            }
            console.error(`API Error [${method} ${endpoint}]:`, error);
            throw error;
        }
    }

    // Métodos convenientes
    get(endpoint, requiresAuth = true) {
        return this.request(endpoint, 'GET', null, requiresAuth);
    }

    post(endpoint, body, requiresAuth = true, timeoutMs = REQUEST_TIMEOUT_MS) {
        return this.request(endpoint, 'POST', body, requiresAuth, timeoutMs);
    }

    put(endpoint, body, requiresAuth = true) {
        return this.request(endpoint, 'PUT', body, requiresAuth);
    }

    delete(endpoint, requiresAuth = true) {
        return this.request(endpoint, 'DELETE', null, requiresAuth);
    }

    // API específicas de dominio
    async getCustomers() {
        return this.get('/customers/');
    }

    async createCustomer(customer) {
        return this.post('/customers/', customer);
    }

    async getAppointments() {
        return this.get('/appointments/');
    }

    async getInventoryItems() {
        return this.get('/inventory/items');
    }

    async createInventoryItem(item) {
        return this.post('/inventory/items', item);
    }

    async updateInventoryItem(id, item) {
        return this.put(`/inventory/items/${id}`, item);
    }

    async getInventoryCategories() {
        return this.get('/inventory/categories');
    }

    async createInventoryCategory(category) {
        return this.post('/inventory/categories', category);
    }

    async getPayments() {
        return this.get('/payments/');
    }

    async getReportsDashboard() {
        return this.get('/reports/dashboard');
    }

    async getReport(reportType, payload) {
        return this.post(`/reports/${reportType}`, payload);
    }

    async exportReport(reportType, startDate, endDate) {
        const start = encodeURIComponent(startDate);
        const end = encodeURIComponent(endDate);
        return this.get(`/reports/export/${reportType}?start_date=${start}&end_date=${end}`);
    }

    async getBusinessTypes() {
        return this.get('/api/admin/business-types/public/list', false);
    }

    async getBusinessConfig() {
        return this.get('/business/config');
    }

    async createBusinessConfig(payload) {
        return this.post('/business/config', payload);
    }

    async updateBusinessConfig(payload) {
        return this.put('/business/config', payload);
    }

    async resetBusinessConfig(businessType) {
        return this.post(`/business/config/reset/${businessType}`, {});
    }

    async getPets(customerId) {
        return this.get(`/customers/${customerId}/pets/`);
    }

    async createPet(customerId, payload) {
        return this.post(`/customers/${customerId}/pets/`, payload);
    }

    async updatePet(customerId, petId, payload) {
        return this.put(`/customers/${customerId}/pets/${petId}`, payload);
    }

    async getCurrentUser() {
        return this.get('/users/me');
    }

    async getFeatures() {
        return this.get('/users/me/features');
    }

    async getUserFeatures() {
        return this.get('/users/me/features');
    }

    async submitPaymentReference(reference, plan) {
        return this.post('/users/me/submit-payment-reference', { reference, plan });
    }

    async activatePlanAsAdmin(userId) {
        return this.request(`/users/admin/activate-plan/${userId}`, 'PATCH');
    }

    async getPendingPlanPayments() {
        return this.get('/users/admin/pending-plan-payments');
    }

    async forgotPassword(email) {
        return this.post('/auth/forgot-password', { email }, false);
    }

    async resetPassword(token, newPassword) {
        return this.post('/auth/reset-password', { token, new_password: newPassword }, false);
    }

    async getVersion() {
        return this.get('/api/version', false);
    }

    // ========== AUTH 2FA / REFRESH ==========

    async verify2faLogin(challengeToken, code) {
        return this.post('/auth/2fa/verify-login', { challenge_token: challengeToken, code }, false);
    }

    async refreshToken(refreshToken) {
        return this.post('/auth/refresh', { refresh_token: refreshToken }, false);
    }

    async logoutToken(refreshToken) {
        return this.post('/auth/logout', { refresh_token: refreshToken }, false);
    }

    async get2faStatus() {
        return this.get('/auth/2fa/status');
    }

    async setup2fa() {
        return this.post('/auth/2fa/setup', {});
    }

    async confirm2fa(code) {
        return this.post('/auth/2fa/confirm', { code });
    }

    async disable2fa(password) {
        return this.post('/auth/2fa/disable', { password });
    }

    /** Silent token refresh. Returns true if a new access token was stored. */
    async _tryRefreshToken() {
        const stored = localStorage.getItem('refresh_token');
        if (!stored) return false;
        this._isRefreshing = true;
        try {
            const data = await this.refreshToken(stored);
            if (data?.access_token) {
                localStorage.setItem('token', data.access_token);
                if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
                return true;
            }
        } catch (_) {
            // Refresh failed — clear session
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
        } finally {
            this._isRefreshing = false;
        }
        return false;
    }

    // ========== SERVICES ==========
    async getServices() {
        return this.get('/services/');
    }

    // ========== CRM VETERINARIO ==========
    async createCrmClientWithPet(payload) {
        return this.post('/crm/clients-with-pet', payload);
    }

    async getCrmConsultations() {
        return this.get('/crm/consultations');
    }

    async createCrmConsultation(payload) {
        return this.post('/crm/consultations', payload);
    }

    async updateCrmConsultation(consultationId, payload) {
        return this.put(`/crm/consultations/${consultationId}`, payload);
    }

    async getCrmPetHistory(petId) {
        return this.get(`/crm/pets/${petId}/history`);
    }

    async getCrmMetrics(days = 30) {
        return this.get(`/crm/metrics?days=${days}`);
    }

    async crmChat(question) {
        return this.post('/crm/ai/chat', { question });
    }

    // ========== AI (CROSS-BUSINESS) ==========
    async aiChat(question) {
        return this.post('/ai/chat', { question });
    }

    async getAiExamples() {
        return this.get('/ai/examples');
    }

    async getAiConfig() {
        return this.get('/ai/config');
    }

    async createService(service) {
        return this.post('/services/', service);
    }

    async updateService(serviceId, service) {
        return this.put(`/services/${serviceId}`, service);
    }

    async deleteService(serviceId) {
        return this.delete(`/services/${serviceId}`);
    }

    async getServicePackages() {
        return this.get('/services/packages');
    }

    async createServicePackage(package_) {
        return this.post('/services/packages', package_);
    }

    async updateServicePackage(packageId, package_) {
        return this.put(`/services/packages/${packageId}`, package_);
    }

    async deleteServicePackage(packageId) {
        return this.delete(`/services/packages/${packageId}`);
    }
}

// Exportar instancia singleton
export default new ApiService();
