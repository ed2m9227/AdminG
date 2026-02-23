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
            { id: 'businesstypes', icon: '🏢', label: 'Tipos de Negocio', route: 'businesstypes', roleRequired: 'admin' },
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
            <div class="sidebar-overlay" id="sidebarOverlay"></div>
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
        const overlay = document.getElementById('sidebarOverlay');
        const toggleBtn = document.getElementById('sidebarToggle');

        if (!sidebar) return;

        // Click en menu items
        sidebar.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.menu-item');
            if (menuItem) {
                const route = menuItem.dataset.route;
                if (route) {
                    this.setActiveItem(route);
                    router.navigate(route);
                    
                    // Cerrar sidebar en móvil después de seleccionar
                    this.closeSidebar();
                }
            }
        });

        // Toggle button (hamburger menu)
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Click en overlay para cerrar
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }
    }

    /**
     * Toggle sidebar visibility (expand/collapse drawer)
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const isActive = sidebar?.classList.contains('active');
        
        if (isActive) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    /**
     * Cerrar sidebar (volver a modo compacto)
     */
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const dashboardLayout = document.querySelector('.dashboard-layout');
        
        if (sidebar) {
            sidebar.classList.remove('active');
        }
        if (overlay) {
            overlay.classList.remove('active');
        }
        if (dashboardLayout) {
            dashboardLayout.classList.remove('sidebar-expanded');
        }
    }

    /**
     * Abrir sidebar (drawer completo)
     */
    openSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const dashboardLayout = document.querySelector('.dashboard-layout');
        
        if (sidebar) {
            sidebar.classList.add('active');
        }
        if (overlay) {
            overlay.classList.add('active');
        }
        if (dashboardLayout) {
            dashboardLayout.classList.add('sidebar-expanded');
        }
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
