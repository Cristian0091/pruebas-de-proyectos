// Sistema de gestión de pedidos - Versión Corregida
class PedidosSystem {
    constructor() {
        this.mesaActual = null;
        this.pedidoActual = [];
        this.categoriaActual = 'comidas-rapidas';
        this.socket = null;
        this.productos = {};
        this.init();
    }

    init() {
        // Verificar autenticación
        if (!auth.hasRole('pedidos')) {
            window.location.href = 'login.html';
            return;
        }

        // Inicializar en el orden correcto
        this.loadProductos();          // 1. Cargar productos primero
        this.renderMesas();            // 2. Renderizar mesas
        this.setupEventListeners();    // 3. Configurar eventos
        this.habilitarProductos(false); // 4. Deshabilitar productos inicialmente
        this.setupWebSocket();         // 5. Configurar WebSocket
        this.updateUserInfo();         // 6. Actualizar info usuario
        this.updateEnviarButton();     // 7. Actualizar botón enviar
    }

    // NUEVO MÉTODO: Renderizar las mesas
    renderMesas() {
        const mesaGrid = document.getElementById('mesaGrid');
        if (!mesaGrid) {
            console.error('No se encontró el elemento #mesaGrid');
            return;
        }
        
        mesaGrid.innerHTML = '';
        
        // Crear botones para mesas 1-20
        for (let i = 1; i <= 20; i++) {
            const mesaBtn = document.createElement('button');
            mesaBtn.className = 'mesa-btn';
            mesaBtn.dataset.mesa = i;
            mesaBtn.textContent = i;
            mesaBtn.addEventListener('click', () => this.seleccionarMesa(i));
            mesaGrid.appendChild(mesaBtn);
        }
        
        console.log('Mesas renderizadas:', mesaGrid.children.length);
    }

    setupEventListeners() {
        // NOTA: Los eventos de mesa ya se configuran en renderMesas()
        
        // Botones de categoría
        document.querySelectorAll('.categoria-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.cambiarCategoria(e.target.dataset.categoria || 
                                     e.target.closest('.categoria-btn').dataset.categoria);
            });
        });

        // Botón de enviar pedido
        const enviarBtn = document.getElementById('enviarPedido');
        if (enviarBtn) {
            enviarBtn.addEventListener('click', () => this.enviarPedido());
        }

        // Input de observaciones
        const obsInput = document.getElementById('observaciones');
        if (obsInput) {
            obsInput.addEventListener('input', () => this.updateEnviarButton());
        }
    }

    loadProductos() {
        // Productos de ejemplo
        this.productos = {
            'comidas-rapidas': [
                { id: 1, nombre: 'Hamburguesa Clásica', precio: 8.99, icono: '🍔' },
                { id: 2, nombre: 'Papas Fritas', precio: 3.99, icono: '🍟' },
                { id: 3, nombre: 'Hot Dog', precio: 4.99, icono: '🌭' },
                { id: 4, nombre: 'Nuggets de Pollo', precio: 5.99, icono: '🍗' },
                { id: 5, nombre: 'Pizza Personal', precio: 6.99, icono: '🍕' }
            ],
            'especiales': [
                { id: 6, nombre: 'Lomo Saltado', precio: 12.99, icono: '🥩' },
                { id: 7, nombre: 'Ceviche Mixto', precio: 14.99, icono: '🐟' },
                { id: 8, nombre: 'Pasta Alfredo', precio: 10.99, icono: '🍝' },
                { id: 9, nombre: 'Ensalada César', precio: 8.99, icono: '🥗' }
            ],
            'bebidas': [
                { id: 10, nombre: 'Gaseosa 500ml', precio: 2.99, icono: '🥤' },
                { id: 11, nombre: 'Jugo Natural', precio: 3.99, icono: '🧃' },
                { id: 12, nombre: 'Agua Mineral', precio: 1.99, icono: '💧' },
                { id: 13, nombre: 'Cerveza Artesanal', precio: 4.99, icono: '🍺' }
            ],
            'heladeria': [
                { id: 14, nombre: 'Helado de Vainilla', precio: 3.99, icono: '🍦' },
                { id: 15, nombre: 'Sundae de Chocolate', precio: 4.99, icono: '🍫' },
                { id: 16, nombre: 'Malteada', precio: 4.49, icono: '🥤' }
            ]
        };
        
        this.renderProductos();
    }

    renderProductos() {
        const grid = document.getElementById('productosGrid');
        if (!grid) {
            console.error('No se encontró el elemento #productosGrid');
            return;
        }
        
        grid.innerHTML = '';
        
        const productosCategoria = this.productos[this.categoriaActual] || [];
        
        productosCategoria.forEach(producto => {
            const card = document.createElement('div');
            card.className = 'producto-card';
            card.dataset.productoId = producto.id;
            card.innerHTML = `
                <div class="producto-img">${producto.icono}</div>
                <div class="producto-info">
                    <div class="producto-nombre">${producto.nombre}</div>
                    <div class="producto-precio">$${producto.precio.toFixed(2)}</div>
                </div>
            `;
            
            card.addEventListener('click', () => this.agregarProducto(producto));
            grid.appendChild(card);
        });
        
        // Aplicar estado inicial de habilitación
        this.habilitarProductos(this.mesaActual !== null);
    }

    seleccionarMesa(mesa) {
        console.log('Mesa seleccionada:', mesa);
        
        this.mesaActual = parseInt(mesa);
        
        // Actualizar UI de mesas
        document.querySelectorAll('.mesa-btn').forEach(btn => {
            const mesaBtn = parseInt(btn.dataset.mesa);
            btn.classList.toggle('active', mesaBtn === this.mesaActual);
        });
        
        // Actualizar input numérico
        const mesaInput = document.getElementById('mesaNumber');
        if (mesaInput) {
            mesaInput.value = this.mesaActual;
        }
        
        // Habilitar productos
        this.habilitarProductos(true);
        
        this.updateEnviarButton();
        this.updateUserInfo();
        this.showNotification(`✅ Mesa ${mesa} seleccionada`);
    }

    // NUEVO MÉTODO: Habilitar/deshabilitar productos
    habilitarProductos(habilitado) {
        const productos = document.querySelectorAll('.producto-card');
        productos.forEach(producto => {
            if (habilitado) {
                producto.style.opacity = '1';
                producto.style.pointerEvents = 'auto';
                producto.style.cursor = 'pointer';
                producto.title = 'Haz clic para agregar al pedido';
            } else {
                producto.style.opacity = '0.5';
                producto.style.pointerEvents = 'none';
                producto.style.cursor = 'not-allowed';
                producto.title = 'Selecciona una mesa primero';
            }
        });
    }

    cambiarCategoria(categoria) {
        this.categoriaActual = categoria;
        
        // Actualizar UI de categorías
        document.querySelectorAll('.categoria-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.categoria === categoria);
        });
        
        this.renderProductos();
    }

    agregarProducto(producto) {
        // VERIFICACIÓN CRÍTICA: Validar que haya mesa seleccionada
        if (!this.mesaActual) {
            this.showNotification('⚠️ Primero selecciona una mesa', 'warning');
            
            // Resaltar visualmente la sección de mesas
            const mesaSelector = document.querySelector('.mesa-selector');
            if (mesaSelector) {
                mesaSelector.style.animation = 'shake 0.5s ease';
                setTimeout(() => {
                    mesaSelector.style.animation = '';
                }, 500);
            }
            
            return;
        }

        console.log('Agregando producto:', producto.nombre, 'a mesa', this.mesaActual);

        // Buscar si el producto ya está en el pedido
        const existingItemIndex = this.pedidoActual.findIndex(item => item.id === producto.id);
        
        if (existingItemIndex !== -1) {
            // Incrementar cantidad si ya existe
            this.pedidoActual[existingItemIndex].cantidad++;
            this.showNotification(`➕ ${producto.nombre} (cantidad aumentada)`);
        } else {
            // Agregar nuevo producto
            this.pedidoActual.push({
                ...producto,
                cantidad: 1,
                observaciones: ''
            });
            this.showNotification(`✅ ${producto.nombre} agregado`);
        }
        
        this.renderPedidoActual();
        this.updateEnviarButton();
        
        // Efecto visual de confirmación
        this.efectoConfirmacionProducto(producto.id);
    }

    // NUEVO MÉTODO: Efecto visual al agregar producto
    efectoConfirmacionProducto(productoId) {
        const productoCard = document.querySelector(`.producto-card[data-producto-id="${productoId}"]`);
        if (productoCard) {
            // Agregar efecto temporal
            productoCard.style.transform = 'scale(0.95)';
            productoCard.style.boxShadow = '0 0 15px rgba(39, 174, 96, 0.7)';
            
            setTimeout(() => {
                productoCard.style.transform = '';
                productoCard.style.boxShadow = '';
            }, 300);
        }
    }

    eliminarProducto(index) {
        const productoEliminado = this.pedidoActual[index];
        this.pedidoActual.splice(index, 1);
        this.renderPedidoActual();
        this.updateEnviarButton();
        this.showNotification(`🗑️ ${productoEliminado.nombre} eliminado`, 'warning');
    }

    renderPedidoActual() {
        const container = document.getElementById('pedidoItems');
        const totalElement = document.getElementById('pedidoTotal');
        
        if (!container || !totalElement) {
            console.error('Elementos del pedido no encontrados');
            return;
        }
        
        container.innerHTML = '';
        
        let total = 0;
        
        this.pedidoActual.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'pedido-item';
            itemElement.innerHTML = `
                <span class="item-cantidad">${item.cantidad}x</span>
                <span class="item-nombre">${item.nombre}</span>
                <span class="item-precio">$${(item.precio * item.cantidad).toFixed(2)}</span>
                <button class="item-eliminar" data-index="${index}" title="Eliminar producto">×</button>
            `;
            
            itemElement.querySelector('.item-eliminar').addEventListener('click', (e) => {
                e.stopPropagation();
                this.eliminarProducto(index);
            });
            
            container.appendChild(itemElement);
            total += item.precio * item.cantidad;
        });
        
        totalElement.textContent = `$${total.toFixed(2)}`;
    }

    updateEnviarButton() {
        const button = document.getElementById('enviarPedido');
        if (!button) return;
        
        button.disabled = !this.mesaActual || this.pedidoActual.length === 0;
        
        // Cambiar texto según estado
        if (button.disabled) {
            if (!this.mesaActual) {
                button.title = 'Selecciona una mesa primero';
            } else if (this.pedidoActual.length === 0) {
                button.title = 'Agrega productos al pedido';
            }
        } else {
            button.title = 'Enviar pedido a cocina';
        }
    }

    async enviarPedido() {
        if (!this.mesaActual || this.pedidoActual.length === 0) return;
        
        const pedido = {
            id: Date.now(),
            mesa: this.mesaActual,
            items: [...this.pedidoActual], // Copia para no modificar el original
            observaciones: document.getElementById('observaciones').value || '',
            hora: new Date().toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            }),
            fecha: new Date().toISOString().split('T')[0],
            estado: 'pendiente',
            timestamp: Date.now()
        };
        
        try {
            // Enviar a cocina vía WebSocket
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'nuevo_pedido',
                    data: pedido
                }));
            } else {
                // Fallback a localStorage si WebSocket no está disponible
                this.guardarPedidoLocal(pedido);
            }
            
            // Mostrar confirmación
            this.showNotification('✅ Pedido enviado a cocina!', 'success');
            
            // Reiniciar pedido actual
            this.pedidoActual = [];
            const obsInput = document.getElementById('observaciones');
            if (obsInput) obsInput.value = '';
            this.renderPedidoActual();
            this.updateEnviarButton();
            
        } catch (error) {
            console.error('Error al enviar pedido:', error);
            this.showNotification('❌ Error al enviar pedido', 'error');
        }
    }

    guardarPedidoLocal(pedido) {
        // Guardar en localStorage como respaldo
        try {
            const pedidosPendientes = JSON.parse(localStorage.getItem('pedidos_pendientes') || '[]');
            pedidosPendientes.push(pedido);
            localStorage.setItem('pedidos_pendientes', JSON.stringify(pedidosPendientes));
            console.log('Pedido guardado localmente:', pedido);
        } catch (error) {
            console.error('Error guardando pedido local:', error);
        }
    }

    setupWebSocket() {
        // WebSocket simple para comunicación en tiempo real
        // En producción, usar servidor WebSocket real
        try {
            // Para demostración, simulamos WebSocket
            // En un caso real: this.socket = new WebSocket('ws://tu-servidor.com');
            console.log('WebSocket configurado (modo simulación)');
        } catch (error) {
            console.warn('WebSocket no disponible, usando localStorage');
        }
    }

    updateUserInfo() {
        const user = auth.getUser();
        if (!user) return;
        
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.innerHTML = `
                <span>👤 ${user.name}</span>
                <small class="mesa-indicator">Mesa: ${this.mesaActual || 'No seleccionada'}</small>
                <button id="logoutBtn" class="logout-btn">Cerrar Sesión</button>
            `;
            
            // Agregar evento al botón de logout
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => auth.logout());
            }
        }
    }

    showNotification(message, type = 'info') {
        // Eliminar notificaciones anteriores
        const existingNotifs = document.querySelectorAll('.notification');
        existingNotifs.forEach(notif => notif.remove());
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Estilos según tipo
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.style.color = 'white';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '8px';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '1000';
        notification.style.animation = 'slideIn 0.3s ease';
        
        document.body.appendChild(notification);
        
        // Auto-eliminar después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }
}

// Inicializar sistema de pedidos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const pedidosSystem = new PedidosSystem();
    
    // Hacer disponible globalmente para debugging
    window.pedidosSystem = pedidosSystem;
    
    // Agregar estilos para animaciones
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .mesa-indicator {
            background-color: #3498db;
            color: white;
            padding: 3px 10px;
            border-radius: 15px;
            font-size: 0.85rem;
            margin-left: 10px;
        }
        .logout-btn {
            background-color: #e74c3c;
            color: white;
            border: none;
            padding: 5px 15px;
            border-radius: 5px;
            cursor: pointer;
            margin-left: 10px;
        }
        .logout-btn:hover {
            background-color: #c0392b;
        }
    `;
    document.head.appendChild(style);
});