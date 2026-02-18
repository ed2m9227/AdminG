/**
 * Auth Service - Servicio de autenticación
 * Responsabilidad: Manejo de login, logout, registro y estado de sesión
 * Principio SOLID: Single Responsibility
 */

import apiService from './api.service.js';

export class AuthService {
    constructor() {
        this.currentUser = null;
        this.listeners = [];
    }

    /**
     * Iniciar sesión
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<object>}
     */
    async login(email, password) {
        try {
            const response = await apiService.post('/auth/login', 
                { email, password }, 
                false
            );
            
            localStorage.setItem('token', response.access_token);
            await this.loadCurrentUser();
            this.notifyListeners();
            
            return response;
        } catch (error) {
            throw new Error(error.message || 'Error al iniciar sesión');
        }
    }

    /**
     * Registrar nuevo usuario
     * @param {object} userData 
     * @returns {Promise<object>}
     */
    async register(userData) {
        try {
            const response = await apiService.post('/auth/register', userData, false);
            return response;
        } catch (error) {
            throw new Error(error.message || 'Error al registrar usuario');
        }
    }

    /**
     * Cerrar sesión
     */
    logout() {
        localStorage.removeItem('token');
        this.currentUser = null;
        this.notifyListeners();
    }

    /**
     * Cargar usuario actual desde el backend
     */
    async loadCurrentUser() {
        try {
            this.currentUser = await apiService.getCurrentUser();
            return this.currentUser;
        } catch (error) {
            console.error('Error loading current user:', error);
            this.logout();
            throw error;
        }
    }

    /**
     * Verificar si hay una sesión activa
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!localStorage.getItem('token');
    }

    /**
     * Obtener usuario actual
     * @returns {object|null}
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Verificar si el usuario tiene un rol específico
     * @param {string} role 
     * @returns {boolean}
     */
    hasRole(role) {
        return this.currentUser?.role === role;
    }

    /**
     * Suscribirse a cambios de autenticación
     * @param {Function} callback 
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Notificar a todos los listeners
     */
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.currentUser));
    }
}

// Exportar instancia singleton
export default new AuthService();
