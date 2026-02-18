/**
 * Router - Sistema de navegación SPA
 * Responsabilidad: Gestión de rutas y navegación
 * Principio SOLID: Single Responsibility
 */

export class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.beforeNavigateHooks = [];
        this.afterNavigateHooks = [];
    }

    /**
     * Registrar una ruta
     * @param {string} path 
     * @param {Function} handler 
     */
    register(path, handler) {
        this.routes.set(path, handler);
    }

    /**
     * Navegar a una ruta
     * @param {string} path 
     * @param {object} params 
     */
    async navigate(path, params = {}) {
        // Ejecutar hooks antes de navegar
        for (const hook of this.beforeNavigateHooks) {
            const shouldContinue = await hook(path, params);
            if (shouldContinue === false) {
                return;
            }
        }

        const handler = this.routes.get(path);
        
        if (!handler) {
            console.error(`Route not found: ${path}`);
            return;
        }

        this.currentRoute = path;
        
        try {
            await handler(params);
        } catch (error) {
            console.error(`Error rendering route ${path}:`, error);
        }

        // Ejecutar hooks después de navegar
        for (const hook of this.afterNavigateHooks) {
            await hook(path, params);
        }
    }

    /**
     * Agregar hook antes de navegar
     * @param {Function} hook 
     */
    beforeNavigate(hook) {
        this.beforeNavigateHooks.push(hook);
    }

    /**
     * Agregar hook después de navegar
     * @param {Function} hook 
     */
    afterNavigate(hook) {
        this.afterNavigateHooks.push(hook);
    }

    /**
     * Obtener ruta actual
     * @returns {string|null}
     */
    getCurrentRoute() {
        return this.currentRoute;
    }
}

// Exportar instancia singleton
export default new Router();
