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
        // Fuerza estilos inline para compatibilidad con Simple Browser
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.6) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            padding: 20px;
        `;
        modal.innerHTML = `
            <div class="modal-content modal-${size}" style="background: white !important; position: relative !important; z-index: 1000000 !important;">
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

        // Agregar al DOM - Forzar append inmediato
        console.log('📢 Modal: Agregando modal al DOM...', modal);
        document.body.appendChild(modal);
        
        // Verificar que se agregó
        setTimeout(() => {
            const modalInDom = document.querySelector('.modal');
            console.log('📢 Modal: ¿Modal en DOM?', !!modalInDom, modalInDom);
        }, 50);

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
     * Mostrar modal de input (prompt)
     * @param {object} options 
     * @returns {Promise<string|null>}
     */
    prompt(options = {}) {
        const {
            title = 'Ingrese un valor',
            message = '',
            placeholder = '',
            defaultValue = '',
            inputType = 'text',
            confirmText = 'Aceptar',
            cancelText = 'Cancelar'
        } = options;

        return new Promise((resolve) => {
            const inputId = 'prompt-input-' + Date.now();
            const content = `
                ${message ? `<p style="margin-bottom: 15px;">${message}</p>` : ''}
                <input 
                    type="${inputType}" 
                    id="${inputId}"
                    class="form-control" 
                    placeholder="${placeholder}"
                    value="${defaultValue}"
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; margin-bottom: 15px;"
                />
                <div class="modal-actions">
                    <button class="btn btn-primary" data-confirm>${confirmText}</button>
                    <button class="btn" data-cancel>${cancelText}</button>
                </div>
            `;

            const modal = this.show({ title, content, size: 'small' });

            // Auto-focus en el input
            setTimeout(() => {
                const input = document.getElementById(inputId);
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 100);

            modal.addEventListener('click', (e) => {
                if (e.target.closest('[data-confirm]')) {
                    const input = document.getElementById(inputId);
                    const value = input ? input.value : null;
                    this.close(modal);
                    resolve(value);
                } else if (e.target.closest('[data-cancel]')) {
                    this.close(modal);
                    resolve(null);
                }
            });

            // Permitir Enter para confirmar
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = document.getElementById(inputId);
                    const value = input ? input.value : null;
                    this.close(modal);
                    resolve(value);
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
