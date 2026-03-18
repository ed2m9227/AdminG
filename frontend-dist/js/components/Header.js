/**
 * Header Component
 * Responsabilidad: Renderizar header/topbar de la aplicación
 * Principio SOLID: Single Responsibility
 */

import authService from '../services/auth.service.js';
import router from '../utils/router.js';
import sidebar from './Sidebar.js';

export class Header {
    constructor() {
        this.titles = {
            dashboard: 'Dashboard',
            customers: 'Clientes',
            appointments: 'Citas',
            inventory: 'Inventario',
            payments: 'Pagos',
            cashregister: 'Caja Registradora',
            reports: 'Reportes',
            team: 'Mi Equipo',
            'team-movements': 'Movimientos del Equipo',
            admin: 'Administración',
            businessconfig: 'Configuracion de negocio',
            businesstypes: 'Tipos de Negocio',
        };
    }

    /**
     * Renderizar el header
     * @returns {string} HTML del header
     */
    render() {
        const user = authService.getCurrentUser();
        const currentRoute = router.getCurrentRoute() || 'dashboard';
        const title = this.titles[currentRoute] || 'AdminG';

        return `
            <div class="topbar">
                <div class="topbar-left">
                    <button class="btn btn-sm btn-light sidebar-toggle" id="sidebarToggle" title="Ocultar barra lateral">
                        ☰
                    </button>
                    <h1 class="page-title">${title}</h1>
                </div>
                <div class="user-info">
                    <span class="user-email">${user?.email || ''}</span>
                    <span class="user-badge">${user?.plan?.toUpperCase() || ''}</span>
                    <button class="btn btn-danger btn-sm" id="logoutBtn">
                        Salir
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Actualizar el título del header
     * @param {string} route 
     */
    updateTitle(route) {
        const titleElement = document.querySelector('.page-title');
        if (titleElement) {
            titleElement.textContent = this.titles[route] || 'AdminG';
        }
    }

    /**
     * Inicializar event listeners
     */
    init() {
        // Click en logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Hamburger menu toggle - event delegation AND direct
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sidebar.toggleSidebar();
            });
        }

        // Fallback: delegated event for cases where element is replaced
        document.addEventListener('click', (e) => {
            if (e.target.id === 'logoutBtn') {
                this.handleLogout();
            }
            if (e.target.id === 'sidebarToggle' || e.target.closest('#sidebarToggle')) {
                sidebar.toggleSidebar();
            }
        });
    }

    /**
     * Manejar logout
     */
    handleLogout() {
        authService.logout();
        router.navigate('login');
    }
}

export default new Header();
