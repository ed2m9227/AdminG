/**
 * Modal Component
 * Responsabilidad: Renderizar y gestionar modales
 * Principio SOLID: Single Responsibility, Open/Closed
 */

export class Modal {
    /**
     * Mostrar un modal
     * @param {object} options 
     * @returns {HTMLElement}
     */
    show(options = {}) {
        const {
            title = 'Modal',
            content = '',
            onClose = null,
            size = 'medium' // small, medium, large
        } = options;

        // Crear el modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content modal-${size}">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="close-btn" data-close>&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        // Event listeners
        modal.addEventListener('click', (e) => {
            // Cerrar si se hace click fuera del modal o en el botón de cerrar
            if (e.target.classList.contains('modal') || 
                e.target.closest('[data-close]')) {
                this.close(modal, onClose);
            }
        });

        // Agregar al DOM
        document.body.appendChild(modal);

        return modal;
    }

    /**
     * Cerrar un modal
     * @param {HTMLElement} modal 
     * @param {Function|null} callback 
     */
    close(modal, callback = null) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
            if (callback) callback();
        }
    }

    /**
     * Mostrar modal de confirmación
     * @param {object} options 
     * @returns {Promise<boolean>}
     */
    confirm(options = {}) {
        const {
            title = 'Confirmar',
            message = '¿Estás seguro?',
            confirmText = 'Confirmar',
            cancelText = 'Cancelar'
        } = options;

        return new Promise((resolve) => {
            const content = `
                <p style="margin-bottom: 20px;">${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-primary" data-confirm>${confirmText}</button>
                    <button class="btn" data-cancel>${cancelText}</button>
                </div>
            `;

            const modal = this.show({ title, content, size: 'small' });

            modal.addEventListener('click', (e) => {
                if (e.target.closest('[data-confirm]')) {
                    this.close(modal);
                    resolve(true);
                } else if (e.target.closest('[data-cancel]')) {
                    this.close(modal);
                    resolve(false);
                }
            });
        });
    }

    /**
     * Mostrar modal de alerta
     * @param {object} options 
     * @returns {Promise<void>}
     */
    alert(options = {}) {
        const {
            title = 'Aviso',
            message = '',
            type = 'info' // info, success, error, warning
        } = options;

        return new Promise((resolve) => {
            const icons = {
                info: 'ℹ️',
                success: '✅',
                error: '❌',
                warning: '⚠️'
            };

            const content = `
                <div class="alert alert-${type}">
                    <span class="alert-icon">${icons[type]}</span>
                    <p>${message}</p>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" data-close>Aceptar</button>
                </div>
            `;

            const modal = this.show({ title, content, size: 'small' });

            modal.addEventListener('click', (e) => {
                if (e.target.closest('[data-close]')) {
                    this.close(modal);
                    resolve();
                }
            });
        });
    }
}

export default new Modal();
