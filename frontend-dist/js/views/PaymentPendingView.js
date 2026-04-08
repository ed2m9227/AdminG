/**
 * PaymentPendingView
 * Shown after onboarding when a paid plan was selected and payment_paid = false.
 * Displays Nequi link, plan summary, and reference-submission form.
 * Polls /users/me every 8 s — once plan_paid = true it redirects to dashboard.
 */

import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import { PLAN_CATALOG } from '../utils/plans.js';

const POLL_INTERVAL_MS = 8000;

class PaymentPendingView {
    constructor() {
        this._pollTimer = null;
        this._submitted = false;
    }

    render() {
        // Render happens synchronously; real data is loaded in init()
        return `
            <div class="payment-pending-wrapper">
                <div class="payment-pending-card" id="paymentPendingCard">
                    <div class="payment-pending-header">
                        <span class="payment-pending-icon">⏳</span>
                        <h2>Activa tu plan para continuar</h2>
                        <p id="pendingSubtitle">Cargando información de tu plan…</p>
                    </div>
                    <div id="paymentPendingBody"></div>
                </div>
            </div>
        `;
    }

    async init() {
        try {
            const user = await authService.loadCurrentUser();

            // If already paid → go straight to dashboard
            if (user.plan === 'free' || user.plan_paid) {
                await this._goToDashboard();
                return;
            }

            this._renderBody(user);
            this._startPolling(user);
        } catch (err) {
            document.getElementById('paymentPendingBody').innerHTML =
                `<p style="color:#ef4444;">Error al cargar información de tu cuenta: ${err.message}</p>`;
        }
    }

    _renderBody(user) {
        const plan = PLAN_CATALOG.find(p => p.code === user.plan) || {
            name: user.plan?.toUpperCase(),
            priceCOP: 0,
            nequiLink: null,
        };

        document.getElementById('pendingSubtitle').textContent =
            `Plan seleccionado: ${plan.name} — $${(plan.priceCOP || 0).toLocaleString('es-CO')} COP / mes`;

        const nequiHtml = plan.nequiLink
            ? `<a href="${plan.nequiLink}" target="_blank" rel="noopener noreferrer" class="btn-payment-nequi">
                   💳 Pagar con Nequi — ${plan.name}
               </a>`
            : `<p style="color:#6b7280;font-size:13px;">
                   Contacta a soporte para recibir el link de pago de tu plan.
               </p>`;

        document.getElementById('paymentPendingBody').innerHTML = `
            <div class="payment-pending-steps">

                <div class="payment-step">
                    <div class="payment-step-number">1</div>
                    <div class="payment-step-content">
                        <h3>Realiza el pago</h3>
                        <p>Usa el enlace de Nequi para completar el pago de tu plan.</p>
                        ${nequiHtml}
                    </div>
                </div>

                <div class="payment-step">
                    <div class="payment-step-number">2</div>
                    <div class="payment-step-content">
                        <h3>Envía tu referencia de pago</h3>
                        <p>Tras pagar, copia el número de transacción o referencia que te dió Nequi.</p>
                        <form id="referenceForm" class="reference-form">
                            <input
                                id="referenceInput"
                                type="text"
                                placeholder="Ej: NEQ-2026-1234567"
                                class="form-input"
                                autocomplete="off"
                                maxlength="80"
                            />
                            <button type="submit" class="btn btn-next" id="submitRefBtn" ${this._submitted ? 'disabled' : ''}>
                                ${this._submitted ? '✓ Referencia enviada' : 'Enviar referencia'}
                            </button>
                        </form>
                        <p id="referenceStatus" class="reference-status"></p>
                    </div>
                </div>

                <div class="payment-step">
                    <div class="payment-step-number">3</div>
                    <div class="payment-step-content">
                        <h3>Espera la activación</h3>
                        <p>Un administrador verificará tu pago y activará tu cuenta en menos de 24 horas.
                           Esta página se actualiza automáticamente.</p>
                        <p class="polling-indicator" id="pollingIndicator">🔄 Verificando estado…</p>
                    </div>
                </div>

            </div>

            <div class="payment-pending-footer">
                <button id="logoutPendingBtn" class="btn btn-prev" style="font-size:12px;">
                    ← Cerrar sesión
                </button>
            </div>
        `;

        document.getElementById('referenceForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this._submitReference(user.plan);
        });

        document.getElementById('logoutPendingBtn')?.addEventListener('click', () => {
            authService.logout();
            window.location.hash = '#login';
        });
    }

    async _submitReference(plan) {
        const input = document.getElementById('referenceInput');
        const statusEl = document.getElementById('referenceStatus');
        const btn = document.getElementById('submitRefBtn');
        const ref = (input?.value || '').trim();

        if (!ref || ref.length < 4) {
            if (statusEl) statusEl.textContent = '⚠️ Ingresa la referencia de pago de Nequi.';
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
        try {
            await apiService.post('/users/me/submit-payment-reference', { reference: ref, plan });
            this._submitted = true;
            if (statusEl) {
                statusEl.textContent = '✅ ¡Referencia enviada! El administrador activará tu cuenta a la brevedad.';
                statusEl.style.color = '#059669';
            }
            if (btn) btn.textContent = '✓ Referencia enviada';
        } catch (err) {
            if (statusEl) {
                statusEl.textContent = `❌ Error: ${err.message}`;
                statusEl.style.color = '#ef4444';
            }
            if (btn) { btn.disabled = false; btn.textContent = 'Enviar referencia'; }
        }
    }

    _startPolling(user) {
        this._stopPolling();
        this._pollTimer = setInterval(async () => {
            try {
                const fresh = await authService.loadCurrentUser();
                if (fresh.plan_paid || fresh.plan === 'free') {
                    this._stopPolling();
                    const indicator = document.getElementById('pollingIndicator');
                    if (indicator) indicator.textContent = '✅ ¡Plan activado! Redirigiendo al dashboard…';
                    setTimeout(() => this._goToDashboard(), 1500);
                }
            } catch (_) {
                // ignore transient errors during polling
            }
        }, POLL_INTERVAL_MS);
    }

    _stopPolling() {
        if (this._pollTimer) {
            clearInterval(this._pollTimer);
            this._pollTimer = null;
        }
    }

    async _goToDashboard() {
        this._stopPolling();
        const router = (await import('../utils/router.js')).default;
        await router.navigate('dashboard');
    }

    destroy() {
        this._stopPolling();
    }
}

export default new PaymentPendingView();
