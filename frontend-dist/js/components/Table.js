/**
 * Table Component
 * Responsabilidad: Renderizar tablas con datos
 * Principio SOLID: Single Responsibility, Open/Closed
 */

export class Table {
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
            emptyIcon = '📋'
        } = options;

        if (!data || data.length === 0) {
            return this.renderEmptyState(emptyMessage, emptyIcon);
        }

        return `
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
                        <tr>
                            ${columns.map(col => `
                                <td>${this.renderCell(row, col)}</td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
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
