/**
 * Sidebar Component
 * Responsabilidad: Renderizar barra lateral de navegación con role-based menu
 * Principio SOLID: Single Responsibility, Open/Closed
 */

import router from '../utils/router.js';
import authService from '../services/auth.service.js';
import apiService from '../services/api.service.js';
import modal from './Modal.js';

export class Sidebar {
    constructor() {
        this.allMenuItems = [
            // Core
            { id: 'dashboard', icon: '📊', label: 'Dashboard', route: 'dashboard', alwaysShow: true },

            // Main modules
            { id: 'customers', icon: '👥', label: 'Clientes', route: 'customers', requiredFeature: 'view_customers' },
            { id: 'appointments', icon: '📅', label: 'Citas', route: 'appointments', requiredFeature: 'view_appointments' },
            { id: 'inventory', icon: '📦', label: 'Inventario', route: 'inventory', requiredFeature: 'view_inventory' },
            { id: 'payments', icon: '💳', label: 'Pagos', route: 'payments', alwaysShow: true },
            { id: 'reports', icon: '📈', label: 'Reportes', route: 'reports', requiredFeature: 'view_reports' },
            { id: 'invoices', icon: '🧾', label: 'Facturas', route: 'invoices', requiredFeature: 'view_reports' },

            // Advanced
            { id: 'cashregister', icon: '💰', label: 'Caja', route: 'cashregister', requiredFeature: 'use_cashregister' },
            { id: 'documents', icon: '📄', label: 'Documentos', route: 'documents', requiredFeature: 'view_documents' },
            { id: 'authorizations', icon: '✅', label: 'Autorizaciones', route: 'authorizations', requiredFeature: 'view_authorizations' },

            // Team & Admin
            { id: 'team', icon: '👫', label: 'Mi Equipo', route: 'team', requiredFeature: 'view_team' },
            { id: 'team-movements', icon: '📊', label: 'Movimientos del Equipo', route: 'team-movements', parentId: 'team', roles: ['manager', 'admin'], requiredFeature: 'view_team' },
            { id: 'admin', icon: '⚙️', label: 'Administración', route: 'admin', roleRequired: 'admin', requiredFeature: 'admin_panel' },
            { id: 'businessconfig', icon: '🛠️', label: 'Configuracion de negocio', route: 'businessconfig', parentId: 'admin', roles: ['admin', 'manager'], alwaysShow: true },
            { id: 'businesstypes', icon: '🏢', label: 'Tipos de Negocio', route: 'businesstypes', parentId: 'admin', roleRequired: 'admin', requiredFeature: 'admin_panel' },
        ];
        this.userFeatures = [];
        this.itemAccessMap = {};
    }

    /**
     * Cargar features disponibles para el usuario actual (UNA SOLA VEZ)
     */
    async loadUserFeatures() {
        // Si ya están cargadas, no volver a cargar
        if (this.userFeatures.length > 0) {
            console.log('✅ Features already loaded, skipping...');
            return;
        }
        
        try {
            console.log('📡 Loading user features from /users/me/features...');
            
            // Usar timeout para evitar cargamento infinito
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Features request timeout after 5s')), 5000)
            );
            
            const data = await Promise.race([
                apiService.getUserFeatures(),
                timeoutPromise
            ]);
            
            this.userFeatures = data.features || [];
            console.log('✅ User features loaded:', this.userFeatures);
            console.log('📊 Plan:', data.plan);
        } catch (error) {
            console.error('❌ Error loading user features:', error.message);
            // En caso de error, permitir acceso a features básicas
            const user = authService.getCurrentUser();
            const defaultFeatures = this.getDefaultFeaturesByPlan(user?.plan || 'free');
            this.userFeatures = defaultFeatures;
            console.log('⚠️ Using default features for plan:', user?.plan);
        }
    }

    /**
     * Obtener features por defecto según el plan
     */
    getDefaultFeaturesByPlan(plan) {
        const user = authService.getCurrentUser();
        const isParentAccount = !user?.parent_user_id;
        const featuresByPlan = {
            'free': ['view_customers', 'view_appointments'],
            'starter': [
                'view_customers', 'create_customers', 'edit_customers', 'delete_customers',
                'view_appointments', 'create_appointments', 'edit_appointments', 'delete_appointments',
                'view_inventory', 'create_products', 'edit_products', 'delete_products',
                'view_payments', 'create_payments',
                'view_team', 'manage_team_users', 'invite_users',
                'use_cashregister', 'open_register', 'close_register'
            ],
            'pro': [
                'view_customers', 'create_customers', 'edit_customers', 'delete_customers', 'export_customers',
                'view_appointments', 'create_appointments', 'edit_appointments', 'delete_appointments', 'cancel_appointments',
                'view_inventory', 'create_products', 'edit_products', 'delete_products', 'track_stock',
                'view_payments', 'create_payments', 'refund_payments',
                'view_reports', 'export_reports',
                'use_cashregister', 'open_register', 'close_register',
                'view_team', 'manage_team_users', 'invite_users',
                'view_documents', 'create_documents', 'edit_documents', 'delete_documents',
                'view_authorizations', 'create_authorizations', 'manage_authorizations'
            ],
            'max': [
                'view_customers', 'create_customers', 'edit_customers', 'delete_customers', 'export_customers',
                'view_appointments', 'create_appointments', 'edit_appointments', 'delete_appointments', 'cancel_appointments',
                'view_inventory', 'create_products', 'edit_products', 'delete_products', 'track_stock',
                'view_payments', 'create_payments', 'refund_payments',
                'view_reports', 'export_reports', 'advanced_analytics',
                'use_cashregister', 'open_register', 'close_register',
                'view_team', 'manage_team_users', 'invite_users',
                'view_documents', 'create_documents', 'edit_documents', 'delete_documents',
                'view_authorizations', 'create_authorizations', 'manage_authorizations',
                'admin_panel'
            ]
        };
        const features = [...(featuresByPlan[plan] || featuresByPlan['free'])];

        if (plan === 'starter' && !isParentAccount) {
            return features.filter(feature => ![
                'create_customers', 'edit_customers', 'delete_customers',
                'create_appointments', 'edit_appointments', 'delete_appointments',
                'create_products', 'edit_products', 'delete_products',
                'create_payments'
            ].includes(feature));
        }

        return features;
    }

    showPlanBlockedModal(item) {
        const user = authService.getCurrentUser();
        const planName = (user?.plan || 'free').toUpperCase();
        modal.showWarning(`Tu plan ${planName} no incluye "${item.label}". Actualiza tu plan para habilitar esta función.`);
    }

    /**
     * Renderizar el sidebar con items filtrados por plan y rol
     * @returns {string} HTML del sidebar
     */
    render() {
        const user = authService.getCurrentUser();
        const isAdmin = user?.role === 'admin';
        const isSubUser = !!user?.parent_user_id;
        this.itemAccessMap = {};
        
        // Filtrar items por rol y sub-usuario. Las restricciones por plan se muestran bloqueadas.
        const visibleByRole = this.allMenuItems.filter(item => {
            // Sub-usuarios no ven Reportes ni Mi Equipo
            if (isSubUser && (item.id === 'reports' || item.id === 'team')) {
                return false;
            }
            
            // Filtro por rol específico
            if (item.roles && !item.roles.includes(user?.role)) {
                return false;
            }
            if (item.roleRequired && user?.role !== item.roleRequired) {
                return false;
            }
            
            // Los admins globales no deben quedar bloqueados por plan en secciones de administración.
            const hasFeature = isAdmin || item.alwaysShow || !item.requiredFeature || this.userFeatures.includes(item.requiredFeature);

            // Para usuarios hijo, ocultar modulos bloqueados en lugar de mostrarlos con candado.
            if (isSubUser && !hasFeature && !item.alwaysShow) {
                return false;
            }

            this.itemAccessMap[item.route] = {
                isBlocked: !hasFeature,
                label: item.label,
                requiredFeature: item.requiredFeature
            };
            
            return true;
        });

        // Si un padre no está visible, su submenú tampoco debe renderizarse.
        const visibleIds = new Set(visibleByRole.map(item => item.id));
        const filteredItems = visibleByRole.filter(item => !item.parentId || visibleIds.has(item.parentId));

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
                    ${filteredItems.map(item => this.renderMenuItem(item, !!this.itemAccessMap[item.route]?.isBlocked)).join('')}
                </nav>
            </div>
        `;
    }

    /**
     * Renderizar un item del menú con validación visual
     * @param {object} item 
     * @returns {string}
     */
    renderMenuItem(item, isBlocked = false) {
        const isActive = router.getCurrentRoute() === item.route;
        const lockIcon = isBlocked ? '<span class="menu-lock" style="margin-left:auto;opacity:.8;">🔒</span>' : '';
        const submenuClass = item.parentId ? 'submenu-item' : '';
        return `
            <div class="menu-item ${submenuClass} ${isActive ? 'active' : ''} ${isBlocked ? 'blocked' : ''}" 
                 data-route="${item.route}"
                 data-blocked="${isBlocked ? 'true' : 'false'}"
                 title="${item.label}">
                <span class="menu-icon">${item.icon}</span>
                <span class="menu-label">${item.label}</span>
                ${lockIcon}
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
                const blocked = menuItem.dataset.blocked === 'true';
                if (route) {
                    if (blocked) {
                        const blockedItem = this.allMenuItems.find(item => item.route === route);
                        if (blockedItem) {
                            this.showPlanBlockedModal(blockedItem);
                        }
                        this.closeSidebar();
                        return;
                    }

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
        
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
        if (overlay && overlay.classList.contains('active')) {
            overlay.classList.remove('active');
        }
        if (dashboardLayout && dashboardLayout.classList.contains('sidebar-expanded')) {
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
        
        if (sidebar && !sidebar.classList.contains('active')) {
            sidebar.classList.add('active');
        }
        if (overlay && !overlay.classList.contains('active')) {
            overlay.classList.add('active');
        }
        if (dashboardLayout && !dashboardLayout.classList.contains('sidebar-expanded')) {
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
