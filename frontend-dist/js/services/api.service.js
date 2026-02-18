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
                const error = await response.json();
                throw new Error(error.detail || `HTTP Error: ${response.status}`);
            }

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

    async getPayments() {
        return this.get('/payments/');
    }

    async getCurrentUser() {
        return this.get('/users/me');
    }

    async getVersion() {
        return this.get('/api/version', false);
    }
}

// Exportar instancia singleton
export default new ApiService();
