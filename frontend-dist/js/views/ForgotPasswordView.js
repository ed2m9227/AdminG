/**
 * Forgot Password View
 */

import apiService from '../services/api.service.js';
import router from '../utils/router.js';

class ForgotPasswordView {
    render() {
        return `
            <div class="auth-container">
                <div class="auth-box">
                    <h1 class="auth-title">Recuperar contraseña</h1>
                    <p class="auth-subtitle">Ingresa tu correo y restablece acceso</p>

                    <div id="forgotError" class="error hidden"></div>
                    <div id="forgotSuccess" class="success hidden"></div>

                    <form id="forgotEmailForm" class="auth-form">
                        <div class="form-group">
                            <label for="forgotEmail">Email</label>
                            <input type="email" id="forgotEmail" name="email" placeholder="tu@email.com" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-full" id="forgotBtn">Enviar código</button>
                    </form>

                    <form id="resetPasswordForm" class="auth-form" style="margin-top: 18px; border-top: 1px solid #e5e7eb; padding-top: 18px;">
                        <div class="form-group">
                            <label for="resetToken">Token de recuperación</label>
                            <input type="text" id="resetToken" name="token" placeholder="Pega el token recibido" required>
                        </div>
                        <div class="form-group">
                            <label for="newPassword">Nueva contraseña</label>
                            <input type="password" id="newPassword" name="newPassword" minlength="6" placeholder="Mínimo 6 caracteres" required>
                        </div>
                        <button type="submit" class="btn btn-success btn-full" id="resetBtn">Restablecer contraseña</button>
                    </form>

                    <p class="link">
                        <a href="#" data-navigate="login">Volver a iniciar sesión</a>
                    </p>
                </div>
            </div>
        `;
    }

    init() {
        document.getElementById('forgotEmailForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleForgot(e);
        });

        document.getElementById('resetPasswordForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleReset(e);
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-navigate="login"]')) {
                e.preventDefault();
                router.navigate('login');
            }
        });
    }

    async handleForgot(e) {
        const form = e.target;
        const btn = document.getElementById('forgotBtn');
        const errorEl = document.getElementById('forgotError');
        const successEl = document.getElementById('forgotSuccess');
        const email = form.email.value.trim();

        btn.disabled = true;
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');

        try {
            const result = await apiService.forgotPassword(email);
            const tokenPart = result?.reset_token
                ? `<br><strong>Token temporal:</strong> ${result.reset_token}`
                : '';
            successEl.innerHTML = `Solicitud procesada.${tokenPart}<br>Si existe el correo, usa el token para cambiar contraseña.`;
            successEl.classList.remove('hidden');
            if (result?.reset_token) {
                const tokenInput = document.getElementById('resetToken');
                if (tokenInput) tokenInput.value = result.reset_token;
            }
        } catch (error) {
            errorEl.textContent = error.message || 'No se pudo procesar la solicitud';
            errorEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
        }
    }

    async handleReset(e) {
        const form = e.target;
        const btn = document.getElementById('resetBtn');
        const errorEl = document.getElementById('forgotError');
        const successEl = document.getElementById('forgotSuccess');
        const token = form.token.value.trim();
        const newPassword = form.newPassword.value;

        btn.disabled = true;
        errorEl.classList.add('hidden');

        try {
            await apiService.resetPassword(token, newPassword);
            successEl.innerHTML = 'Contraseña restablecida correctamente. Redirigiendo a login...';
            successEl.classList.remove('hidden');
            setTimeout(() => router.navigate('login'), 1400);
        } catch (error) {
            errorEl.textContent = error.message || 'No se pudo restablecer la contraseña';
            errorEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
        }
    }
}

export default new ForgotPasswordView();
