/**
 * Sidebar Component
 * Responsabilidad: Renderizar barra lateral de navegación con role-based menu
 * Principio SOLID: Single Responsibility, Open/Closed
 */

import router from '../utils/router.js';
import businessRegistry from '../core/businessRegistry.js';
import authService from '../services/auth.service.js';
import apiService from '../services/api.service.js';
import modal from './Modal.js';
import { t } from '../utils/i18n.js';

function isMasterAccount(user) {
    return user?.role === 'admin' || user?.plan === 'admin' || user?.business_type === 'master';
}

export class Sidebar {
    constructor() {
        this.mobileBreakpoint = 576;
        this.allMenuItems = [
            // Core
            { id: 'dashboard', icon: '📊', label: t('menu.dashboard', 'Dashboard'), route: 'dashboard', alwaysShow: true },

            // Main modules
            { id: 'customers', icon: '👥', label: 'Clientes', route: 'customers', requiredFeature: 'view_customers' },
            { id: 'appointments', icon: '📅', label: 'Citas', route: 'appointments', requiredFeature: 'view_appointments' },
            { id: 'inventory', icon: '📦', label: t('menu.inventory', 'Inventario'), route: 'inventory', requiredFeature: 'view_inventory' },
            { id: 'payments', icon: '💳', label: t('menu.payments', 'Pagos'), route: 'payments', alwaysShow: true },
            { id: 'team-expenses', icon: '💸', label: t('menu.team_expenses', 'Gastos / Expenses'), route: 'team-expenses', requiredFeature: 'view_expenses' },
            { id: 'reports', icon: '📈', label: t('menu.reports', 'Reportes'), route: 'reports', requiredFeature: 'view_reports' },
            { id: 'invoices', icon: '🧾', label: t('menu.invoices', 'Facturas'), route: 'invoices', requiredFeature: 'view_reports' },
            { id: 'crm', icon: '🤝', label: t('menu.crm', 'CRM'), route: 'crm', requiredFeature: 'view_crm' },

            // Advanced
            { id: 'cashregister', icon: '💰', label: t('menu.cashregister', 'Caja'), route: 'cashregister', requiredFeature: 'use_cashregister' },
            { id: 'documents', icon: '📄', label: t('menu.documents', 'Documentos'), route: 'documents', requiredFeature: 'view_documents' },
            { id: 'authorizations', icon: '✅', label: t('menu.authorizations', 'Autorizaciones'), route: 'authorizations', requiredFeature: 'view_authorizations' },

            // Team & Admin
            { id: 'team', icon: '👫', label: t('menu.team', 'Mi Equipo'), route: 'team', requiredFeature: 'view_team' },
            { id: 'team-risks', icon: '🦺', label: t('menu.team_risks', 'Riesgos Laborales'), route: 'team-risks', parentId: 'team', requiredFeature: 'view_risks' },
            // RRHH section
            { id: 'team-employees', icon: '👤', label: t('menu.team_employees', 'Empleados'), route: 'team-employees', parentId: 'team', requiredFeature: 'view_team' },
            { id: 'team-payroll', icon: '💰', label: t('menu.team_payroll', 'Nómina'), route: 'team-payroll', parentId: 'team-employees', requiredFeature: 'view_payroll' },
            { id: 'team-requests', icon: '📋', label: t('menu.team_requests', 'Solicitudes'), route: 'team-requests', parentId: 'team-employees', requiredFeature: 'view_hr_requests' },
            { id: 'team-tracking', icon: '📊', label: t('menu.team_tracking', 'Seguimiento'), route: 'team-tracking', parentId: 'team-employees', requiredFeature: 'view_hr_tracking' },
            { id: 'team-movements', icon: '📈', label: t('menu.team_movements', 'Movimientos del Equipo'), route: 'team-movements', parentId: 'team', roles: ['manager', 'admin'], requiredFeature: 'view_team' },
            // Admin IA
            { id: 'admin-ia', icon: '✨', label: t('menu.admin_ia', 'Admin IA'), route: 'admin-ia', requiredFeature: 'use_ai_studio' },
            { id: 'admin', icon: '⚙️', label: t('menu.admin', 'Administración'), route: 'admin', roleRequired: 'admin', requiredFeature: 'admin_panel' },
            { id: 'businessconfig', icon: '🛠️', label: t('menu.business_config', 'Configuración de negocio'), route: 'businessconfig', parentId: 'admin', roles: ['admin', 'manager'], alwaysShow: true },
            { id: 'businesstypes', icon: '🏢', label: t('menu.business_types', 'Tipos de Negocio'), route: 'businesstypes', parentId: 'admin', roleRequired: 'admin', requiredFeature: 'admin_panel' },

            // JAC - Sistema de Gobernanza (Fases 1-6) - Solo para tipo de negocio gobernanza
            { id: 'governance', icon: '🏛️', label: 'Gobernanza JAC', route: 'governance', roles: ['admin', 'manager'], businessType: 'gobernanza' },
            { id: 'treasury', icon: '💰', label: 'Tesorería', route: 'treasury', parentId: 'governance', roles: ['admin', 'manager'], businessType: 'gobernanza' },
            { id: 'assembly', icon: '🗳️', label: 'Asambleas', route: 'assembly', parentId: 'governance', roles: ['admin', 'manager'], businessType: 'gobernanza' },
            { id: 'projects-jac', icon: '📋', label: 'Proyectos', route: 'projects', parentId: 'governance', roles: ['admin', 'manager'], businessType: 'gobernanza' },
            { id: 'inventory-jac', icon: '📦', label: 'Inventario JAC', route: 'inventory-jac', parentId: 'governance', roles: ['admin', 'manager'], businessType: 'gobernanza' },
            { id: 'strategic', icon: '🎯', label: 'Estrategia', route: 'strategic', parentId: 'governance', roles: ['admin', 'manager'], businessType: 'gobernanza' },
        ];
        this.userFeatures = [];
        this.itemAccessMap = {};
        this.businessLabels = {
            customer: 'Clientes',
            appointment: 'Citas',
        };
        this.businessLabelsLoaded = false;
    }

    getDefaultLabelsByBusinessType(businessType) {
        return {
            customer: businessRegistry.getVocabulary(businessType, 'customers', 'Clientes'),
            appointment: businessRegistry.getVocabulary(businessType, 'appointments', 'Citas'),
        };
    }

    async loadBusinessLabels(forceReload = false) {
        if (!forceReload && this.businessLabelsLoaded) {
            return;
        }

        const user = authService.getCurrentUser();
        const fallback = this.getDefaultLabelsByBusinessType(user?.business_type);

        try {
            const config = await apiService.getBusinessConfig();
            this.businessLabels = {
                customer: config?.customer_label || fallback.customer,
                appointment: config?.appointment_label || fallback.appointment,
            };
        } catch (_error) {
            this.businessLabels = fallback;
        }

        this.businessLabelsLoaded = true;
    }

    getMenuItemsWithDynamicLabels() {
        const user = authService.getCurrentUser();
        const crmCfg = businessRegistry.getCrmConfig(user?.business_type);
        return this.allMenuItems.map(item => {
            if (item.id === 'customers') {
                return { ...item, label: this.businessLabels.customer || item.label };
            }
            if (item.id === 'appointments') {
                return { ...item, label: this.businessLabels.appointment || item.label };
            }
            if (item.id === 'crm') {
                return { ...item, label: crmCfg.label, icon: crmCfg.icon };
            }
            return item;
        });
    }

    /**
     * Cargar features disponibles para el usuario actual (UNA SOLA VEZ)
     */
    async loadUserFeatures(forceReload = false) {
        // Si ya están cargadas, no volver a cargar
        if (!forceReload && this.userFeatures.length > 0) {
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
                'view_risks', 'view_incidents', 'view_expenses',
                'view_hr', 'view_hr_requests',
                'use_cashregister', 'open_register', 'close_register',
            ],
            'pro': [
                'view_customers', 'create_customers', 'edit_customers', 'delete_customers', 'export_customers',
                'view_appointments', 'create_appointments', 'edit_appointments', 'delete_appointments', 'cancel_appointments',
                'view_inventory', 'create_products', 'edit_products', 'delete_products', 'track_stock',
                'view_payments', 'create_payments', 'refund_payments',
                'view_reports', 'export_reports',
                'use_cashregister', 'open_register', 'close_register',
                'view_team', 'manage_team_users', 'invite_users',
                'view_risks', 'create_risks', 'view_incidents', 'create_incidents',
                'view_expenses', 'create_expenses',
                'view_hr', 'view_hr_requests', 'manage_hr_requests', 'view_payroll', 'view_hr_tracking',
                'view_documents', 'create_documents', 'edit_documents', 'delete_documents',
                'view_authorizations', 'create_authorizations', 'manage_authorizations',
                'view_crm', 'create_crm', 'edit_crm', 'delete_crm', 'view_crm_analytics',
            ],
            'max': [
                'view_customers', 'create_customers', 'edit_customers', 'delete_customers', 'export_customers',
                'view_appointments', 'create_appointments', 'edit_appointments', 'delete_appointments', 'cancel_appointments',
                'view_inventory', 'create_products', 'edit_products', 'delete_products', 'track_stock',
                'view_payments', 'create_payments', 'refund_payments',
                'view_reports', 'export_reports', 'advanced_analytics',
                'use_cashregister', 'open_register', 'close_register',
                'view_team', 'manage_team_users', 'invite_users',
                'view_risks', 'create_risks', 'manage_risks', 'view_incidents', 'create_incidents', 'manage_incidents',
                'view_expenses', 'create_expenses', 'approve_expenses', 'manage_expenses',
                'view_hr', 'manage_hr', 'view_payroll', 'manage_payroll',
                'view_hr_requests', 'manage_hr_requests', 'view_hr_tracking',
                'view_documents', 'create_documents', 'edit_documents', 'delete_documents',
                'view_authorizations', 'create_authorizations', 'manage_authorizations',
                'view_crm', 'create_crm', 'edit_crm', 'delete_crm', 'view_crm_analytics', 'use_crm_ai_chat',
                'use_ai_chat', 'use_ai_studio', 'admin_panel',
            ],
        };
        // Keep fallback behavior aligned with backend policy:
        // PRO == MAX except IA operability.
        featuresByPlan.pro = featuresByPlan.max.filter(
            feature => !['use_ai_chat', 'use_ai_studio', 'use_crm_ai_chat'].includes(feature)
        );
        let features = [...(featuresByPlan[plan] || featuresByPlan['free'])];

        if (isMasterAccount(user)) {
            return featuresByPlan.max;
        }

        if (plan === 'starter' && !isParentAccount) {
            features = features.filter(feature => ![
                'edit_customers', 'delete_customers',
                'edit_appointments', 'delete_appointments',
                'edit_products', 'delete_products'
            ].includes(feature));
        }

        features = businessRegistry.filterFeatures(features, user?.business_type);

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
        const isAdmin = isMasterAccount(user);
        const isSubUser = !!user?.parent_user_id;
        const menuItems = this.getMenuItemsWithDynamicLabels();
        this.itemAccessMap = {};
        
        // Filtrar items por rol, sub-usuario y tipo de negocio. Las restricciones por plan se muestran bloqueadas.
        const userBusinessType = (user?.business_type || '').toLowerCase().trim();
        const visibleByRole = menuItems.filter(item => {
            // Sub-usuarios no ven Reportes ni Mi Equipo
            if (isSubUser && (item.id === 'reports' || item.id === 'team')) {
                return false;
            }
            
            // Filtro por tipo de negocio - solo mostrar módulos de gobernanza si el negocio es gobernanza
            if (item.businessType && item.businessType !== userBusinessType) {
                return false;
            }
            
            // Filtro por rol específico
            if (item.roles && !item.roles.includes(user?.role)) {
                return false;
            }
            if (item.roleRequired && item.roleRequired === 'admin' && !isAdmin) {
                return false;
            }
            if (item.roleRequired && item.roleRequired !== 'admin' && user?.role !== item.roleRequired) {
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

        // Si un padre no está visible, su submenú tampoco debe renderizarse (soporta 2 niveles).
        const visibleIds = new Set(visibleByRole.map(item => item.id));
        const filteredItems = visibleByRole.filter(item => {
            if (!item.parentId) return true;
            if (!visibleIds.has(item.parentId)) return false;
            // Check grandfather visibility for deeply nested items
            const parent = this.allMenuItems.find(m => m.id === item.parentId);
            if (parent?.parentId && !visibleIds.has(parent.parentId)) return false;
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
        const parent = item.parentId ? this.allMenuItems.find(m => m.id === item.parentId) : null;
        const isLevel2 = !!parent?.parentId; // grandchild (e.g. team-payroll under team-hr under team)
        const submenuClass = item.parentId ? (isLevel2 ? 'submenu-item sub2-item' : 'submenu-item') : '';
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
                        const blockedItem = this.getMenuItemsWithDynamicLabels().find(item => item.route === route);
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
        const dashboardLayout = document.querySelector('.dashboard-layout');
        const isMobile = window.innerWidth <= this.mobileBreakpoint;

        if (isMobile) {
            const isActive = sidebar?.classList.contains('active');
            if (isActive) {
                this.closeSidebar();
            } else {
                this.openSidebar();
            }
        } else {
            dashboardLayout?.classList.toggle('sidebar-collapsed');
            // Ensure mobile-only drawer states are reset on desktop toggle.
            sidebar?.classList.remove('active');
            overlay?.classList.remove('active');
        }
    }

    /**
     * Cerrar sidebar (volver a modo compacto)
     */
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const dashboardLayout = document.querySelector('.dashboard-layout');
        const isMobile = window.innerWidth <= this.mobileBreakpoint;

        if (!isMobile) {
            dashboardLayout?.classList.add('sidebar-collapsed');
            return;
        }
        
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
        const isMobile = window.innerWidth <= this.mobileBreakpoint;

        if (!isMobile) {
            dashboardLayout?.classList.remove('sidebar-collapsed');
            return;
        }
        
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
