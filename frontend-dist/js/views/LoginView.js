/**
 * Login View
 * Responsabilidad: Renderizar y manejar el formulario de login
 * Principio SOLID: Single Responsibility
 */

import authService from '../services/auth.service.js';
import router from '../utils/router.js';

export class LoginView {
    render() {
        return `
            <div class="auth-container">
                <div class="auth-box">
                    <h1 class="auth-title">AdminG</h1>
                    <p class="auth-subtitle">Sistema ERP Profesional</p>
                    
                    <div id="loginError" class="error hidden"></div>
                    
                    <form id="loginForm" class="auth-form">
                        <div class="form-group">
                            <label for="loginEmail">Email</label>
                            <input 
                                type="email" 
                                id="loginEmail" 
                                name="email"
                                placeholder="tu@email.com" 
                                required 
                                autocomplete="email"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="loginPassword">Contraseña</label>
                            <input 
                                type="password" 
                                id="loginPassword" 
                                name="password"
                                placeholder="••••••••" 
                                required
                                autocomplete="current-password"
                            >
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-full" id="loginBtn">
                            Iniciar Sesión
                        </button>
                    </form>
                    
                    <p class="link">
                        ¿No tienes cuenta? 
                        <a href="#" data-navigate="register">Regístrate aquí</a>
                    </p>
                </div>
            </div>
        `;
    }

    init() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(e);
        });

        // Navegación a registro
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-navigate="register"]')) {
                e.preventDefault();
                router.navigate('register');
            }
        });
    }

    async handleLogin(e) {
        const form = e.target;
        const btn = document.getElementById('loginBtn');
        const errorDiv = document.getElementById('loginError');
        
        const email = form.email.value.trim();
        const password = form.password.value;

        btn.disabled = true;
        errorDiv.classList.add('hidden');

        try {
            await authService.login(email, password);
            router.navigate('dashboard');
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        } finally {
            btn.disabled = false;
        }
    }
}

export default new LoginView();
