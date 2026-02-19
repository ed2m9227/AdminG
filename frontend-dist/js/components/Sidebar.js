/**
 * Sidebar Component
 * Responsabilidad: Renderizar barra lateral de navegación con role-based menu
 * Principio SOLID: Single Responsibility, Open/Closed
 */

import router from '../utils/router.js';
import authService from '../services/auth.service.js';

export class Sidebar {
    constructor() {
        this.allMenuItems = [
            // Core
            { id: 'dashboard', icon: '📊', label: 'Dashboard', route: 'dashboard' },

            // Main modules
            { id: 'customers', icon: '👥', label: 'Clientes', route: 'customers' },
            { id: 'appointments', icon: '📅', label: 'Citas', route: 'appointments' },
            { id: 'inventory', icon: '📦', label: 'Inventario', route: 'inventory' },
            { id: 'payments', icon: '💳', label: 'Pagos', route: 'payments' },
            { id: 'reports', icon: '📈', label: 'Reportes', route: 'reports' },

            // Advanced
            { id: 'cashregister', icon: '💰', label: 'Caja', route: 'cashregister' },

            // Team & Admin
            { id: 'team', icon: '👫', label: 'Mi Equipo', route: 'team' },
            { id: 'admin', icon: '⚙️', label: 'Administración', route: 'admin', roleRequired: 'admin' },
        ];
    }

    /**
     * Renderizar el sidebar con items filtrados por plan y rol
     * @returns {string} HTML del sidebar
     */
    render() {
        const user = authService.getCurrentUser();
        
        // Filtrar items solo por rol (admin)
        const filteredItems = this.allMenuItems.filter(item => {
            if (item.roleRequired && user?.role !== item.roleRequired) {
                return false;
            }
            return true;
        });

        const userPlan = user?.plan || 'free';
        const userEmail = user?.email || 'Usuario';

        return `
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <h2>AdminG</h2>
                    <p class="sidebar-user">${userEmail}</p>
                    <div class="sidebar-plan" title="Plan: ${userPlan}">
                        <span class="plan-badge">${userPlan.toUpperCase()}</span>
                    </div>
                </div>
                <nav class="sidebar-menu">
                    ${filteredItems.map(item => this.renderMenuItem(item)).join('')}
                </nav>
            </div>
        `;
    }

    /**
     * Renderizar un item del menú con validación visual
     * @param {object} item 
     * @returns {string}
     */
    renderMenuItem(item) {
        const isActive = router.getCurrentRoute() === item.route;
        return `
            <div class="menu-item ${isActive ? 'active' : ''}" 
                 data-route="${item.route}"
                 title="${item.label}">
                <span class="menu-icon">${item.icon}</span>
                <span class="menu-label">${item.label}</span>
            </div>
        `;
    }

    /**
     * Inicializar event listeners
     */
    init() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        sidebar.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.menu-item');
            if (menuItem) {
                const route = menuItem.dataset.route;
                if (route) {
                    this.setActiveItem(route);
                    router.navigate(route);
                }
            }
        });
    }

    /**
     * Marcar el item activo
     * @param {string} route 
     */
    setActiveItem(route) {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.route === route) {
                item.classList.add('active');
            }
        });
    }
}

export default new Sidebar();
