// Sistema de gestión para cocina
class CocinaSystem {
    constructor() {
        this.pedidosPendientes = [];
        this.init();
    }

    init() {
        // Verificar autenticación
        if (!auth.hasRole('cocina')) {
            window.location.href = 'login.html';
            return;
        }

        this.setupEventListeners();
        this.loadPedidosPendientes();
        this.setupWebSocket();
        this.updateUserInfo();
        
        // Verificar si hay notificaciones de audio soportadas
        this.setupAudio();
    }

    setupEventListeners() {
        // Configurar botón de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => auth.logout());
        }
    }

    loadPedidosPendientes() {
        // Cargar pedidos pendientes desde localStorage
        const pedidos = JSON.parse(localStorage.getItem('pedidos_pendientes') || '[]');
        this.pedidosPendientes = pedidos;
        this.renderPedidos();
    }

    renderPedidos() {
        const container = document.getElementById('pedidosContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (this.pedidosPendientes.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        container.innerHTML = '';
        
        // Ordenar por hora (FIFO)
        this.pedidosPendientes.sort((a, b) => a.id - b.id);
        
        this.pedidosPendientes.forEach((pedido, index) => {
            const card = this.createPedidoCard(pedido, index);
            container.appendChild(card);
        });
    }

    createPedidoCard(pedido, index) {
        const card = document.createElement('div');
        card.className = 'pedido-card';
        card.dataset.id = pedido.id;
        
        // Calcular total
        const total = pedido.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        
        card.innerHTML = `
            <div class="pedido-header">
                <div class="mesa-info">
                    <div class="mesa-numero">${pedido.mesa}</div>
                    <div class="mesa-text">
                        <h3>Mesa ${pedido.mesa}</h3>
                        <span class="hora">${pedido.hora}</span>
                    </div>
                </div>
                <span class="estado-badge">🕓 Pendiente</span>
            </div>
            
            <div class="pedido-productos">
                ${pedido.items.map(item => `
                    <div class="producto-item">
                        <div style="display: flex; align-items: center;">
                            <span class="producto-cantidad">${item.cantidad}x</span>
                            <span class="producto-nombre">${item.nombre}</span>
                        </div>
                        <span class="producto-precio">$${(item.precio * item.cantidad).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            
            ${pedido.observaciones ? `
                <div class="pedido-observaciones">
                    <strong>📝 Observaciones:</strong> ${pedido.observaciones}
                </div>
            ` : ''}
            
            <div class="pedido-total" style="margin-bottom: 15px; text-align: right; font-weight: bold;">
                Total: $${total.toFixed(2)}
            </div>
            
            <div class="pedido-acciones">
                <button class="btn-terminado" data-index="${index}">
                    ✅ Terminado
                </button>
                <button class="btn-cancelado" data-index="${index}">
                    ❌ Cancelar
                </button>
            </div>
        `;
        
        // Agregar event listeners a los botones
        card.querySelector('.btn-terminado').addEventListener('click', () => {
            this.marcarTerminado(index);
        });
        
        card.querySelector('.btn-cancelado').addEventListener('click', () => {
            this.cancelarPedido(index);
        });
        
        return card;
    }

    async marcarTerminado(index) {
        const pedido = this.pedidosPendientes[index];
        
        try {
            // Guardar en base de datos (Google Sheets)
            const guardado = await database.guardarPedidoTerminado(pedido);
            
            if (guardado) {
                // Eliminar del array local
                this.pedidosPendientes.splice(index, 1);
                
                // Actualizar localStorage
                localStorage.setItem('pedidos_pendientes', JSON.stringify(this.pedidosPendientes));
                
                // Actualizar vista
                this.renderPedidos();
                
                // Mostrar notificación
                this.showNotification(`Pedido mesa ${pedido.mesa} marcado como terminado`, 'success');
                
                // Reproducir sonido de confirmación
                this.playSound('success');
            } else {
                throw new Error('Error al guardar en base de datos');
            }
        } catch (error) {
            console.error('Error al marcar como terminado:', error);
            this.showNotification('Error al guardar el pedido', 'error');
        }
    }

    cancelarPedido(index) {
        const pedido = this.pedidosPendientes[index];
        
        if (confirm(`¿Cancelar pedido de la mesa ${pedido.mesa}?`)) {
            // Eliminar del array local
            this.pedidosPendientes.splice(index, 1);
            
            // Actualizar localStorage
            localStorage.setItem('pedidos_pendientes', JSON.stringify(this.pedidosPendientes));
            
            // Actualizar vista
            this.renderPedidos();
            
            // Mostrar notificación
            this.showNotification(`Pedido mesa ${pedido.mesa} cancelado`, 'warning');
            
            // Reproducir sonido
            this.playSound('cancel');
        }
    }

    agregarNuevoPedido(pedido) {
        // Agregar al array
        this.pedidosPendientes.push(pedido);
        
        // Actualizar localStorage
        localStorage.setItem('pedidos_pendientes', JSON.stringify(this.pedidosPendientes));
        
        // Actualizar vista
        this.renderPedidos();
        
        // Mostrar notificación
        this.showNotification(`Nuevo pedido: Mesa ${pedido.mesa}`, 'info');
        
        // Reproducir sonido
        this.playSound('new-order');
        
        // Destacar la nueva tarjeta
        this.highlightNewOrder(pedido.id);
    }

    highlightNewOrder(pedidoId) {
        const card = document.querySelector(`.pedido-card[data-id="${pedidoId}"]`);
        if (card) {
            card.classList.add('nuevo');
            setTimeout(() => {
                card.classList.remove('nuevo');
            }, 2000);
        }
    }

    setupWebSocket() {
        // Simulación de WebSocket para demostración
        // En producción, usaría un servidor WebSocket real
        
        // Escuchar cambios en localStorage (simulación de comunicación entre pestañas)
        window.addEventListener('storage', (event) => {
            if (event.key === 'pedidos_pendientes') {
                this.loadPedidosPendientes();
            }
        });
        
        // También podemos usar setInterval para simular actualizaciones
        setInterval(() => {
            this.checkForNewOrders();
        }, 3000);
    }

    checkForNewOrders() {
        // En una implementación real, esto consultaría a un servidor
        // Por ahora, solo recargamos desde localStorage
        const pedidos = JSON.parse(localStorage.getItem('pedidos_pendientes') || '[]');
        
        // Verificar si hay nuevos pedidos
        if (pedidos.length > this.pedidosPendientes.length) {
            // Encontrar los nuevos pedidos
            const newPedidos = pedidos.filter(p => 
                !this.pedidosPendientes.some(existing => existing.id === p.id)
            );
            
            // Agregar cada nuevo pedido
            newPedidos.forEach(pedido => {
                this.agregarNuevoPedido(pedido);
            });
        }
    }

    setupAudio() {
        // Crear elementos de audio para notificaciones
        this.audioContext = null;
        
        // Intentar crear un contexto de audio
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Audio no soportado en este navegador');
        }
    }

    playSound(type) {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Configurar según el tipo de sonido
            switch(type) {
                case 'new-order':
                    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                    break;
                case 'success':
                    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.1);
                    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.2);
                    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                    break;
                case 'cancel':
                    oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                    break;
            }
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
            
            // Reducir ganancia para suavizar
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('Error reproduciendo sonido:', error);
        }
    }

    showNotification(message, type = 'info') {
        const area = document.getElementById('notificationsArea');
        if (!area) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Icono según tipo
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: '📋'
        };
        
        notification.innerHTML = `
            <span class="notification-icon">${icons[type] || icons.info}</span>
            <span class="notification-message">${message}</span>
        `;
        
        area.appendChild(notification);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }

    updateUserInfo() {
        const user = auth.getUser();
        if (user) {
            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                userInfo.innerHTML = `
                    <span>👤 ${user.name}</span>
                `;
            }
        }
    }
}

// Inicializar sistema de cocina cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const cocinaSystem = new CocinaSystem();
    
    // Hacer disponible globalmente para debugging
    window.cocinaSystem = cocinaSystem;
});