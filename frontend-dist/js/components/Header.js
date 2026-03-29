/**
 * Header Component
 * Responsabilidad: Renderizar header/topbar de la aplicación
 * Principio SOLID: Single Responsibility
 */

import authService from '../services/auth.service.js';
import router from '../utils/router.js';
import apiService from '../services/api.service.js';
import modal from './Modal.js';

export class Header {
    constructor() {
        this._notifCount = 0;
        this._notifList = [];
        this._pollTimer = null;

        this.titles = {
            dashboard: 'Dashboard',
            customers: 'Clientes',
            appointments: 'Citas',
            inventory: 'Inventario',
            payments: 'Pagos',
            cashregister: 'Caja Registradora',
            reports: 'Reportes',
            team: 'Mi Equipo',
            'team-movements': 'Movimientos del Equipo',
            admin: 'Administración',
            businessconfig: 'Configuracion de negocio',
            businesstypes: 'Tipos de Negocio',
        };
    }

    /**
     * Renderizar el header
     * @returns {string} HTML del header
     */
    render() {
        const user = authService.getCurrentUser();
        const currentRoute = router.getCurrentRoute() || 'dashboard';
        const title = this.titles[currentRoute] || 'AdminG';
        const badgeHtml = this._notifCount > 0
            ? `<span id="notifBadge" style="position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:700;">${this._notifCount > 9 ? '9+' : this._notifCount}</span>`
            : `<span id="notifBadge" style="display:none;position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;align-items:center;justify-content:center;font-weight:700;"></span>`;

        return `
            <div class="topbar">
                <div class="topbar-left">
                    <button class="btn btn-sm btn-light sidebar-toggle" id="sidebarToggle" title="Ocultar barra lateral">
                        &#9776;
                    </button>
                    <h1 class="page-title">${title}</h1>
                </div>
                <div class="user-info">
                    <span class="user-email">${user?.email || ''}</span>
                    <span class="user-badge">${user?.plan?.toUpperCase() || ''}</span>
                    <!-- Notification bell -->
                    <div style="position:relative;display:inline-block;" id="notifWrapper">
                        <button id="notifBell" style="background:none;border:none;cursor:pointer;font-size:20px;padding:4px 8px;position:relative;" title="Notificaciones">
                            &#128276;
                            ${badgeHtml}
                        </button>
                        <div id="notifDropdown" style="display:none;position:absolute;right:0;top:36px;width:340px;max-height:420px;overflow-y:auto;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:9999;">
                            <div style="padding:12px 16px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;">
                                <strong>Notificaciones</strong>
                                <button id="notifMarkAll" style="font-size:12px;background:none;border:none;color:#6366f1;cursor:pointer;">Marcar todo leído</button>
                            </div>
                            <div id="notifList" style="padding:4px 0;"></div>
                        </div>
                    </div>
                    <button class="btn btn-danger btn-sm" id="logoutBtn">
                        Salir
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Actualizar el título del header
     * @param {string} route 
     */
    updateTitle(route) {
        const titleElement = document.querySelector('.page-title');
        if (titleElement) {
            titleElement.textContent = this.titles[route] || 'AdminG';
        }
    }

    /**
     * Inicializar event listeners
     */
    init() {
        // Click en logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Notification bell
        const bell = document.getElementById('notifBell');
        if (bell) {
            bell.addEventListener('click', (e) => {
                e.stopPropagation();
                this._toggleDropdown();
            });
        }

        const markAll = document.getElementById('notifMarkAll');
        if (markAll) {
            markAll.addEventListener('click', async () => {
                await apiService.post('/notifications/read-all', {});
                this._notifCount = 0;
                this._notifList = this._notifList.map(n => ({ ...n, is_read: true }));
                this._renderDropdown();
                this._updateBadge();
            });
        }

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (e.target.id === 'logoutBtn') {
                this.handleLogout();
            }
            if (!e.target.closest('#notifWrapper')) {
                const dd = document.getElementById('notifDropdown');
                if (dd) dd.style.display = 'none';
            }
        });

        // Event delegation for per-notification read
        const notifList = document.getElementById('notifList');
        if (notifList) {
            notifList.addEventListener('click', async (e) => {
                const btn = e.target.closest('[data-notif-id]');
                if (!btn) return;
                const nid = parseInt(btn.getAttribute('data-notif-id'));
                const n = this._notifList.find(x => x.id === nid);

                if (n?.type === 'team_invite' && n?.reference_id) {
                    const accepted = await modal.confirm({
                        title: 'Invitación de equipo',
                        message: `${n.message || 'Tienes una invitación pendiente.'}\n\n¿Deseas aceptar la invitación?`,
                        confirmText: 'Aceptar',
                        cancelText: 'Declinar',
                    });

                    try {
                        if (accepted) {
                            await apiService.request(`/admin/team/accept-invite/${n.reference_id}`, 'POST');
                            await modal.alert({ title: 'Éxito', message: 'Invitación aceptada.', type: 'success' });
                        } else {
                            await apiService.request(`/admin/team/decline-invite/${n.reference_id}`, 'POST');
                            await modal.alert({ title: 'Listo', message: 'Invitación declinada.', type: 'info' });
                        }
                    } catch (err) {
                        await modal.alert({ title: 'Error', message: err.message || 'No se pudo procesar la invitación.', type: 'error' });
                    }
                }

                await apiService.post(`/notifications/${nid}/read`, {});
                if (n && !n.is_read) {
                    n.is_read = true;
                    this._notifCount = Math.max(0, this._notifCount - 1);
                }
                this._renderDropdown();
                this._updateBadge();
                this._openNotificationTarget(n);
            });
        }

        // Start polling every 60 s
        this._startPolling();
    }

    async _toggleDropdown() {
        const dd = document.getElementById('notifDropdown');
        if (!dd) return;
        const isVisible = dd.style.display !== 'none';
        if (isVisible) {
            dd.style.display = 'none';
        } else {
            await this._fetchNotifications();
            this._renderDropdown();
            dd.style.display = 'block';
        }
    }

    _renderDropdown() {
        const listEl = document.getElementById('notifList');
        if (!listEl) return;
        const notifications = this._prepareNotificationsForView(this._notifList);
        if (!notifications.length) {
            listEl.innerHTML = `<p style="padding:16px;color:#9ca3af;text-align:center;">Sin notificaciones</p>`;
            return;
        }
        const iconMap = {
            low_stock: '📦',
            appointment: '📅',
            appointment_today: '🗓️',
            appointment_overdue: '⏰',
            duplicate_appointment: '⚠️',
            duplicate_customer: '🧾',
            special_date: '🎉',
            document: '📄',
            team_invite: '🤝'
        };
        listEl.innerHTML = notifications.map(n => `
            <div data-notif-id="${n.id}" style="padding:10px 16px;cursor:pointer;border-bottom:1px solid #f0f0f0;background:${n.is_read ? '#f8fafc' : '#eef2ff'};opacity:${n.is_read ? '0.78' : '1'};transition:opacity .2s ease, background-color .2s ease;">
                <div style="display:flex;gap:8px;align-items:flex-start;">
                    <span style="font-size:16px;">${iconMap[n.type] || '🔔'}</span>
                    <div style="flex:1;">
                        <div style="font-weight:${n.is_read ? '400' : '600'};font-size:13px;color:${n.is_read ? '#64748b' : '#111827'};">${n.title}</div>
                        ${n.message ? `<div style="font-size:12px;color:${n.is_read ? '#94a3b8' : '#6b7280'};margin-top:2px;">${n.message}</div>` : ''}
                        <div style="font-size:11px;color:#9ca3af;margin-top:3px;">${new Date(n.created_at).toLocaleString('es-CO')}</div>
                    </div>
                    ${!n.is_read ? '<span style="width:8px;height:8px;border-radius:50%;background:#6366f1;flex-shrink:0;margin-top:4px;"></span>' : ''}
                </div>
            </div>
        `).join('');
    }

    _prepareNotificationsForView(list) {
        if (!Array.isArray(list) || list.length === 0) return [];

        // Dedupe race-created notifications by semantic signature (same type/reference/text/date).
        const deduped = [];
        const seen = new Set();

        for (const n of list) {
            const createdDate = new Date(n.created_at || Date.now()).toISOString().slice(0, 10);
            const key = [
                n.type || '',
                n.reference_type || '',
                n.reference_id ?? '',
                (n.title || '').trim().toLowerCase(),
                (n.message || '').trim().toLowerCase(),
                createdDate,
            ].join('|');

            if (seen.has(key)) continue;
            seen.add(key);
            deduped.push(n);
        }

        // Show unread first, then recent read entries.
        return deduped.sort((a, b) => {
            if (!!a.is_read !== !!b.is_read) return a.is_read ? 1 : -1;
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }

    _updateBadge() {
        const badge = document.getElementById('notifBadge');
        if (!badge) return;
        if (this._notifCount > 0) {
            badge.textContent = this._notifCount > 9 ? '9+' : this._notifCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    async _fetchNotifications() {
        try {
            if (!authService.isAuthenticated()) return;
            const list = await apiService.get('/notifications/');
            if (Array.isArray(list)) {
                this._notifList = this._prepareNotificationsForView(list);
                this._notifCount = this._notifList.filter(n => !n.is_read).length;
                this._updateBadge();
                const dd = document.getElementById('notifDropdown');
                if (dd && dd.style.display !== 'none') {
                    this._renderDropdown();
                }
            }
        } catch {
            // silent — notifications are non-critical
        }
    }

    _startPolling() {
        if (this._pollTimer) clearInterval(this._pollTimer);
        this._fetchNotifications();
        this._pollTimer = setInterval(() => this._fetchNotifications(), 60_000);
    }

    stopPolling() {
        if (this._pollTimer) {
            clearInterval(this._pollTimer);
            this._pollTimer = null;
        }
    }

    _openNotificationTarget(notification) {
        if (!notification) return;
        const t = notification.type;
        if (t === 'low_stock') {
            router.navigate('inventory');
            return;
        }
        if (['appointment', 'appointment_today', 'appointment_overdue', 'duplicate_appointment'].includes(t)) {
            router.navigate('appointments');
            return;
        }
        if (t === 'duplicate_customer') {
            router.navigate('customers');
        }
    }

    /**
     * Manejar logout
     */
    handleLogout() {
        authService.logout();
        router.navigate('login');
    }
}

export default new Header();
