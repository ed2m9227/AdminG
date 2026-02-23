/**
 * Main Application Entry Point
 * Responsabilidad: Inicializar y orquestar la aplicación
 * Principio SOLID: Single Responsibility, Dependency Inversion
 */

import authService from './services/auth.service.js';
import router from './utils/router.js';
import sidebar from './components/Sidebar.js';
import header from './components/Header.js';

// Vistas
import loginView from './views/LoginView.js';
import registerView from './views/RegisterView.js';
import onboardingWizard from './views/OnboardingWizard.js';
import dashboardView from './views/DashboardView.js';
import customersView from './views/CustomersView.js';
import inventoryView from './views/InventoryView.js';
import { 
    appointmentsView, 
    paymentsView, 
    cashRegisterView, 
    reportsView, 
    adminView 
} from './views/OtherViews.js';
import { masterAdminView, teamManagementView } from './views/AdminPanelView.js';
import { BusinessTypesView } from './views/BusinessTypesView.js';
import modal from './components/Modal.js';

if (typeof window !== 'undefined' && typeof window.newUrlFound !== 'function') {
    // Guard for injected launcher scripts that expect this global.
    window.newUrlFound = () => {};
}

class App {
    constructor() {
        this.appRoot = document.getElementById('app');
        this.isInitialized = false;
    }

    /**
     * Inicializar la aplicación
     */
    async init() {
        if (this.isInitialized) return;

        console.log('🚀 Initializing AdminG App...');

        // Configurar rutas
        this.setupRoutes();

        // Configurar hooks de navegación
        this.setupNavigationHooks();

        // Verificar sesión y cargar vista inicial
        await this.loadInitialView();

        this.isInitialized = true;
        console.log('✅ App initialized successfully');
    }

    /**
     * Configurar todas las rutas
     */
    setupRoutes() {
        // Rutas públicas (sin autenticación)
        router.register('login', async () => {
            this.renderAuthView(loginView);
        });

        router.register('register', async () => {
            this.renderAuthView(registerView);
        });

        // Ruta de onboarding (requiere autenticación pero no requiere onboarding completado)
        router.register('onboarding', async () => {
            if (!authService.isAuthenticated()) {
                await router.navigate('login');
                return;
            }
            this.appRoot.innerHTML = await onboardingWizard.render();
            onboardingWizard.attachEvents();
        });

        // Rutas protegidas (requieren autenticación y onboarding completado)
        router.register('dashboard', async () => {
            await this.renderProtectedView(dashboardView);
        });

        router.register('customers', async () => {
            await this.renderProtectedView(customersView);
        });

        router.register('appointments', async () => {
            await this.renderProtectedView(appointmentsView);
        });

        router.register('inventory', async () => {
            await this.renderProtectedView(inventoryView);
        });

        router.register('payments', async () => {
            await this.renderProtectedView(paymentsView);
        });

        router.register('cashregister', async () => {
            await this.renderProtectedView(cashRegisterView);
        });

        router.register('reports', async () => {
            await this.renderProtectedView(reportsView);
        });

        // Nuevas rutas de administración
        router.register('admin', async () => {
            // Check onboarding first
            const onboardingCompleted = localStorage.getItem('onboarding_completed');
            if (!onboardingCompleted) {
                await router.navigate('onboarding');
                return;
            }
            
            const user = await authService.loadCurrentUser();
            if (user.role === 'admin') {
                // Panel maestro para admins globales
                await this.renderProtectedView(masterAdminView);
            } else if (user.plan !== 'free') {
                // Panel de equipo para usuarios no-admin
                await this.renderProtectedView(teamManagementView);
            } else {
                // Sin acceso
                this.renderProtectedView(adminView);
            }
        });

        router.register('team', async () => {
            await this.renderProtectedView(teamManagementView);
        });

        // Ruta para gestión de tipos de negocio
        router.register('businesstypes', async () => {
            // Check onboarding first, before checking role
            const onboardingCompleted = localStorage.getItem('onboarding_completed');
            if (!onboardingCompleted) {
                console.log('⚠️ Onboarding not completed, cannot access businesstypes');
                await router.navigate('onboarding');
                return;
            }
            
            const user = await authService.loadCurrentUser();
            if (user.role === 'admin') {
                await this.renderProtectedView(new BusinessTypesView());
            } else {
                modal.showError('Solo administradores pueden acceder a esta sección');
                await router.navigate('dashboard');
            }
        });
    }

    /**
     * Configurar hooks de navegación
     */
    setupNavigationHooks() {
        // Hook antes de navegar - verificar autenticación y onboarding
        router.beforeNavigate(async (path) => {
            console.log(`🔄 beforeNavigate: ${path}`);
            
            const publicRoutes = ['login', 'register'];
            const isPublicRoute = publicRoutes.includes(path);

            if (!isPublicRoute && !authService.isAuthenticated()) {
                console.log('⚠️ Not authenticated, redirecting to login');
                await router.navigate('login');
                return false;
            }

            // Check onboarding completion for protected routes (except onboarding itself)
            if (!isPublicRoute && path !== 'onboarding') {
                const onboardingCompleted = localStorage.getItem('onboarding_completed');
                console.log(`📋 Onboarding check for ${path}:`, onboardingCompleted);
                
                if (!onboardingCompleted) {
                    console.log('⚠️ Onboarding not completed, redirecting...');
                    await router.navigate('onboarding');
                    return false;
                }
            }

            // Load features if not loaded and user exists
            if (!isPublicRoute && authService.getFeatures().length === 0) {
                try {
                    console.log('📦 Loading features...');
                    await authService.loadFeatures();
                } catch (err) {
                    console.warn('Could not load features:', err);
                }
            }

            // Check feature access for non-admin users
            if (!isPublicRoute && path !== 'onboarding') {
                const user = authService.getCurrentUser();
                if (user && user.role !== 'admin') {
                    const routeFeatureMap = {
                        customers: 'view_customers',
                        appointments: 'view_appointments',
                        inventory: 'view_inventory',
                        payments: 'view_payments',
                        reports: 'view_reports',
                        cashregister: 'use_cashregister',
                        team: 'manage_team_users'
                    };

                    const requiredFeature = routeFeatureMap[path];
                    const features = authService.getFeatures();
                    if (requiredFeature && !features.includes(requiredFeature)) {
                        console.warn(`❌ Feature ${requiredFeature} not available`);
                        await modal.alert({
                            title: 'Aumenta tu plan',
                            message: 'Esta función no está disponible en tu plan actual.',
                            type: 'warning'
                        });
                        await router.navigate('dashboard');
                        return false;
                    }
                }
            }

            console.log(`✅ beforeNavigate passed for ${path}`);
            return true; // Continuar con la navegación
        });

        // Hook después de navegar - actualizar título
        router.afterNavigate((path) => {
            header.updateTitle(path);
            console.log(`📍 Navigated to: ${path}`);
        });
    }

    /**
     * Cargar vista inicial
     */
    async loadInitialView() {
        if (authService.isAuthenticated()) {
            try {
                const user = await authService.loadCurrentUser();
                await authService.loadFeatures();
                
                // Check if onboarding was already completed
                const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
                
                // Admin users bypass onboarding completely
                if (user.role === 'admin') {
                    console.log('🔑 Admin account detected - bypassing onboarding');
                    localStorage.setItem('onboarding_completed', 'true');
                    await router.navigate('dashboard');
                    return;
                }
                
                // If onboarding is already completed, go to dashboard
                if (onboardingCompleted) {
                    console.log('✓ Onboarding already completed - going to dashboard');
                    await router.navigate('dashboard');
                    return;
                }
                
                // Non-admin users MUST complete onboarding first
                console.log('⏳ Non-admin user - directing to onboarding');
                await router.navigate('onboarding');
            } catch (error) {
                console.error('Error loading user:', error);
                await router.navigate('login');
            }
        } else {
            await router.navigate('login');
        }
    }

    /**
     * Renderizar vista de autenticación (login/register)
     * @param {object} view 
     */
    renderAuthView(view) {
        this.appRoot.innerHTML = view.render();
        if (view.init) view.init();
    }

    /**
     * Renderizar vista protegida (dashboard, customers, etc.)
     * @param {object} view 
     */
    async renderProtectedView(view) {
        // Check if onboarding is completed
        const onboardingCompleted = localStorage.getItem('onboarding_completed');
        
        if (!onboardingCompleted) {
            console.log('⚠️ Onboarding not completed, redirecting...');
            await router.navigate('onboarding');
            return;
        }

        // Renderizar layout de dashboard
        this.appRoot.innerHTML = `
            <div class="dashboard-layout">
                ${sidebar.render()}
                <div class="main-content">
                    ${header.render()}
                    <div class="content-area">
                        ${view.render()}
                    </div>
                </div>
            </div>
        `;

        // Inicializar componentes
        sidebar.init();
        header.init();

        // Inicializar vista específica
        if (view.init) {
            await view.init();
        }
    }

    /**
     * Crear vista dinámicade features disponibles (plan gating)
     */
    createFeaturesView() {
        const self = this;
        return {
            render() {
                return `
                    <div id="featuresContainer">
                        <div class="admin-header">
                            <h2>🎯 Funcionalidades Disponibles</h2>
                            <p class="admin-subtitle">Features incluidas en tu plan actual</p>
                        </div>
                        <div id="featuresLoader" style="text-align: center; padding: 40px;">
                            <div style="font-size: 24px;">⏳</div>
                            <p>Cargando funcionalidades...</p>
                        </div>
                    </div>
                `;
            },
            async init() {
                try {
                    const response = await fetch('/admin/features', {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }).then(r => r.json());

                    const container = document.getElementById('featuresLoader');
                    const plan = response.plan;
                    const features = response.features || [];
                    const limits = response.limits || {};

                    const planColors = {
                        'free': '#95a5a6',
                        'basic': '#3498db',
                        'plus': '#2ecc71',
                        'start': '#f39c12',
                        'max': '#9b59b6',
                        'admin': '#e74c3c'
                    };

                    const groupedFeatures = {
                        'Clientes': features.filter(f => f.includes('customer')),
                        'Citas': features.filter(f => f.includes('appointment')),
                        'Inventario': features.filter(f => f.includes('product') || f.includes('inventory')),
                        'Pagos': features.filter(f => f.includes('payment')),
                        'Reportes': features.filter(f => f.includes('report')),
                        'Caja': features.filter(f => f.includes('cashregister')),
                        'Equipo': features.filter(f => f.includes('team')),
                        'Admin': features.filter(f => f.includes('admin'))
                    };

                    container.innerHTML = `
                        <div style="margin-bottom: 30px;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                                <div style="padding: 20px; background: linear-gradient(135deg, ${planColors[plan]}, ${planColors[plan]}dd); color: white; border-radius: 8px; text-align: center;">
                                    <div style="text-transform: uppercase; font-weight: 600; font-size: 12px; opacity: 0.9;">Plan</div>
                                    <div style="font-size: 28px; font-weight: bold; margin: 10px 0;">${plan.toUpperCase()}</div>
                                </div>
                                <div style="padding: 20px; background: #ecf0f1; border-radius: 8px; text-align: center;">
                                    <div style="font-weight: 600; color: #7f8c8d; font-size: 12px;">Total de Features</div>
                                    <div style="font-size: 28px; font-weight: bold; color: #2c3e50; margin: 10px 0;">${features.length}</div>
                                </div>
                            </div>
                        </div>

                        <div class="card">
                            <div class="card-header">
                                <h3>Límites de Recursos</h3>
                            </div>
                            <div class="card-body">
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                                    ${Object.entries(limits).map(([key, value]) => `
                                        <div style="padding: 15px; background: #f5f7fa; border-radius: 8px; border-left: 4px solid #667eea;">
                                            <div style="font-weight: 600; color: #667eea; text-transform: uppercase; font-size: 11px;">${key.replace(/_/g, ' ')}</div>
                                            <div style="font-size: 20px; font-weight: bold; margin-top: 8px; color: #2c3e50;">${value}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="card">
                            <div class="card-header">
                                <h3>Funcionalidades por Categoría</h3>
                            </div>
                            <div class="card-body">
                                <div style="display: grid; gap: 20px;">
                                    ${Object.entries(groupedFeatures).filter(([_, feats]) => feats.length > 0).map(([category, feats]) => `
                                        <div>
                                            <h4 style="color: #667eea; margin-bottom: 10px; font-weight: 600;">✓ ${category}</h4>
                                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                                                ${feats.map(f => `
                                                    <div style="padding: 10px; background: #f0f8ff; border-radius: 6px; border-left: 3px solid #28a745; font-size: 13px;">
                                                        ${f.replace(/_/g, ' ')}
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `;
                } catch (error) {
                    document.getElementById('featuresLoader').innerHTML = `
                        <div style="padding: 40px; text-align: center;">
                            <div style="color: #e74c3c; font-size: 24px;">⚠️</div>
                            <p style="color: #e74c3c;">Error cargando funcionalidades: ${error.message}</p>
                        </div>
                    `;
                }
            }
        };
    }
}

// Crear instancia de la app
const app = new App();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Exportar para debugging
window.app = app;
window.router = router;
window.authService = authService;
