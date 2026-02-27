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
        modal.style.zIndex = '9999'; // Fuerza explícitamente el z-index
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
            if (e.target === modal || e.target.closest('[data-close]')) {
                this.close(modal, onClose);
            }
        });

        // Agregar al DOM - Usar setTimeout para asegurar que se renderice
        // Esto ayuda con el Simple Browser de VS Code
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(modal);
            });
        } else {
            document.body.appendChild(modal);
        }

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

    /**
     * Mostrar modal de confirmación con contenido HTML personalizado
     * @param {object} options 
     */
    showConfirm(options = {}) {
        const {
            title = 'Confirmar',
            content = '',
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            onConfirm = null,
            onCancel = null,
            size = 'medium'
        } = options;

        const footerContent = `
            <div class="modal-actions">
                <button class="btn btn-primary" data-confirm>${confirmText}</button>
                <button class="btn" data-cancel>${cancelText}</button>
            </div>
        `;

        const modal = this.show({ 
            title, 
            content: typeof content === 'string' ? content + footerContent : content + footerContent, 
            size 
        });

        modal.addEventListener('click', (e) => {
            if (e.target.closest('[data-confirm]')) {
                this.close(modal);
                if (onConfirm) onConfirm();
            } else if (e.target.closest('[data-cancel]')) {
                this.close(modal);
                if (onCancel) onCancel();
            }
        });
    }

    /**
     * Métodos helper para mostrar mensajes rápido
     */
    showSuccess(message) {
        return this.alert({
            title: 'Éxito',
            message,
            type: 'success'
        });
    }

    showError(message) {
        return this.alert({
            title: 'Error',
            message,
            type: 'error'
        });
    }

    showWarning(message) {
        return this.alert({
            title: 'Advertencia',
            message,
            type: 'warning'
        });
    }

    showInfo(message) {
        return this.alert({
            title: 'Información',
            message,
            type: 'info'
        });
    }

    showLoading(message = 'Cargando...') {
        const modal = document.createElement('div');
        modal.className = 'modal loading-modal';
        modal.innerHTML = `
            <div class="modal-content modal-small">
                <div class="modal-body" style="text-align: center; padding: 40px;">
                    <div class="spinner" style="margin-bottom: 15px;"></div>
                    <p>${message}</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    closeModal(modal) {
        if (!modal) {
            // Cerrar todos los modales
            document.querySelectorAll('.modal').forEach(m => {
                if (m.parentNode) m.parentNode.removeChild(m);
            });
        } else {
            this.close(modal);
        }
    }
}

export default new Modal();
