/**
 * Table Component
 * Responsabilidad: Renderizar tablas con datos
 * Principio SOLID: Single Responsibility, Open/Closed
 */

export class Table {
    constructor() {
        if (typeof document !== 'undefined' && !document.__adminGTableSearchBound) {
            document.addEventListener('input', (event) => {
                const input = event.target.closest('[data-table-search]');
                if (!input) return;

                const tableId = input.dataset.tableSearch;
                const query = input.value.trim().toLowerCase();
                const rows = document.querySelectorAll(`[data-table-row="${tableId}"]`);
                let visibleCount = 0;

                rows.forEach((row) => {
                    const haystack = (row.dataset.search || '').toLowerCase();
                    const visible = !query || haystack.includes(query);
                    row.style.display = visible ? '' : 'none';
                    if (visible) visibleCount += 1;
                });

                const counter = document.querySelector(`[data-table-count="${tableId}"]`);
                if (counter) {
                    counter.textContent = `${visibleCount} resultado${visibleCount === 1 ? '' : 's'}`;
                }
            });
            document.__adminGTableSearchBound = true;
        }
    }

    /**
     * Renderizar una tabla
     * @param {object} options 
     * @returns {string} HTML de la tabla
     */
    render(options = {}) {
        const {
            columns = [],
            data = [],
            emptyMessage = 'No hay datos para mostrar',
            emptyIcon = '📋',
            searchableThreshold = 10,
        } = options;

        if (!data || data.length === 0) {
            return this.renderEmptyState(emptyMessage, emptyIcon);
        }

        const tableId = `tbl-${Math.random().toString(36).slice(2, 10)}`;
        const isSearchable = data.length > searchableThreshold;

        return `
            <div class="table-shell">
                ${isSearchable ? `
                    <div class="table-toolbar">
                        <input class="table-search" type="search" placeholder="Buscar en la tabla..." data-table-search="${tableId}">
                        <span class="table-count" data-table-count="${tableId}">${data.length} resultados</span>
                    </div>
                ` : ''}
                <div class="table-scroll">
                    <table class="data-table">
                        <thead>
                            <tr>
                                ${columns.map(col => `
                                    <th>${col.label}</th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(row => `
                                <tr data-table-row="${tableId}" data-search="${this.buildSearchText(row, columns)}">
                                    ${columns.map(col => `
                                        <td>${this.renderCell(row, col)}</td>
                                    `).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    buildSearchText(row, columns) {
        return columns.map((column) => {
            const value = this.getCellValue(row, column.key);
            return value == null ? '' : String(value);
        }).join(' ');
    }

    /**
     * Renderizar una celda
     * @param {object} row 
     * @param {object} column 
     * @returns {string}
     */
    renderCell(row, column) {
        const value = this.getCellValue(row, column.key);

        // Si hay un formatter personalizado
        if (column.formatter) {
            return column.formatter(value, row);
        }

        // Si hay un tipo específico
        if (column.type === 'badge') {
            return `<span class="badge badge-${column.badgeClass || 'primary'}">${value}</span>`;
        }

        if (column.type === 'currency') {
            return `$${parseFloat(value || 0).toFixed(2)}`;
        }

        if (column.type === 'date') {
            return new Date(value).toLocaleDateString();
        }

        if (column.type === 'datetime') {
            return new Date(value).toLocaleString();
        }

        return value || '-';
    }

    /**
     * Obtener valor de una celda (soporta dot notation)
     * @param {object} row 
     * @param {string} key 
     * @returns {any}
     */
    getCellValue(row, key) {
        return key.split('.').reduce((obj, k) => obj?.[k], row);
    }

    /**
     * Renderizar estado vacío
     * @param {string} message 
     * @param {string} icon 
     * @returns {string}
     */
    renderEmptyState(message, icon) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <p>${message}</p>
            </div>
        `;
    }
}

export default new Table();
