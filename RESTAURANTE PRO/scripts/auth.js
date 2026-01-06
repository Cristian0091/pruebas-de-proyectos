// Sistema de autenticación simple para navegador
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        // Verificar si hay sesión activa
        const savedSession = localStorage.getItem('restaurant_session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                // Verificar que la sesión no haya expirado (24 horas)
                if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
                    this.currentUser = session.user;
                    this.isAuthenticated = true;
                    this.redirectToDashboard();
                } else {
                    localStorage.removeItem('restaurant_session');
                }
            } catch (error) {
                console.error('Error al cargar sesión:', error);
                localStorage.removeItem('restaurant_session');
            }
        }

        // Configurar formulario de login si existe
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Configurar logout si existe
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    // Credenciales de demostración (en producción usar servidor)
    demoCredentials = {
        'mesero': { password: 'mesero123', role: 'pedidos', name: 'Mesero Demo' },
        'cocina': { password: 'cocina123', role: 'cocina', name: 'Cocina Demo' },
        'admin': { password: 'admin123', role: 'pedidos', name: 'Administrador' }
    };

    handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const selectedRole = document.getElementById('role').value;

        // Validar credenciales de demostración
        if (this.demoCredentials[username] && 
            this.demoCredentials[username].password === password &&
            this.demoCredentials[username].role === selectedRole) {
            
            this.currentUser = {
                username: username,
                role: selectedRole,
                name: this.demoCredentials[username].name,
                timestamp: Date.now()
            };

            this.isAuthenticated = true;
            
            // Guardar sesión en localStorage
            localStorage.setItem('restaurant_session', JSON.stringify({
                user: this.currentUser,
                timestamp: Date.now()
            }));

            this.redirectToDashboard();
            
        } else {
            this.showError('Credenciales incorrectas o perfil no coincide');
        }
    }

    redirectToDashboard() {
        if (!this.currentUser) return;

        switch (this.currentUser.role) {
            case 'pedidos':
                window.location.href = 'pedidos.html';
                break;
            case 'cocina':
                window.location.href = 'cocina.html';
                break;
            default:
                window.location.href = 'index.html';
        }
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('restaurant_session');
        window.location.href = 'index.html';
    }

    showError(message) {
        // Eliminar error anterior
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Crear y mostrar nuevo mensaje de error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            background-color: #fee;
            color: #c33;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            border: 1px solid #fcc;
        `;
        errorDiv.textContent = message;

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.insertBefore(errorDiv, loginForm.firstChild);
        }

        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    getUser() {
        return this.currentUser;
    }

    hasRole(role) {
        return this.isAuthenticated && this.currentUser.role === role;
    }
}

// Inicializar sistema de autenticación
const auth = new AuthSystem();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthSystem, auth };
}