/**
 * Register View
 * Responsabilidad: Renderizar y manejar el formulario de registro
 * Principio SOLID: Single Responsibility
 */

import authService from '../services/auth.service.js';
import router from '../utils/router.js';

export class RegisterView {
    render() {
        return `
            <div class="auth-container">
                <div class="auth-box">
                    <h1 class="auth-title">AdminG</h1>
                    <p class="auth-subtitle">Crear nueva cuenta</p>
                    
                    <div id="registerError" class="error hidden"></div>
                    <div id="registerSuccess" class="success hidden">
                        Registro exitoso. Redirigiendo a login...
                    </div>
                    
                    <form id="registerForm" class="auth-form">
                        <div class="form-group">
                            <label for="regEmail">Email</label>
                            <input 
                                type="email" 
                                id="regEmail" 
                                name="email"
                                placeholder="tu@email.com" 
                                required
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="regPassword">Contraseña</label>
                            <input 
                                type="password" 
                                id="regPassword" 
                                name="password"
                                placeholder="••••••••" 
                                required 
                                minlength="6"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="regConfirm">Confirmar Contraseña</label>
                            <input 
                                type="password" 
                                id="regConfirm" 
                                name="confirmPassword"
                                placeholder="••••••••" 
                                required
                            >
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-full" id="regBtn">
                            Crear Cuenta
                        </button>
                    </form>
                    
                    <p class="link">
                        ¿Ya tienes cuenta? 
                        <a href="#" data-navigate="login">Inicia sesión aquí</a>
                    </p>
                </div>
            </div>
        `;
    }

    init() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister(e);
        });

        // Navegación a login
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-navigate="login"]')) {
                e.preventDefault();
                router.navigate('login');
            }
        });

    }

    async handleRegister(e) {
        const form = e.target;
        const btn = document.getElementById('regBtn');
        const errorDiv = document.getElementById('registerError');
        const successDiv = document.getElementById('registerSuccess');

        const email = form.email.value.trim();
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;
        // Rol por defecto para cuentas dueñas del plan
        const role = 'manager';
        
        // Plan temporal - será elegido en onboarding
        const plan = 'free';

        if (password !== confirmPassword) {
            errorDiv.textContent = 'Las contraseñas no coinciden';
            errorDiv.classList.remove('hidden');
            return;
        }

        btn.disabled = true;
        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');

        try {
            await authService.register({ email, password, plan, role });
            
            successDiv.innerHTML = `
                <p>✅ Registro exitoso</p>
                <p style="font-size: 11px; color: #666; margin-top: 4px;">Seleccionarás tu plan en el próximo paso...</p>
                <p style="font-size: 11px; color: #666; margin-top: 4px;">Redirigiendo a login...</p>
            `;
            successDiv.classList.remove('hidden');
            form.style.display = 'none';
            
            setTimeout(() => {
                router.navigate('login');
            }, 2500);
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        } finally {
            btn.disabled = false;
        }
    }
}

export default new RegisterView();
