// Configuración para Google Sheets como base de datos
class GoogleSheetsDB {
    constructor() {
        this.spreadsheetId = 'TU_SPREADSHEET_ID'; // Reemplazar con ID real
        this.apiKey = 'TU_API_KEY'; // Reemplazar con API key
        this.sheetName = 'PedidosTerminados';
        this.init();
    }

    init() {
        // Verificar si estamos en modo cocina
        const user = auth.getUser();
        if (!user || user.role !== 'cocina') {
            return;
        }
        
        this.setupSheet();
    }

    async setupSheet() {
        try {
            // Crear hoja si no existe
            await this.ensureSheetExists();
        } catch (error) {
            console.error('Error configurando Google Sheets:', error);
        }
    }

    async ensureSheetExists() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}?key=${this.apiKey}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            // Verificar si la hoja existe
            const sheetExists = data.sheets.some(sheet => 
                sheet.properties.title === this.sheetName
            );
            
            if (!sheetExists) {
                await this.createSheet();
            }
        } catch (error) {
            console.warn('No se pudo verificar la hoja, usando modo local');
        }
    }

    async createSheet() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}:batchUpdate?key=${this.apiKey}`;
        
        const request = {
            requests: [{
                addSheet: {
                    properties: {
                        title: this.sheetName
                    }
                }
            }]
        };
        
        try {
            await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            });
            
            // Agregar encabezados
            await this.addHeaders();
        } catch (error) {
            console.error('Error creando hoja:', error);
        }
    }

    async addHeaders() {
        const headers = ['Fecha', 'Hora', 'Mesa', 'Productos', 'Observaciones', 'Estado', 'Timestamp'];
        await this.appendRow(headers);
    }

    async guardarPedidoTerminado(pedido) {
        try {
            // Preparar datos para la fila
            const rowData = [
                pedido.fecha,
                pedido.hora,
                pedido.mesa,
                pedido.items.map(item => `${item.cantidad}x ${item.nombre}`).join(', '),
                pedido.observaciones || '',
                'Terminado',
                new Date().toISOString()
            ];
            
            // Intentar guardar en Google Sheets
            const saved = await this.appendRow(rowData);
            
            if (!saved) {
                // Fallback a localStorage
                this.guardarLocal(pedido);
            }
            
            return saved;
        } catch (error) {
            console.error('Error guardando pedido:', error);
            this.guardarLocal(pedido);
            return false;
        }
    }

    async appendRow(rowData) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${this.sheetName}!A:append?valueInputOption=RAW&key=${this.apiKey}`;
        
        const request = {
            values: [rowData]
        };
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            });
            
            return response.ok;
        } catch (error) {
            console.warn('No se pudo guardar en Google Sheets:', error);
            return false;
        }
    }

    guardarLocal(pedido) {
        // Guardar en localStorage como respaldo
        const pedidosTerminados = JSON.parse(localStorage.getItem('pedidos_terminados') || '[]');
        pedido.timestamp = new Date().toISOString();
        pedido.estado = 'Terminado';
        pedidosTerminados.push(pedido);
        localStorage.setItem('pedidos_terminados', JSON.stringify(pedidosTerminados));
        
        console.log('Pedido guardado localmente:', pedido);
        return true;
    }

    async getPedidosTerminados(fecha = null) {
        try {
            if (!fecha) {
                fecha = new Date().toISOString().split('T')[0];
            }
            
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${this.sheetName}!A:G?key=${this.apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.values && data.values.length > 1) {
                // Convertir a objetos (saltar encabezados)
                return data.values.slice(1)
                    .filter(row => row[0] === fecha)
                    .map(row => ({
                        fecha: row[0],
                        hora: row[1],
                        mesa: row[2],
                        productos: row[3],
                        observaciones: row[4],
                        estado: row[5],
                        timestamp: row[6]
                    }));
            }
            
            return [];
        } catch (error) {
            console.warn('No se pudieron obtener pedidos de Google Sheets:', error);
            
            // Fallback a localStorage
            const pedidosLocal = JSON.parse(localStorage.getItem('pedidos_terminados') || '[]');
            return pedidosLocal.filter(p => p.fecha === fecha);
        }
    }
}

// Configuración alternativa para JSON en Google Drive
class GoogleDriveDB {
    constructor() {
        this.fileId = null;
        this.folderId = 'TU_FOLDER_ID'; // Reemplazar con ID de carpeta
        this.fileName = 'pedidos.json';
        this.init();
    }

    async init() {
        await this.ensureFileExists();
    }

    async ensureFileExists() {
        // En una implementación real, usar Google Drive API
        // Para demostración, usar localStorage
        console.log('Google Drive DB inicializado (modo simulación)');
    }

    async guardarPedido(pedido) {
        // Simulación para demostración
        const pedidos = JSON.parse(localStorage.getItem('drive_pedidos') || '[]');
        pedido.id = Date.now();
        pedido.timestamp = new Date().toISOString();
        pedidos.push(pedido);
        localStorage.setItem('drive_pedidos', JSON.stringify(pedidos));
        
        return true;
    }
}

// Inicializar base de datos según configuración
const database = new GoogleSheetsDB();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GoogleSheetsDB, GoogleDriveDB, database };
}