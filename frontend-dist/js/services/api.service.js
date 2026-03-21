/**
 * API Service - Capa de abstracción para llamadas HTTP
 * Responsabilidad: Comunicación con el backend
 * Principio SOLID: Single Responsibility
 */

const API_BASE_URL = 'http://127.0.0.1:8000';

export class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    /**
     * Realiza una petición HTTP genérica
     * @param {string} endpoint - Ruta del endpoint
     * @param {string} method - Método HTTP
     * @param {object|null} body - Cuerpo de la petición
     * @param {boolean} requiresAuth - Si requiere autenticación
     * @returns {Promise<any>}
     */
    async request(endpoint, method = 'GET', body = null, requiresAuth = true) {
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
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            
            if (!response.ok) {
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
            return await response.json();
        } catch (error) {
            console.error(`API Error [${method} ${endpoint}]:`, error);
            throw error;
        }
    }

    // Métodos convenientes
    get(endpoint, requiresAuth = true) {
        return this.request(endpoint, 'GET', null, requiresAuth);
    }

    post(endpoint, body, requiresAuth = true) {
        return this.request(endpoint, 'POST', body, requiresAuth);
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

    async getVersion() {
        return this.get('/api/version', false);
    }

    // ========== SERVICES ==========
    async getServices() {
        return this.get('/services');
    }

    async createService(service) {
        return this.post('/services', service);
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
