/**
 * Header Component
 * Responsabilidad: Renderizar header/topbar de la aplicación
 * Principio SOLID: Single Responsibility
 */

import authService from '../services/auth.service.js';
import router from '../utils/router.js';
import apiService from '../services/api.service.js';
import modal from './Modal.js';
import sidebar from './Sidebar.js';
import { t, setCurrentLanguage } from '../utils/i18n.js';

const STORAGE_KEYS = {
    theme: 'adming.quick.theme',
    sidebarCompact: 'adming.quick.sidebar_compact',
    notificationsMuted: 'adming.quick.notifications_muted',
    language: 'adming.quick.language',
};

export class Header {
    constructor() {
        this._notifCount = 0;
        this._notifList = [];
        this._pollTimer = null;
        this._fetchInFlight = null;
        this._lastFetchAt = 0;
        this._documentClickHandler = null;
        this._documentKeyHandler = null;
        this.preferences = {
            theme: this._readStoredValue(STORAGE_KEYS.theme, 'day'),
            sidebarCompact: this._readStoredBoolean(STORAGE_KEYS.sidebarCompact, false),
            notificationsMuted: this._readStoredBoolean(STORAGE_KEYS.notificationsMuted, false),
            language: this._readStoredValue(STORAGE_KEYS.language, 'ES'),
        };

        this.quickSettingsSections = [
            { id: 'interface', title: t('quick.section_interface', 'Interfaz'), icon: '⚙️' },
            { id: 'security', title: t('quick.section_security', 'Seguridad'), icon: '🔒' },
            { id: 'session', title: t('quick.section_session', 'Sesión'), icon: '👤' },
        ];
        this.quickSettingsCollapsed = this._loadQuickSettingsSectionState();

        this.titles = {
            dashboard: t('menu.dashboard', 'Dashboard'),
            customers: t('menu.customers', 'Clientes'),
            appointments: t('menu.appointments', 'Citas'),
            inventory: t('menu.inventory', 'Inventario'),
            payments: t('menu.payments', 'Pagos'),
            cashregister: t('menu.cashregister', 'Caja Registradora'),
            reports: t('menu.reports', 'Reportes'),
            invoices: t('menu.invoices', 'Facturas'),
            documents: t('menu.documents', 'Documentos'),
            authorizations: t('menu.authorizations', 'Autorizaciones'),
            crm: t('menu.crm', 'CRM'),
            team: t('menu.team', 'Mi Equipo'),
            'team-risks': t('menu.team_risks', 'Riesgos Laborales'),
            'team-expenses': t('menu.team_expenses', 'Gastos / Expense Management'),
            'team-movements': t('menu.team_movements', 'Movimientos del Equipo'),
            'team-hr': t('menu.team_hr', 'RRHH'),
            'team-payroll': t('menu.team_payroll', 'Nómina'),
            'team-requests': t('menu.team_requests', 'Solicitudes RRHH'),
            'team-tracking': t('menu.team_tracking', 'Seguimiento RRHH'),
            'admin-ia': `✨ ${t('menu.admin_ia', 'Admin IA')}`,
            admin: t('menu.admin', 'Administración'),
            businessconfig: t('menu.business_config', 'Configuración de Negocio'),
            businesstypes: t('menu.business_types', 'Tipos de Negocio'),
        };

        this._applyThemePreference();
        this._applyLanguagePreference();
    }

    /**
     * Renderizar el header
     * @returns {string} HTML del header
     */
    render() {
        const user = authService.getCurrentUser();
        const currentRoute = router.getCurrentRoute() || 'dashboard';
        const title = this.titles[currentRoute] || 'AdminG';
        const quickActions = this._getQuickActions();
        const badgeHtml = this._notifCount > 0
            ? `<span id="notifBadge" class="notif-badge">${this._notifCount > 9 ? '9+' : this._notifCount}</span>`
            : `<span id="notifBadge" class="notif-badge" style="display:none;"></span>`;
        const trialBadge = user?.free_trial_active
            ? `<span class="user-badge user-trial-badge">TRIAL ${user?.free_trial_days_left || 0}d</span>`
            : '';

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
                    ${trialBadge}
                    <span class="user-badge">${user?.plan?.toUpperCase() || ''}</span>
                    <div class="header-action-group" id="notifWrapper">
                        <button id="notifBell" class="header-icon-btn" title="${t('header.notifications', 'Notificaciones')}" aria-haspopup="true" aria-expanded="false">
                            &#128276;
                            ${badgeHtml}
                        </button>
                        <div id="notifDropdown" class="header-dropdown notification-dropdown" style="display:none;">
                            <div class="header-dropdown-header">
                                <strong>${t('header.notifications', 'Notificaciones')}</strong>
                                <button id="notifMarkAll" class="header-dropdown-action">${t('header.mark_all', 'Marcar todo leído')}</button>
                            </div>
                            <div id="notifList" class="notif-list"></div>
                        </div>
                    </div>
                    <div class="header-action-group" id="quickSettingsWrapper">
                        <button id="quickSettingsBtn" class="header-icon-btn quick-settings-trigger" title="Quick settings" aria-haspopup="true" aria-expanded="false">
                            &#9881;
                        </button>
                        <div id="quickSettingsDropdown" class="header-dropdown quick-settings-dropdown" style="display:none;">
                            <div class="header-dropdown-header">
                                <div>
                                    <strong>${t('header.quick_title', 'Ajustes rápidos')}</strong>
                                    <p class="quick-settings-subtitle">${t('header.quick_subtitle', 'Operación inmediata del panel')}</p>
                                </div>
                            </div>
                            <div id="quickSettingsList" class="quick-settings-list">
                                ${this._getQuickActionSections().map((section) => {
                                    const isCollapsed = this.quickSettingsCollapsed[section.id];
                                    return `
                                        <div class="quick-settings-section${isCollapsed ? ' collapsed' : ''}">
                                            <button type="button" class="quick-settings-section-header" data-quick-settings-section="${section.id}">
                                                <span class="quick-settings-section-icon">${section.icon}</span>
                                                <span>${section.title}</span>
                                                <span class="quick-settings-section-indicator">${isCollapsed ? '+' : '−'}</span>
                                            </button>
                                            <div class="quick-settings-section-items">
                                                ${section.items.map(action => `
                                                    <button class="quick-settings-item${action.danger ? ' danger' : ''}" data-quick-action="${action.id}">
                                                        <span class="quick-settings-icon">${action.icon}</span>
                                                        <span class="quick-settings-copy">
                                                            <span class="quick-settings-label">${action.label}</span>
                                                            <span class="quick-settings-hint">${action.hint}</span>
                                                        </span>
                                                        ${action.status ? `<span class="quick-settings-status">${action.status}</span>` : ''}
                                                    </button>
                                                `).join('')}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
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

        const quickSettingsBtn = document.getElementById('quickSettingsBtn');
        if (quickSettingsBtn) {
            quickSettingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._toggleQuickSettings();
            });
        }

        const quickSettingsList = document.getElementById('quickSettingsList');
        if (quickSettingsList) {
            quickSettingsList.addEventListener('click', async (e) => {
                const actionBtn = e.target.closest('[data-quick-action]');
                if (!actionBtn) return;
                e.preventDefault();
                await this._handleQuickAction(actionBtn.getAttribute('data-quick-action'));
            });
        }

        this._detachGlobalHandlers();
        this._documentClickHandler = (e) => {
            if (!e.target.closest('#notifWrapper')) {
                this._closeNotifications();
            }
            if (!e.target.closest('#quickSettingsWrapper')) {
                this._closeQuickSettings();
            }
        };
        document.addEventListener('click', this._documentClickHandler);

        this._documentKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this._closeNotifications();
                this._closeQuickSettings();
            }
        };
        document.addEventListener('keydown', this._documentKeyHandler);

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

        this._applySidebarPreference();
        this._renderQuickSettingsActions();

        if (this._appointmentsChangedHandler) {
            window.removeEventListener('appointments:changed', this._appointmentsChangedHandler);
        }
        this._appointmentsChangedHandler = () => this._fetchNotifications(true);
        window.addEventListener('appointments:changed', this._appointmentsChangedHandler);

        this._startPolling();
    }

    async _toggleDropdown() {
        const dd = document.getElementById('notifDropdown');
        const bell = document.getElementById('notifBell');
        if (!dd) return;
        const isVisible = dd.style.display !== 'none';
        if (isVisible) {
            dd.style.display = 'none';
            if (bell) bell.setAttribute('aria-expanded', 'false');
        } else {
            this._closeQuickSettings();
            await this._fetchNotifications(true);
            this._renderDropdown();
            dd.style.display = 'block';
            if (bell) bell.setAttribute('aria-expanded', 'true');
        }
    }

    _toggleQuickSettings() {
        const dd = document.getElementById('quickSettingsDropdown');
        const btn = document.getElementById('quickSettingsBtn');
        if (!dd || !btn) return;

        const isVisible = dd.style.display !== 'none';
        if (isVisible) {
            this._closeQuickSettings();
            return;
        }

        this._closeNotifications();
        this._renderQuickSettingsActions();
        dd.style.display = 'block';
        btn.setAttribute('aria-expanded', 'true');
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

    async _fetchNotifications(force = false) {
        try {
            if (!authService.isAuthenticated() || this.preferences.notificationsMuted) return;
            if (!force && document.visibilityState === 'hidden') return;

            const now = Date.now();
            if (!force && now - this._lastFetchAt < 15000) return;
            if (this._fetchInFlight) return this._fetchInFlight;

            this._fetchInFlight = (async () => {
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
                this._lastFetchAt = Date.now();
            })();

            await this._fetchInFlight;
        } catch {
            // silent — notifications are non-critical
        } finally {
            this._fetchInFlight = null;
        }
    }

    _startPolling() {
        if (this._pollTimer) clearInterval(this._pollTimer);
        if (this.preferences.notificationsMuted) return;
        this._fetchNotifications(true);
        this._pollTimer = setInterval(() => this._fetchNotifications(false), 60000);
    }

    stopPolling() {
        if (this._pollTimer) {
            clearInterval(this._pollTimer);
            this._pollTimer = null;
        }
    }

    _closeNotifications() {
        const dd = document.getElementById('notifDropdown');
        const bell = document.getElementById('notifBell');
        if (dd) dd.style.display = 'none';
        if (bell) bell.setAttribute('aria-expanded', 'false');
    }

    _closeQuickSettings() {
        const dd = document.getElementById('quickSettingsDropdown');
        const btn = document.getElementById('quickSettingsBtn');
        if (dd) dd.style.display = 'none';
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    _detachGlobalHandlers() {
        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler);
            this._documentClickHandler = null;
        }
        if (this._documentKeyHandler) {
            document.removeEventListener('keydown', this._documentKeyHandler);
            this._documentKeyHandler = null;
        }
    }

    _getQuickActions() {
        const currentUser = authService.getCurrentUser() || {};
        const plan = (currentUser.plan || 'free').toLowerCase();
        const isAdmin = currentUser.role === 'admin';

        return [
            {
                id: 'toggle-theme',
                section: 'interface',
                icon: this.preferences.theme === 'night' ? '☀' : '☾',
                label: this.preferences.theme === 'night' ? t('quick.theme_day', 'Modo día') : t('quick.theme_night', 'Modo noche'),
                hint: t('quick.theme_hint', 'Cambia la interfaz entre claro y oscuro'),
                status: this.preferences.theme === 'night' ? 'Oscuro' : 'Claro',
            },
            {
                id: 'change-language',
                section: 'interface',
                icon: '🌐',
                label: t('quick.change_language', 'Cambiar idioma'),
                hint: t('quick.change_language_hint', 'Alterna entre ES / EN / DE / RU'),
                status: (this.preferences.language || 'ES').toUpperCase(),
            },
            {
                id: 'toggle-fullscreen',
                section: 'interface',
                icon: document.fullscreenElement ? '⊡' : '⛶',
                label: document.fullscreenElement ? t('quick.fullscreen_off', 'Salir de pantalla completa') : t('quick.fullscreen_on', 'Pantalla completa'),
                hint: t('quick.fullscreen_hint', 'Usa más espacio para operar'),
            },
            {
                id: 'change-password',
                section: 'security',
                icon: '🔑',
                label: t('quick.change_password', 'Cambiar contraseña'),
                hint: t('quick.change_password_hint', 'Actualiza tu contraseña de forma segura'),
                hidden: false,
            },
            {
                id: '2fa-settings',
                section: 'security',
                icon: '🔐',
                label: t('quick.2fa', 'Verificación en 2 pasos'),
                hint: t('quick.2fa_hint', 'Configura Google Authenticator / Authy'),
                hidden: !['pro', 'max', 'admin'].includes(plan) && !isAdmin,
            },
            {
                id: 'logout',
                section: 'session',
                icon: '⇦',
                label: t('quick.logout', 'Cerrar sesión'),
                hint: t('quick.logout_hint', 'Salir de la cuenta actual'),
                danger: true,
            },
        ];
    }

    _loadQuickSettingsSectionState() {
        try {
            const stored = window.localStorage.getItem('adming.quick.settings.collapsed');
            return stored ? JSON.parse(stored) : {
                interface: false,
                security: true,
                session: false,
            };
        } catch (_error) {
            return {
                interface: false,
                security: true,
                session: false,
            };
        }
    }

    _saveQuickSettingsSectionState() {
        window.localStorage.setItem('adming.quick.settings.collapsed', JSON.stringify(this.quickSettingsCollapsed));
    }

    _toggleQuickSettingsSection(sectionId) {
        this.quickSettingsCollapsed[sectionId] = !this.quickSettingsCollapsed[sectionId];
        this._saveQuickSettingsSectionState();
        this._renderQuickSettingsActions();
    }

    _getQuickActionSections() {
        const actions = this._getQuickActions().filter((action) => !action.hidden);
        return this.quickSettingsSections
            .map((section) => ({
                ...section,
                items: actions.filter((action) => action.section === section.id),
            }))
            .filter((section) => section.items.length > 0);
    }


    _renderQuickSettingsActions() {
        const quickSettingsList = document.getElementById('quickSettingsList');
        if (!quickSettingsList) return;

        const sections = this._getQuickActionSections();
        quickSettingsList.innerHTML = sections.map((section) => {
            const isCollapsed = this.quickSettingsCollapsed[section.id];
            return `
                <div class="quick-settings-section${isCollapsed ? ' collapsed' : ''}">
                    <button type="button" class="quick-settings-section-header" data-quick-settings-section="${section.id}">
                        <span>${section.title}</span>
                        <span class="quick-settings-section-indicator">${isCollapsed ? '+' : '−'}</span>
                    </button>
                    <div class="quick-settings-section-items">
                        ${section.items.map(action => `
                            <button class="quick-settings-item${action.danger ? ' danger' : ''}" data-quick-action="${action.id}">
                                <span class="quick-settings-icon">${action.icon}</span>
                                <span class="quick-settings-copy">
                                    <span class="quick-settings-label">${action.label}</span>
                                    <span class="quick-settings-hint">${action.hint}</span>
                                </span>
                                ${action.status ? `<span class="quick-settings-status">${action.status}</span>` : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        quickSettingsList.querySelectorAll('[data-quick-settings-section]').forEach((button) => {
            button.addEventListener('click', () => {
                this._toggleQuickSettingsSection(button.dataset.quickSettingsSection);
            });
        });
    }

    async _handleQuickAction(action) {
        switch (action) {
            case 'toggle-theme':
                this.preferences.theme = this.preferences.theme === 'night' ? 'day' : 'night';
                this._persistPreference(STORAGE_KEYS.theme, this.preferences.theme);
                this._applyThemePreference();
                break;
            case 'toggle-sidebar':
                this._toggleSidebarCompact();
                break;
            case 'change-language':
                this.preferences.language = this._nextLanguageCode(this.preferences.language);
                this._persistPreference(STORAGE_KEYS.language, this.preferences.language);
                setCurrentLanguage(this.preferences.language);
                this._applyLanguagePreference();
                window.location.reload();
                break;
            case 'toggle-fullscreen':
                await this._toggleFullscreen();
                break;
            case 'toggle-notifications':
                this.preferences.notificationsMuted = !this.preferences.notificationsMuted;
                this._persistPreference(STORAGE_KEYS.notificationsMuted, this.preferences.notificationsMuted);
                if (this.preferences.notificationsMuted) {
                    this.stopPolling();
                } else {
                    this._startPolling();
                }
                break;
            case 'change-password': {
                this._closeQuickSettings();
                const modalId = `change-password-modal-${Date.now()}`;
                const content = `
                    <div class="form-group">
                        <label for="${modalId}-current">${t('quick.current_password', 'Contraseña actual')}</label>
                        <input id="${modalId}-current" type="password" class="form-control" placeholder="${t('quick.current_password_placeholder', 'Ingresa tu contraseña actual')}" />
                    </div>
                    <div class="form-group">
                        <label for="${modalId}-new">${t('quick.new_password', 'Nueva contraseña')}</label>
                        <input id="${modalId}-new" type="password" class="form-control" placeholder="${t('quick.new_password_placeholder', 'Mínimo 8 caracteres')}" />
                    </div>
                    <div id="${modalId}-error" class="error hidden" style="margin-top:12px;color:#c53030;font-size:13px;"></div>
                    <div class="modal-actions" style="margin-top:18px;display:flex;justify-content:flex-end;gap:10px;">
                        <button class="btn" data-cancel>${t('quick.cancel', 'Cancelar')}</button>
                        <button class="btn btn-primary" data-confirm>${t('quick.save', 'Guardar')}</button>
                    </div>
                `;

                const modalElement = modal.show({
                    title: t('quick.change_password', 'Cambiar contraseña'),
                    content,
                    size: 'small',
                });

                const closeModal = () => modal.close(modalElement);
                const showError = (message) => {
                    const errorEl = modalElement.querySelector(`#${modalId}-error`);
                    if (errorEl) {
                        errorEl.textContent = message;
                        errorEl.classList.remove('hidden');
                    }
                };

                modalElement.addEventListener('click', async (e) => {
                    if (e.target.closest('[data-confirm]')) {
                        const currentPassword = modalElement.querySelector(`#${modalId}-current`)?.value || '';
                        const newPassword = modalElement.querySelector(`#${modalId}-new`)?.value || '';
                        if (!currentPassword || !newPassword) {
                            showError(t('quick.password_fields_required', 'Debes completar ambos campos.'));
                            return;
                        }
                        if (newPassword.length < 8) {
                            showError(t('quick.password_min_length', 'La contraseña debe tener al menos 8 caracteres.'));
                            return;
                        }

                        try {
                            await apiService.changePassword(currentPassword, newPassword);
                            closeModal();
                            await modal.alert({
                                title: t('quick.password_changed', 'Contraseña actualizada'),
                                message: t('quick.password_changed_success', 'Tu contraseña se ha actualizado correctamente.'),
                                type: 'success',
                            });
                        } catch (err) {
                            showError(err.message || t('quick.password_change_failed', 'No se pudo cambiar la contraseña.'));
                        }
                    } else if (e.target.closest('[data-cancel]') || e.target.closest('[data-close]')) {
                        closeModal();
                    }
                });
                return;
            }
            case '2fa-settings':
                this._closeQuickSettings();
                router.navigate('totp-setup');
                return;
            case 'logout':
                this._closeQuickSettings();
                this.handleLogout();
                return;
            default:
                return;
        }

        this._renderQuickSettingsActions();
    }

    async _markAllNotificationsRead() {
        try {
            await apiService.post('/notifications/read-all', {});
            this._notifCount = 0;
            this._notifList = this._notifList.map(n => ({ ...n, is_read: true }));
            this._renderDropdown();
            this._updateBadge();
        } catch {
            // non-critical action
        }
    }

    _toggleSidebarCompact() {
        const dashboardLayout = document.querySelector('.dashboard-layout');
        const mobileBreakpoint = sidebar.mobileBreakpoint || 768;

        if (window.innerWidth <= mobileBreakpoint) {
            sidebar.toggleSidebar();
            return;
        }

        const nextCompact = !dashboardLayout?.classList.contains('sidebar-collapsed');
        if (nextCompact) {
            dashboardLayout?.classList.add('sidebar-collapsed');
        } else {
            dashboardLayout?.classList.remove('sidebar-collapsed');
        }

        this.preferences.sidebarCompact = nextCompact;
        this._persistPreference(STORAGE_KEYS.sidebarCompact, nextCompact);
    }

    _applySidebarPreference() {
        const dashboardLayout = document.querySelector('.dashboard-layout');
        const mobileBreakpoint = sidebar.mobileBreakpoint || 768;
        if (!dashboardLayout || window.innerWidth <= mobileBreakpoint) return;

        dashboardLayout.classList.toggle('sidebar-collapsed', this.preferences.sidebarCompact);
    }

    _isSidebarCompact() {
        const dashboardLayout = document.querySelector('.dashboard-layout');
        if (dashboardLayout) {
            return dashboardLayout.classList.contains('sidebar-collapsed');
        }
        return this.preferences.sidebarCompact;
    }

    async _toggleFullscreen() {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
            }
        } catch {
            // fullscreen can be blocked by browser policy
        }
    }

    _applyThemePreference() {
        if (typeof document === 'undefined') return;
        document.documentElement.setAttribute('data-theme', this.preferences.theme === 'night' ? 'night' : 'day');
    }

    _nextLanguageCode(current) {
        const langs = ['ES', 'EN', 'DE', 'RU'];
        const currentCode = (current || 'ES').toUpperCase();
        const index = langs.indexOf(currentCode);
        return langs[(index + 1) % langs.length];
    }

    _applyLanguagePreference() {
        if (typeof document === 'undefined') return;
        const code = (this.preferences.language || 'ES').toUpperCase();
        const htmlLang = {
            ES: 'es',
            EN: 'en',
            DE: 'de',
            RU: 'ru',
        }[code] || 'es';

        document.documentElement.setAttribute('lang', htmlLang);
        document.documentElement.setAttribute('data-lang', code);
    }

    _readStoredValue(key, fallback) {
        if (typeof window === 'undefined') return fallback;
        return localStorage.getItem(key) || fallback;
    }

    _readStoredBoolean(key, fallback) {
        if (typeof window === 'undefined') return fallback;
        const value = localStorage.getItem(key);
        if (value === null) return fallback;
        return value === 'true';
    }

    _persistPreference(key, value) {
        if (typeof window === 'undefined') return;
        localStorage.setItem(key, String(value));
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
        this.stopPolling();
        authService.logout();
        router.navigate('login');
    }
}

export default new Header();
