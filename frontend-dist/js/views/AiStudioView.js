/**
 * AI Studio View — MAX plan only
 * Full-screen AI interface focused on visual output: charts, KPI cards,
 * comparison tables. Every response auto-selects the best visual format.
 */

import apiService from '../services/api.service.js';
import authService from '../services/auth.service.js';

// ── Tiny chart renderer (no external deps) ───────────────────────────────────

function renderBarChart(labels, values, title = '') {
    if (!labels.length) return '';
    const max = Math.max(...values, 1);
    const bars = labels.map((lbl, i) => {
        const pct = Math.round((values[i] / max) * 100);
        return `
            <div class="ai-studio-bar-row">
                <span class="ai-studio-bar-label" title="${lbl}">${lbl}</span>
                <div class="ai-studio-bar-track">
                    <div class="ai-studio-bar-fill" style="width:${pct}%"></div>
                </div>
                <span class="ai-studio-bar-val">${values[i]}</span>
            </div>`;
    }).join('');
    return `<div class="ai-studio-chart"><p class="ai-studio-chart-title">${title}</p>${bars}</div>`;
}

function renderKpiCards(items) {
    // items: [{label, value, delta?, color?}]
    return `<div class="ai-studio-kpi-grid">${items.map(k => `
        <div class="ai-studio-kpi-card${k.color ? ' accent-' + k.color : ''}">
            <span class="ai-studio-kpi-label">${k.label}</span>
            <span class="ai-studio-kpi-value">${k.value}</span>
            ${k.delta !== undefined ? `<span class="ai-studio-kpi-delta">${k.delta >= 0 ? '▲' : '▼'} ${Math.abs(k.delta)}%</span>` : ''}
        </div>`).join('')}</div>`;
}

function renderDataTable(columns, rows) {
    if (!columns.length) return '';
    return `<div class="ai-chat-table ai-studio-table">
        <table>
            <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v ?? '-'}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
    </div>`;
}

/**
 * Infer best visual from response shape.
 * Returns: 'bar_chart' | 'kpi_cards' | 'table' | 'text'
 */
function inferVisual(response) {
    const table = response?.table;
    const dataPoints = response?.data_points;

    if (Array.isArray(dataPoints) && dataPoints.length) return 'bar_chart';
    if (table?.columns?.length) {
        const numericCols = table.columns.filter((_, ci) => table.rows.some(r => !isNaN(parseFloat(r[ci]))));
        if (numericCols.length >= 1 && table.rows.length <= 15) return 'bar_chart';
        return 'table';
    }
    // Try to detect KPI-style text (key: value pairs)
    const answer = response?.answer || '';
    const kpiMatches = [...answer.matchAll(/([^\n:]+):\s*([\d,.$%]+)/g)];
    if (kpiMatches.length >= 2) return 'kpi_cards';
    return 'text';
}

function buildVisual(response) {
    const visualType = inferVisual(response);
    const answer = response?.answer || '';
    const answerHtml = String(answer).replace(/\n/g, '<br>');
    const table = response?.table || { columns: [], rows: [] };
    const dataPoints = response?.data_points || [];

    switch (visualType) {
        case 'bar_chart': {
            if (dataPoints.length) {
                return renderBarChart(
                    dataPoints.map(d => d.label),
                    dataPoints.map(d => parseFloat(d.value) || 0),
                    answer
                );
            }
            // Use first non-numeric col as label, first numeric as value
            const labelCol = table.columns.findIndex((_, ci) => !table.rows.every(r => !isNaN(parseFloat(r[ci]))));
            const valCol = table.columns.findIndex((_, ci) => ci !== labelCol && table.rows.some(r => !isNaN(parseFloat(r[ci]))));
            const lc = labelCol >= 0 ? labelCol : 0;
            const vc = valCol >= 0 ? valCol : 1;
            return (
                (answer ? `<p class="ai-studio-answer-text">${answerHtml}</p>` : '') +
                renderBarChart(
                    table.rows.map(r => String(r[lc] ?? '')),
                    table.rows.map(r => parseFloat(r[vc]) || 0),
                    table.columns[vc] || ''
                )
            );
        }
        case 'kpi_cards': {
            const kpis = [...answer.matchAll(/([^\n:]+):\s*([\d,.$%]+[^\n]*)/g)].map(m => ({
                label: m[1].trim(),
                value: m[2].trim(),
            }));
            return renderKpiCards(kpis) + (table.columns.length ? renderDataTable(table.columns, table.rows) : '');
        }
        case 'table':
            return (answer ? `<p class="ai-studio-answer-text">${answerHtml}</p>` : '') +
                renderDataTable(table.columns, table.rows);
        default:
            return `<p class="ai-studio-answer-text">${answerHtml}</p>` +
                (table.columns.length ? renderDataTable(table.columns, table.rows) : '');
    }
}

// ── Quick prompt suggestions ──────────────────────────────────────────────────

const QUICK_PROMPTS = [
    { icon: '💰', text: '¿Cuánto ingresé este mes?' },
    { icon: '📊', text: '¿Cuáles son los servicios más solicitados?' },
    { icon: '📅', text: 'Agenda cita para Ana Perez mañana a las 3 pm' },
    { icon: '🧾', text: 'Registra gasto de papeleria por 25000' },
    { icon: '🧭', text: 'Dame ideas para mejorar mis ingresos este mes' },
];

// ── View Class ────────────────────────────────────────────────────────────────

class AiStudioView {
    constructor() {
        this._messages = [];
        this._loading = false;
    }

    render() {
        return `
            <div class="ai-studio-layout">
                <main class="ai-studio-main">
                    <div class="ai-studio-header">
                        <h2>Admin IA</h2>
                        <p class="ai-studio-subtitle">Consulta métricas o registra clientes, citas, pagos y gastos.</p>
                    </div>

                    <div class="ai-studio-quick-list ai-studio-quick-list-inline">
                        ${QUICK_PROMPTS.map((p, i) => `
                            <button class="ai-studio-quick-prompt" data-prompt="${p.text}" data-idx="${i}">
                                <span>${p.icon}</span>
                                <span>${p.text}</span>
                            </button>`).join('')}
                    </div>

                    <div id="aiStudioFeed" class="ai-studio-feed">
                        <!-- messages render here -->
                    </div>

                    <form id="aiStudioForm" class="ai-studio-form">
                        <input id="aiStudioInput" type="text"
                            placeholder="Ej: agenda cita para Ana Perez mañana a las 3 pm, registra pago por 50000 en efectivo, o pregunta por ingresos"
                            autocomplete="off" />
                        <button type="submit" class="ai-studio-send-btn">
                            &#10148; Generar
                        </button>
                    </form>
                </main>
            </div>
        `;
    }

    async init() {
        this._attachEvents();
        this._seedWelcome();
    }

    _attachEvents() {
        const form = document.getElementById('aiStudioForm');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('aiStudioInput');
            const question = (input?.value || '').trim();
            if (!question || this._loading) return;
            input.value = '';
            await this._ask(question);
        });

        document.querySelectorAll('.ai-studio-quick-prompt').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                const input = document.getElementById('aiStudioInput');
                if (input) { input.value = prompt; input.focus(); }
            });
        });
    }

    _seedWelcome() {
        this._appendVisualMessage('bot', `
            <div class="ai-studio-welcome">
                <p>Pregunta directo. Si no hay datos para calcular, te propongo una ruta de acción clara.</p>
            </div>
        `);
    }

    _appendVisualMessage(role, contentHtml) {
        const feed = document.getElementById('aiStudioFeed');
        if (!feed) return;
        const wrapper = document.createElement('div');
        wrapper.className = `ai-studio-msg ${role}`;
        wrapper.innerHTML = contentHtml;
        feed.appendChild(wrapper);
        feed.scrollTop = feed.scrollHeight;
    }

    async _ask(question) {
        this._loading = true;
        const btn = document.querySelector('.ai-studio-send-btn');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Generando...'; }

        this._appendVisualMessage('user', `<p class="ai-studio-question">&#128100; ${question}</p>`);

        const thinkId = `studio-think-${Date.now()}`;
        this._appendVisualMessage('bot', `<p id="${thinkId}" class="ai-thinking">Analizando...</p>`);

        try {
            const response = await apiService.aiChat(question);
            document.getElementById(thinkId)?.closest('.ai-studio-msg')?.remove();
            const visualHtml = buildVisual(response);
            this._appendVisualMessage('bot', `<div class="ai-studio-response">${visualHtml}</div>`);
        } catch (err) {
            document.getElementById(thinkId)?.closest('.ai-studio-msg')?.remove();
            this._appendVisualMessage('bot', `<p style="color:#ef4444;">Error al consultar la IA: ${err.message}</p>`);
        } finally {
            this._loading = false;
            if (btn) { btn.disabled = false; btn.innerHTML = '&#10148; Generar'; }
        }
    }
}

export default new AiStudioView();
