/**
 * TotpSetupView — Configuración de verificación en dos pasos (2FA/TOTP)
 * Accesible desde el Perfil / Configuración de cuenta.
 */

import apiService from '../services/api.service.js';
import router from '../utils/router.js';

export class TotpSetupView {
    render() {
        return `
            <div class="page-container" style="max-width:480px; margin:0 auto; padding:24px 16px;">
                <button class="btn btn-ghost" id="totp-back-btn" style="margin-bottom:16px;">← Volver</button>
                <h2 style="margin-bottom:6px;">Verificación en dos pasos</h2>
                <p style="color:var(--text-secondary,#666); margin-bottom:24px; font-size:0.9em;">
                    Protege tu cuenta con Google Authenticator, Authy u otra app compatible con TOTP.
                </p>

                <div id="totp-status-section">
                    <div class="spinner-inline" id="totp-loading">Cargando estado...</div>

                    <!-- Enabled state -->
                    <div id="totp-enabled-view" class="hidden">
                        <div class="alert alert-success" style="margin-bottom:16px;">
                            ✅ La verificación en dos pasos está <strong>activada</strong>.
                        </div>
                        <button class="btn btn-danger btn-full" id="totp-disable-btn">Desactivar 2FA</button>
                        <div id="totp-disable-form" class="hidden" style="margin-top:16px;">
                            <div class="form-group">
                                <label for="totp-disable-password">Confirma tu contraseña</label>
                                <input type="password" id="totp-disable-password" placeholder="••••••••">
                            </div>
                            <button class="btn btn-danger" id="totp-disable-confirm-btn">Confirmar desactivación</button>
                        </div>
                    </div>

                    <!-- Disabled state — setup flow -->
                    <div id="totp-setup-view" class="hidden">
                        <!-- Step 1: QR -->
                        <div id="totp-step-qr">
                            <h3 style="margin-bottom:10px;">1. Escanea el código QR</h3>
                            <p style="font-size:0.85em; color:var(--text-secondary,#666); margin-bottom:14px;">
                                Abre tu app de autenticador y escanea la imagen.
                            </p>
                            <div style="text-align:center; margin-bottom:14px;">
                                <img id="totp-qr-img" src="" alt="QR Code" style="width:200px; height:200px; border:1px solid #ddd; border-radius:8px;">
                            </div>
                            <details style="margin-bottom:16px; font-size:0.82em;">
                                <summary style="cursor:pointer; color:var(--primary,#0078d4);">¿No puedes escanear? Ingresa la clave manual</summary>
                                <code id="totp-secret-text" style="display:block; margin-top:8px; word-break:break-all; background:#f5f5f5; padding:8px; border-radius:4px;"></code>
                            </details>
                            <h3 style="margin-bottom:10px;">2. Ingresa el código de confirmación</h3>
                            <div class="form-group">
                                <label for="totp-confirm-code">Código de 6 dígitos</label>
                                <input type="text" id="totp-confirm-code" placeholder="000000" maxlength="6"
                                    inputmode="numeric" autocomplete="one-time-code" style="letter-spacing:4px; text-align:center;">
                            </div>
                            <div id="totp-setup-error" class="error hidden" style="margin-bottom:10px;"></div>
                            <button class="btn btn-primary btn-full" id="totp-confirm-btn">Activar 2FA</button>
                        </div>

                        <!-- Step 2: Backup codes -->
                        <div id="totp-step-backup" class="hidden">
                            <div class="alert alert-success" style="margin-bottom:16px;">
                                ✅ ¡2FA activado! Guarda estos códigos de respaldo en un lugar <strong>seguro y offline</strong>.
                                Cada código solo puede usarse <strong>una vez</strong>.
                            </div>
                            <div id="totp-backup-codes" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:20px; font-family:monospace; background:#f8f8f8; padding:16px; border-radius:8px;"></div>
                            <button class="btn btn-secondary btn-full" id="totp-copy-codes-btn" style="margin-bottom:8px;">📋 Copiar códigos</button>
                            <button class="btn btn-primary btn-full" id="totp-done-btn">Entendido, los guardé</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        document.getElementById('totp-back-btn')?.addEventListener('click', () => router.navigate('dashboard'));

        // Load current 2FA status
        try {
            const status = await apiService.get2faStatus();
            document.getElementById('totp-loading').classList.add('hidden');

            if (status.eligible === false) {
                document.getElementById('totp-status-section').innerHTML = `
                    <div class="alert alert-warning">
                        La verificación en 2 pasos está disponible solo para cuentas admin y propietarias.
                    </div>
                `;
                return;
            }

            if (status.totp_enabled) {
                this._showEnabled();
            } else {
                await this._startSetup();
            }
        } catch (err) {
            document.getElementById('totp-loading').textContent = 'Error al cargar estado: ' + err.message;
        }
    }

    _showEnabled() {
        document.getElementById('totp-enabled-view').classList.remove('hidden');

        document.getElementById('totp-disable-btn').addEventListener('click', () => {
            document.getElementById('totp-disable-form').classList.toggle('hidden');
        });

        document.getElementById('totp-disable-confirm-btn').addEventListener('click', async () => {
            const password = document.getElementById('totp-disable-password').value;
            if (!password) return;
            try {
                await apiService.disable2fa(password);
                alert('2FA desactivado correctamente.');
                router.navigate('dashboard');
            } catch (err) {
                alert('Error: ' + err.message);
            }
        });
    }

    async _startSetup() {
        document.getElementById('totp-setup-view').classList.remove('hidden');

        try {
            const data = await apiService.setup2fa();
            document.getElementById('totp-qr-img').src = data.qr_url;
            document.getElementById('totp-secret-text').textContent = data.secret;
        } catch (err) {
            document.getElementById('totp-setup-error').textContent = 'Error al iniciar configuración: ' + err.message;
            document.getElementById('totp-setup-error').classList.remove('hidden');
            return;
        }

        document.getElementById('totp-confirm-btn').addEventListener('click', async () => {
            const code = (document.getElementById('totp-confirm-code').value || '').trim();
            const errorEl = document.getElementById('totp-setup-error');
            errorEl.classList.add('hidden');

            if (code.length < 6) {
                errorEl.textContent = 'Ingresa el código de 6 dígitos';
                errorEl.classList.remove('hidden');
                return;
            }

            try {
                const result = await apiService.confirm2fa(code);
                this._showBackupCodes(result.backup_codes);
            } catch (err) {
                errorEl.textContent = err.message;
                errorEl.classList.remove('hidden');
            }
        });
    }

    _showBackupCodes(codes) {
        document.getElementById('totp-step-qr').classList.add('hidden');
        const step = document.getElementById('totp-step-backup');
        step.classList.remove('hidden');

        const container = document.getElementById('totp-backup-codes');
        container.innerHTML = codes.map(c => `<span style="padding:4px 8px; background:#fff; border:1px solid #ddd; border-radius:4px;">${c}</span>`).join('');

        document.getElementById('totp-copy-codes-btn').addEventListener('click', () => {
            navigator.clipboard?.writeText(codes.join('\n')).then(() => alert('Códigos copiados al portapapeles'));
        });

        document.getElementById('totp-done-btn').addEventListener('click', () => {
            router.navigate('dashboard');
        });
    }
}

export default new TotpSetupView();
