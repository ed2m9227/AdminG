/**
 * Sidebar Component
 * Responsabilidad: Renderizar barra lateral de navegación
 * Principio SOLID: Single Responsibility, Open/Closed
 */

import router from '../utils/router.js';
import authService from '../services/auth.service.js';

export class Sidebar {
    constructor() {
        this.menuItems = [
            { id: 'dashboard', icon: '📊', label: 'Dashboard', route: 'dashboard' },
            { id: 'customers', icon: '👥', label: 'Clientes', route: 'customers' },
            { id: 'appointments', icon: '📅', label: 'Citas', route: 'appointments' },
            { id: 'inventory', icon: '📦', label: 'Inventario', route: 'inventory' },
            { id: 'payments', icon: '💳', label: 'Pagos', route: 'payments' },
            { id: 'cashregister', icon: '💰', label: 'Caja', route: 'cashregister' },
            { id: 'reports', icon: '📈', label: 'Reportes', route: 'reports' },
            { id: 'admin', icon: '⚙️', label: 'Admin', route: 'admin', roleRequired: 'admin' },
        ];
    }

    /**
     * Renderizar el sidebar
     * @returns {string} HTML del sidebar
     */
    render() {
        const user = authService.getCurrentUser();
        const filteredItems = this.menuItems.filter(item => 
            !item.roleRequired || user?.role === item.roleRequired
        );

        return `
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <h2>AdminG</h2>
                    <p class="sidebar-user">${user?.email || 'Usuario'}</p>
                </div>
                <nav class="sidebar-menu">
                    ${filteredItems.map(item => this.renderMenuItem(item)).join('')}
                </nav>
            </div>
        `;
    }

    /**
     * Renderizar un item del menú
     * @param {object} item 
     * @returns {string}
     */
    renderMenuItem(item) {
        const isActive = router.getCurrentRoute() === item.route;
        return `
            <div class="menu-item ${isActive ? 'active' : ''}" 
                 data-route="${item.route}">
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
