import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';

class AiChatWidget {
	constructor() {
		this.mounted = false;
		this.open = false;
	}

	mount() {
		if (!authService.isAuthenticated()) {
			this.unmount();
			return;
		}

		if (!this.mounted) {
			const root = document.createElement('div');
			root.id = 'aiChatWidgetRoot';
			root.innerHTML = `
				<button id="aiFloatBtn" class="ai-float-btn" type="button" aria-label="Asistente IA">IA</button>
				<div id="aiChatPanel" class="ai-chat-panel hidden">
					<div class="ai-chat-header">
						<strong>Asistente IA</strong>
						<button id="aiChatClose" type="button" class="ai-chat-close" aria-label="Cerrar">x</button>
					</div>
					<div id="aiChatFeed" class="ai-chat-feed"></div>
					<form id="aiChatForm" class="ai-chat-form">
						<input id="aiChatInput" type="text" placeholder="Pregunta por ventas, clientes, inventario..." autocomplete="off" />
						<button type="submit" class="btn btn-primary">Enviar</button>
					</form>
				</div>
			`;
			document.body.appendChild(root);

			root.querySelector('#aiFloatBtn')?.addEventListener('click', () => this.toggle());
			root.querySelector('#aiChatClose')?.addEventListener('click', () => this.close());
			root.querySelector('#aiChatForm')?.addEventListener('submit', async (e) => {
				e.preventDefault();
				const input = root.querySelector('#aiChatInput');
				const question = (input?.value || '').trim();
				if (!question) return;
				input.value = '';
				await this.ask(question);
			});

			this.mounted = true;
			this.seedWelcome();
		}
	}

	unmount() {
		const root = document.getElementById('aiChatWidgetRoot');
		if (root) root.remove();
		this.mounted = false;
		this.open = false;
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
	}

	close() {
		const panel = document.getElementById('aiChatPanel');
		if (!panel) return;
		panel.classList.add('hidden');
		this.open = false;
	}

	appendMessage(role, html) {
		const feed = document.getElementById('aiChatFeed');
		if (!feed) return;
		const item = document.createElement('div');
		item.className = `ai-chat-msg ${role}`;
		item.innerHTML = html;
		feed.appendChild(item);
		feed.scrollTop = feed.scrollHeight;
	}

	async seedWelcome() {
		const feed = document.getElementById('aiChatFeed');
		if (!feed || feed.childElementCount > 0) return;

		this.appendMessage('bot', '<strong>IA:</strong> Hola, puedo ayudarte con metricas y consultas de tu negocio.');
		try {
			const examples = await apiService.getAiExamples();
			const list = Array.isArray(examples?.examples) ? examples.examples.slice(0, 3) : [];
			if (list.length) {
				this.appendMessage(
					'bot',
					`<div><strong>Ejemplos:</strong><ul>${list.map(x => `<li>${x}</li>`).join('')}</ul></div>`
				);
			}
		} catch (_error) {
			// Silent fallback
		}
	}

	async ask(question) {
		this.appendMessage('user', `<strong>Tu:</strong> ${question}`);
		try {
			const response = await apiService.aiChat(question);
			const answer = response?.answer || 'Sin respuesta';
			const table = response?.table || { columns: [], rows: [] };
			const tableHtml = table.columns?.length
				? `<div class="ai-chat-table"><table><thead><tr>${table.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${table.rows.map(r => `<tr>${r.map(v => `<td>${v ?? '-'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
				: '';
			this.appendMessage('bot', `<strong>IA:</strong> ${answer}${tableHtml}`);
		} catch (error) {
			this.appendMessage('bot', `<strong>IA:</strong> Error: ${error.message}`);
		}
	}
}

export default new AiChatWidget();
