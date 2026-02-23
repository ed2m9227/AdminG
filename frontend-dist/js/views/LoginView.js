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
            console.log('🔐 Attempting login...');
            await authService.login(email, password);
            console.log('✅ Login successful, token saved');
            
            // Pequeña pausa para asegurar que el token esté guardado
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const user = await authService.loadCurrentUser();
            const userEmail = user?.email || '';

            // Admin users bypass onboarding completely
            if (user?.role === 'admin') {
                localStorage.setItem('onboarding_completed', 'true');
                localStorage.setItem('onboarding_user_email', userEmail);
                console.log('🎯 Admin detected, bypassing onboarding...');
                router.navigate('dashboard');
                return;
            }

            // For non-admin users, check onboarding status
            const storedEmail = localStorage.getItem('onboarding_user_email');
            const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
            
            console.log('📋 Checking onboarding status:');
            console.log('   - Current email:', userEmail);
            console.log('   - Stored email:', storedEmail);
            console.log('   - Onboarding completed:', onboardingCompleted);

            // If it's a different user, clear onboarding flags and start fresh
            if (storedEmail && storedEmail !== userEmail) {
                console.log('ℹ️ Different user detected, clearing onboarding flags...');
                localStorage.removeItem('onboarding_completed');
            }

            // Always set/update the current user email
            localStorage.setItem('onboarding_user_email', userEmail);

            // Check if onboarding is truly complete for this user
            const userOnboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
            
            if (!userOnboardingCompleted) {
                console.log('🎯 User must complete onboarding, redirecting...');
                router.navigate('onboarding');
            } else {
                console.log('🎯 Onboarding already completed, going to dashboard...');
                router.navigate('dashboard');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        } finally {
            btn.disabled = false;
        }
    }
}

export default new LoginView();
