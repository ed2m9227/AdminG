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
import forgotPasswordView from './views/ForgotPasswordView.js';
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
import { teamRisksView, teamExpensesView } from './views/TeamOpsViews.js';
import { teamPayrollView, teamHrRequestsView, teamHrTrackingView } from './views/TeamHrView.js';
import teamEmployeesView from './views/TeamEmployeesView.js';
import aiStudioView from './views/AiStudioView.js';
import { masterAdminView, teamManagementView, teamMovementsView } from './views/AdminPanelView.js';
import paymentPendingView from './views/PaymentPendingView.js';
import { BusinessTypesView } from './views/BusinessTypesView.js';
import businessConfigView from './views/BusinessConfigView.js';
import invoicesView from './views/InvoicesView.js';
import documentsView from './views/DocumentsView.js';
import authorizationsView from './views/AuthorizationsView.js';
import crmView from './views/CrmView.js';
import totpSetupView from './views/TotpSetupView.js';
import governanceView from './views/GovernanceView.js';
import treasuryView from './views/TreasuryView.js';
import assemblyView from './views/AssemblyView.js';
import projectsView from './views/ProjectsView.js';
import inventoryJacView from './views/InventoryJacView.js';
import strategicView from './views/StrategicView.js';
import modal from './components/Modal.js';
import aiChatWidget from './components/AiChatWidget.js';

function isMasterAccount(user) {
    return user?.role === 'admin' || user?.plan === 'admin' || user?.business_type === 'master';
}

function needsPaymentGate(user) {
    if (!user) return false;
    if (isMasterAccount(user)) return false;
    if (user.plan === 'free') return false;
    if (user.parent_user_id) return false;  // sub-users inherit parent's paid status
    return user.plan_paid === false;
}

if (typeof window !== 'undefined' && typeof window.newUrlFound !== 'function') {
    // Guard for injected launcher scripts that expect this global.
    window.newUrlFound = () => {};
}

if (typeof window !== 'undefined' && typeof window.currentUserFound !== 'function') {
    // Guard for legacy launcher scripts that still probe this global.
    window.currentUserFound = () => {};
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

        router.register('forgot-password', async () => {
            this.renderAuthView(forgotPasswordView);
        });

        router.register('totp-setup', async () => {
            if (!authService.isAuthenticated()) {
                await router.navigate('login');
                return;
            }
            aiChatWidget.unmount();
            this.appRoot.innerHTML = totpSetupView.render();
            await totpSetupView.init();
        });

        // Ruta de onboarding (requiere autenticación pero no requiere onboarding completado)
        router.register('onboarding', async () => {
            if (!authService.isAuthenticated()) {
                await router.navigate('login');
                return;
            }
            aiChatWidget.unmount();
            this.appRoot.innerHTML = await onboardingWizard.render();
            onboardingWizard.attachEvents();
        });

        // Ruta de pago pendiente (requiere autenticación, no requiere plan_paid)
        router.register('payment-pending', async () => {
            if (!authService.isAuthenticated()) {
                await router.navigate('login');
                return;
            }
            aiChatWidget.unmount();
            this.appRoot.innerHTML = paymentPendingView.render();
            await paymentPendingView.init();
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

        router.register('invoices', async () => {
            await this.renderProtectedView(invoicesView);
        });

        router.register('documents', async () => {
            await this.renderProtectedView(documentsView);
        });

        router.register('authorizations', async () => {
            await this.renderProtectedView(authorizationsView);
        });

        router.register('crm', async () => {
            const user = await authService.loadCurrentUser();
            if (isMasterAccount(user)) {
                await this.renderProtectedView(crmView);
                return;
            }

            await sidebar.loadUserFeatures(true);
            if (!sidebar.userFeatures.includes('view_crm')) {
                modal.showWarning('CRM no disponible para tu plan actual.');
                await router.navigate('dashboard');
                return;
            }
            await this.renderProtectedView(crmView);
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
            if (isMasterAccount(user)) {
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

        router.register('team-movements', async () => {
            const user = await authService.loadCurrentUser();
            if (user.plan !== 'free') {
                await this.renderProtectedView(teamMovementsView);
            } else {
                modal.showError('Esta función está disponible en planes pagados');
                await router.navigate('dashboard');
            }
        });

        router.register('team-risks', async () => {
            await this.renderProtectedView(teamRisksView);
        });

        router.register('team-expenses', async () => {
            await this.renderProtectedView(teamExpensesView);
        });

        // RRHH routes
        router.register('team-hr', async () => {
            await this.renderProtectedView(teamEmployeesView);
        });

        router.register('team-payroll', async () => {
            await this.renderProtectedView(teamPayrollView);
        });

        router.register('team-requests', async () => {
            await this.renderProtectedView(teamHrRequestsView);
        });

        router.register('team-tracking', async () => {
            await this.renderProtectedView(teamHrTrackingView);
        });

        router.register('team-employees', async () => {
            await this.renderProtectedView(teamEmployeesView);
        });

        // Admin IA
        router.register('admin-ia', async () => {
            await sidebar.loadUserFeatures(true);
            if (!sidebar.userFeatures.includes('use_ai_studio')) {
                modal.showWarning('Admin IA no está disponible para tu plan actual.');
                await router.navigate('dashboard');
                return;
            }
            await this.renderProtectedView(aiStudioView);
        });

        // Legacy route alias
        router.register('ai-studio', async () => {
            await router.navigate('admin-ia');
        });

        router.register('businessconfig', async () => {
            const onboardingCompleted = localStorage.getItem('onboarding_completed');
            if (!onboardingCompleted) {
                await router.navigate('onboarding');
                return;
            }

            const user = await authService.loadCurrentUser();
            if ((isMasterAccount(user) || user.role === 'manager') && !user.parent_user_id) {
                await this.renderProtectedView(businessConfigView);
                return;
            }

            modal.showError('Solo la cuenta principal puede acceder a esta sección');
            await router.navigate('dashboard');
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
            if (isMasterAccount(user)) {
                await this.renderProtectedView(new BusinessTypesView());
            } else {
                modal.showError('Solo administradores pueden acceder a esta sección');
                await router.navigate('dashboard');
            }
        });

        // Rutas JAC - Sistema de Gobernanza (Fases 1-6)
        router.register('governance', async () => {
            const onboardingCompleted = localStorage.getItem('onboarding_completed');
            if (!onboardingCompleted) {
                await router.navigate('onboarding');
                return;
            }
            await this.renderProtectedView(governanceView);
        });

        router.register('treasury', async () => {
            const onboardingCompleted = localStorage.getItem('onboarding_completed');
            if (!onboardingCompleted) {
                await router.navigate('onboarding');
                return;
            }
            await this.renderProtectedView(treasuryView);
        });

        router.register('assembly', async () => {
            const onboardingCompleted = localStorage.getItem('onboarding_completed');
            if (!onboardingCompleted) {
                await router.navigate('onboarding');
                return;
            }
            await this.renderProtectedView(assemblyView);
        });

        router.register('projects', async () => {
            const onboardingCompleted = localStorage.getItem('onboarding_completed');
            if (!onboardingCompleted) {
                await router.navigate('onboarding');
                return;
            }
            await this.renderProtectedView(projectsView);
        });

        router.register('inventory-jac', async () => {
            const onboardingCompleted = localStorage.getItem('onboarding_completed');
            if (!onboardingCompleted) {
                await router.navigate('onboarding');
                return;
            }
            await this.renderProtectedView(inventoryJacView);
        });

        router.register('strategic', async () => {
            const onboardingCompleted = localStorage.getItem('onboarding_completed');
            if (!onboardingCompleted) {
                await router.navigate('onboarding');
                return;
            }
            await this.renderProtectedView(strategicView);
        });
    }

    /**
     * Configurar hooks de navegación
     */
    setupNavigationHooks() {
        // Hook antes de navegar - verificar autenticación y onboarding
        router.beforeNavigate(async (path) => {
            console.log(`🔄 beforeNavigate: ${path}`);
            
            const publicRoutes = ['login', 'register', 'forgot-password'];
            const isPublicRoute = publicRoutes.includes(path);

            if (!isPublicRoute && !authService.isAuthenticated()) {
                console.log('⚠️ Not authenticated, redirecting to login');
                await router.navigate('login');
                return false;
            }

            // Check onboarding completion for protected routes (except onboarding itself)
            if (!isPublicRoute && path !== 'onboarding' && path !== 'payment-pending') {
                const onboardingCompleted = localStorage.getItem('onboarding_completed');
                console.log(`📋 Onboarding check for ${path}:`, onboardingCompleted);
                
                if (!onboardingCompleted) {
                    console.log('⚠️ Onboarding not completed, redirecting...');
                    await router.navigate('onboarding');
                    return false;
                }
            }

            // Payment gate: paid plan selected but not yet confirmed by admin
            if (!isPublicRoute && path !== 'onboarding' && path !== 'payment-pending') {
                const user = authService.getCurrentUser();
                if (user && needsPaymentGate(user)) {
                    console.warn('💳 Plan not paid yet, redirecting to payment-pending');
                    await router.navigate('payment-pending');
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
                if (user && !isMasterAccount(user)) {
                    const routeFeatureMap = {
                        customers: 'view_customers',
                        appointments: 'view_appointments',
                        inventory: 'view_inventory',
                        reports: 'view_reports',
                        cashregister: 'use_cashregister',
                        documents: 'view_documents',
                        authorizations: 'view_authorizations',
                        crm: 'view_crm',
                        team: 'view_team',
                        'team-risks': 'view_risks',
                        'team-expenses': 'view_expenses',
                        'team-hr': 'view_hr',
                        'team-payroll': 'view_payroll',
                        'team-requests': 'view_hr_requests',
                        'team-tracking': 'view_hr_tracking',
                        'team-movements': 'view_team',
                        'admin-ia': 'use_ai_studio',
                        'ai-studio': 'use_ai_studio',
                        admin: 'admin_panel',
                        businesstypes: 'admin_panel',
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

                if (user?.plan_expired) {
                    const expiredNoticeKey = `plan-expired-notice-${user.id}`;
                    if (sessionStorage.getItem(expiredNoticeKey) !== 'shown') {
                        await modal.alert({
                            title: 'Plan vencido',
                            message: 'Tu plan vencio y tu cuenta paso temporalmente a FREE en modo visualizacion. Tu informacion se conserva tal como quedo. Ve a Pagos > Ver Planes para renovar.',
                            type: 'warning'
                        });
                        sessionStorage.setItem(expiredNoticeKey, 'shown');
                    }
                }
                
                // Check if onboarding was already completed
                const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
                
                // Admin users bypass onboarding completely
                if (isMasterAccount(user)) {
                    console.log('🔑 Admin account detected - bypassing onboarding');
                    localStorage.setItem('onboarding_completed', 'true');
                    await router.navigate('dashboard');
                    return;
                }
                
                // If onboarding is already completed, go to dashboard
                if (onboardingCompleted) {
                    console.log('✓ Onboarding already completed - going to dashboard');
                    // Payment gate: block dashboard if paid plan not confirmed
                    if (needsPaymentGate(user)) {
                        console.warn('💳 Plan not paid, redirecting to payment-pending');
                        await router.navigate('payment-pending');
                        return;
                    }
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
        aiChatWidget.unmount();
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

        // Forzar recarga para reflejar cambios de plan/rol/tipo de negocio sin hard refresh
        await Promise.all([
            sidebar.loadUserFeatures(true),
            sidebar.loadBusinessLabels(true),
        ]);
        
        // Renderizar sidebar
        const sidebarHTML = sidebar.render();

        // Renderizar layout de dashboard
        this.appRoot.innerHTML = `
            <div class="dashboard-layout">
                ${sidebarHTML}
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

        const currentRoute = router.getCurrentRoute();
        if (currentRoute === 'admin-ia' || currentRoute === 'ai-studio') {
            aiChatWidget.unmount();
        } else if (sidebar.userFeatures.includes('use_ai_chat')) {
            aiChatWidget.mount(sidebar.userFeatures.includes('use_ai_studio'));
        } else {
            aiChatWidget.unmount();
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
                        'starter': '#3498db',
                        'pro': '#9b59b6',
                        'max': '#e74c3c',
                        'admin': '#e74c3c'
                    };

                    const groupedFeatures = {
                        'Clientes': features.filter(f => f.includes('customer')),
                        'Citas': features.filter(f => f.includes('appointment')),
                        'Inventario': features.filter(f => f.includes('product') || f.includes('inventory')),
                        'Pagos': features.filter(f => f.includes('payment')),
                        'CRM': features.filter(f => f.includes('crm')),
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
