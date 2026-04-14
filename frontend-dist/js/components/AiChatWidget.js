import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';
import router from '../utils/router.js';

class AiChatWidget {
    constructor() {
        this.mounted = false;
        this.open = false;
        this.fullscreen = false;
    }

    mount(hasStudio = false) {
        if (!authService.isAuthenticated()) {
            this.unmount();
            return;
        }

        if (!this.mounted) {
            const root = document.createElement('div');
            root.id = 'aiChatWidgetRoot';
            root.innerHTML = `
                <div class="ai-quick-actions" id="aiQuickActions">
                    ${hasStudio ? '<button class="ai-quick-btn" id="aiQuickStudio" title="Admin IA — vista completa">&#9654;</button>' : ''}
                    <button class="ai-quick-btn" id="aiQuickMetrics" title="Métricas rápidas">&#128202;</button>
                    <button class="ai-quick-btn" id="aiQuickClear" title="Limpiar chat">&#128465;</button>
                </div>
                <button id="aiFloatBtn" class="ai-float-btn" type="button" aria-label="Asistente IA">IA</button>
                <div id="aiChatPanel" class="ai-chat-panel hidden">
                    <div class="ai-chat-header">
                        <strong>✨ Asistente IA</strong>
                        <div class="ai-chat-header-actions">
                            <button id="aiChatFullscreen" type="button" class="ai-chat-icon-btn" aria-label="Pantalla completa" title="Ampliar a pantalla completa">&#x26F6;</button>
                            <button id="aiChatClose" type="button" class="ai-chat-icon-btn" aria-label="Cerrar">&#x2715;</button>
                        </div>
                    </div>
                    <div id="aiChatFeed" class="ai-chat-feed"></div>
                    <form id="aiChatForm" class="ai-chat-form">
                        <input id="aiChatInput" type="text" placeholder="Pregunta por ventas, clientes, inventario..." autocomplete="off" />
                        <button type="submit" class="ai-send-btn" aria-label="Enviar">&#10148;</button>
                    </form>
                </div>
                <div id="aiFullscreenOverlay" class="ai-fullscreen-overlay hidden">
                    <div class="ai-fullscreen-panel">
                        <div class="ai-chat-header">
                            <strong>✨ Asistente IA — Pantalla Completa</strong>
                            <div class="ai-chat-header-actions">
                                <button id="aiFullscreenClose" type="button" class="ai-chat-icon-btn" aria-label="Salir de pantalla completa">&#x2715;</button>
                            </div>
                        </div>
                        <div id="aiFullscreenFeed" class="ai-chat-feed"></div>
                        <form id="aiFullscreenForm" class="ai-chat-form">
                            <input id="aiFullscreenInput" type="text" placeholder="Escribe tu pregunta..." autocomplete="off" />
                            <button type="submit" class="ai-send-btn" aria-label="Enviar">&#10148;</button>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(root);

            root.querySelector('#aiFloatBtn')?.addEventListener('click', () => this.toggle());
            root.querySelector('#aiChatClose')?.addEventListener('click', () => this.close());
            root.querySelector('#aiChatFullscreen')?.addEventListener('click', () => router.navigate('admin-ia'));
            root.querySelector('#aiFullscreenClose')?.addEventListener('click', () => this.closeFullscreen());

            root.querySelector('#aiChatForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const input = root.querySelector('#aiChatInput');
                const question = (input?.value || '').trim();
                if (!question) return;
                input.value = '';
                await this.ask(question, false);
            });

            root.querySelector('#aiFullscreenForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const input = root.querySelector('#aiFullscreenInput');
                const question = (input?.value || '').trim();
                if (!question) return;
                input.value = '';
                await this.ask(question, true);
            });

            root.querySelector('#aiQuickMetrics')?.addEventListener('click', () => {
                this.show();
                const input = root.querySelector('#aiChatInput');
                if (input) {
                    input.value = '¿Cuánto ingresé este mes?';
                    input.focus();
                }
            });

            root.querySelector('#aiQuickClear')?.addEventListener('click', () => this.clearChat());
            root.querySelector('#aiQuickStudio')?.addEventListener('click', () => router.navigate('admin-ia'));

            this.mounted = true;
            this.seedWelcome(false);
        }
    }

    unmount() {
        const root = document.getElementById('aiChatWidgetRoot');
        if (root) root.remove();
        this.mounted = false;
        this.open = false;
        this.fullscreen = false;
    }

    toggle() {
        if (this.open) this.close();
        else this.show();
    }

    show() {
        const panel = document.getElementById('aiChatPanel');
        if (!panel) return;
        panel.classList.remove('hidden');
        this.open = true;
        document.getElementById('aiChatInput')?.focus();
    }

    close() {
        const panel = document.getElementById('aiChatPanel');
        if (!panel) return;
        panel.classList.add('hidden');
        this.open = false;
    }

    openFullscreen() {
        const overlay = document.getElementById('aiFullscreenOverlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        this.fullscreen = true;
        this.close();

        const feed = document.getElementById('aiChatFeed');
        const fsFeed = document.getElementById('aiFullscreenFeed');
        if (feed && fsFeed) fsFeed.innerHTML = feed.innerHTML;
        document.getElementById('aiFullscreenInput')?.focus();
    }

    closeFullscreen() {
        const overlay = document.getElementById('aiFullscreenOverlay');
        if (!overlay) return;
        overlay.classList.add('hidden');
        this.fullscreen = false;

        const feed = document.getElementById('aiChatFeed');
        const fsFeed = document.getElementById('aiFullscreenFeed');
        if (feed && fsFeed) feed.innerHTML = fsFeed.innerHTML;
    }

    clearChat() {
        const feed = document.getElementById('aiChatFeed');
        const fsFeed = document.getElementById('aiFullscreenFeed');
        if (feed) feed.innerHTML = '';
        if (fsFeed) fsFeed.innerHTML = '';
        this.seedWelcome(this.fullscreen);
    }

    appendMessage(role, html, isFullscreen = false) {
        const feed = document.getElementById(isFullscreen ? 'aiFullscreenFeed' : 'aiChatFeed');
        if (!feed) return;
        const item = document.createElement('div');
        item.className = `ai-chat-msg ${role}`;
        item.innerHTML = html;
        feed.appendChild(item);
        feed.scrollTop = feed.scrollHeight;
    }

    async seedWelcome(isFullscreen = false) {
        const feed = document.getElementById(isFullscreen ? 'aiFullscreenFeed' : 'aiChatFeed');
        if (!feed || feed.childElementCount > 0) return;

        this.appendMessage('bot', '<strong>IA:</strong> Hola, puedo ayudarte con métricas y consultas de tu negocio.', isFullscreen);
        try {
            const examples = await apiService.getAiExamples();
            const list = Array.isArray(examples?.examples) ? examples.examples.slice(0, 3) : [];
            if (list.length) {
                this.appendMessage('bot', `<div><strong>Ejemplos:</strong><ul>${list.map(x => `<li>${x}</li>`).join('')}</ul></div>`, isFullscreen);
            }
        } catch (_error) {
            // Silent fallback
        }
    }

    async ask(question, isFullscreen = false) {
        this.appendMessage('user', `<strong>Tú:</strong> ${question}`, isFullscreen);
        const thinkingId = `ai-thinking-${Date.now()}`;
        this.appendMessage('bot', `<span id="${thinkingId}" class="ai-thinking">&#129302; Pensando...</span>`, isFullscreen);

        try {
            const response = await apiService.aiChat(question);
            const answer = response?.answer || 'Sin respuesta';
            const table = response?.table || { columns: [], rows: [] };
            const tableHtml = table.columns?.length
                ? `<div class="ai-chat-table"><table><thead><tr>${table.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${table.rows.map(r => `<tr>${r.map(v => `<td>${v ?? '-'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
                : '';

            document.getElementById(thinkingId)?.closest('.ai-chat-msg')?.remove();
            this.appendMessage('bot', `<strong>IA:</strong> ${answer}${tableHtml}`, isFullscreen);
        } catch (error) {
            document.getElementById(thinkingId)?.closest('.ai-chat-msg')?.remove();
            this.appendMessage('bot', `<strong>IA:</strong> Error: ${error.message}`, isFullscreen);
        }
    }
}

export default new AiChatWidget();
