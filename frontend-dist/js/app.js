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

        // Rutas protegidas (requieren autenticación)
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

        router.register('admin', async () => {
            await this.renderProtectedView(adminView);
        });
    }

    /**
     * Configurar hooks de navegación
     */
    setupNavigationHooks() {
        // Hook antes de navegar - verificar autenticación
        router.beforeNavigate(async (path) => {
            const publicRoutes = ['login', 'register'];
            const isPublicRoute = publicRoutes.includes(path);

            if (!isPublicRoute && !authService.isAuthenticated()) {
                console.log('⚠️ Redirecting to login - not authenticated');
                await router.navigate('login');
                return false; // Cancelar navegación original
            }

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
                await authService.loadCurrentUser();
                await router.navigate('dashboard');
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
