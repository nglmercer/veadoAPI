// veadotube-client.ts
import fs from 'fs';
import path from 'path';
import os from 'os';
import WebSocket, { RawData } from 'ws';
import { EventEmitter } from 'events';
import type { VeadotubeInstance, VeadotubeMessage,InstanceFileData } from './types';
import { safeParse } from './utils/safeparse';
export class VeadotubeClient extends EventEmitter {
    private instances: Map<string, VeadotubeInstance> = new Map();
    private connections: Map<string, VeadotubeConnection> = new Map();
    private readonly instancesDir: string;
    private watcher: fs.FSWatcher | null = null;

    // Constantes internas para el protocolo
    private readonly listenerToken = "TpVtPlugin.ChangeState";

    constructor() {
        super();
        this.instancesDir = path.join(os.homedir(), '.veadotube', 'instances');
    }

    /**
     * Inicia la monitorización del directorio de instancias para descubrir nuevas
     * instancias de Veadotube o detectar cuando se cierran.
     */
    public startInstanceDiscovery(): void {
        if (!fs.existsSync(this.instancesDir)) {
            throw new Error(`Directorio de instancias no encontrado: ${this.instancesDir}`);
        }

        this.watcher = fs.watch(this.instancesDir, (eventType, filename) => {
            if ((eventType === 'rename' || eventType === 'change') && filename) {
                this.processInstanceFile(filename);
            }
        });

        console.log("Iniciando descubrimiento de instancias en:", this.instancesDir);
        fs.readdirSync(this.instancesDir).forEach(file => {
            this.processInstanceFile(file);
        });
    }

    /**
     * Procesa un archivo del directorio de instancias para añadir, actualizar o eliminar una instancia.
     * @param filename - El nombre del archivo a procesar.
     */
    private processInstanceFile(filename: string): void {
        const filePath = path.join(this.instancesDir, filename);
        const instanceId = safeParse(filename).name;

        try {
            if (fs.existsSync(filePath)) {
                // El archivo existe: la instancia está activa o se ha actualizado
                const fileContent = fs.readFileSync(filePath, 'utf8');
                if (!fileContent) return; // Archivo vacío, probablemente escribiéndose

                const instanceData = safeParse(fileContent) as InstanceFileData;

                const existingInstance = this.instances.get(instanceId);
                if (existingInstance && existingInstance.server === instanceData.server) {
                    return; // No hay cambios relevantes
                }

                const instance: VeadotubeInstance = {
                    id: instanceId,
                    server: instanceData.server,
                    name: instanceData.name || 'veadotube',
                    version: instanceData.version || '2.1'
                };

                console.log(`[PROCESS] Instancia detectada/actualizada: ID=${instance.id}, Server=${instance.server}`);
                this.instances.set(instance.id, instance);
                this.emit('instanceStart', instance);

            } else {
                // El archivo ha sido eliminado: la instancia se ha cerrado
                if (this.instances.has(instanceId)) {
                    this.instances.delete(instanceId);
                    this.connections.get(instanceId)?.close(); // Cierra la conexión si existe
                    this.connections.delete(instanceId);
                    this.emit('instanceEnd', instanceId);
                }
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                // Ignorar errores de parseo JSON, comunes cuando el archivo se está escribiendo.
            } else {
                console.error(`Error procesando el archivo de instancia ${filename}:`, error);
            }
        }
    }

    /**
     * Crea y gestiona una conexión WebSocket a una instancia de Veadotube.
     * @param instance - La instancia a la que conectar.
     * @param connectionName - Un nombre opcional para la conexión.
     */
    public createConnection(instance: VeadotubeInstance, connectionName: string = `TypeScriptClient-${instance.id}`): VeadotubeConnection {
        // Cierra cualquier conexión previa a esta instancia
        if (this.connections.has(instance.id)) {
            this.connections.get(instance.id)?.close();
        }

        const wsUri = this.buildWebSocketUri(instance, connectionName);
        console.log(`[CONNECTION] Creando conexión a: ${wsUri}`);

        const connection = new VeadotubeConnection(wsUri, instance, this);
        this.connections.set(instance.id, connection);

        // Propagar eventos de la conexión al cliente principal
        connection.on('connected', () => this.emit('connectionChange', connection, true));
        connection.on('disconnected', () => this.emit('connectionChange', connection, false));
        connection.on('message', (message) => this.emit('connectionReceive', connection, message));
        connection.on('error', (error) => this.emit('connectionError', connection, error));

        return connection;
    }

    private buildWebSocketUri(instance: VeadotubeInstance, connectionName: string): string {
        const encodedName = encodeURIComponent(connectionName);
        // La URL base es simplemente ws://host:port. Veadotube Mini no usa query params para el nombre.
        return `ws://${instance.server}?n=${encodedName}`;
    }

    /**
     * Cierra todas las conexiones y detiene la monitorización.
     */
    public close(): void {
        this.watcher?.close();
        this.connections.forEach(connection => connection.close());
        this.connections.clear();
        this.instances.clear();
        console.log("Cliente Veadotube detenido y todas las conexiones cerradas.");
    }
}


// --- CLASE PARA GESTIONAR UNA CONEXIÓN INDIVIDUAL ---

export class VeadotubeConnection extends EventEmitter {
    public readonly uri: string;
    public readonly instance: VeadotubeInstance;
    private readonly client: VeadotubeClient;
    private ws: WebSocket | null = null;
    public isConnected: boolean = false;

    // Lógica de reconexión
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 5;
    private readonly reconnectDelay = 1000;

    constructor(uri: string, instance: VeadotubeInstance, client: VeadotubeClient) {
        super();
        this.uri = uri;
        this.instance = instance;
        this.client = client;
        this.connect();
    }

    private connect(): void {
        try {
            console.log(`[WEBSOCKET] Intentando conectar a: ${this.uri}`);
            this.ws = new WebSocket(this.uri);

            this.ws.on('open', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log(`[WEBSOCKET] ✅ Conectado exitosamente a ${this.uri}`);
                this.emit('connected');
                this.initializeProtocol();
            });

            this.ws.on('message', (data: RawData) => {  
                try {  
                    let dataString = data.toString().trim();
                    console.log("MESSAGE",dataString)
                    const message = safeParse(dataString) as VeadotubeMessage;
                        this.emit('message', message);  
                } catch (error) {  
                    console.error('[WEBSOCKET] Error parseando mensaje:', error);  
                }  
            });

            this.ws.on('close', (code, reason) => {
                this.isConnected = false;
                const reasonString = reason.toString() || 'Sin razón';
                console.log(`[WEBSOCKET] ❌ Conexión cerrada: ${code} - ${reasonString}`);
                this.emit('disconnected', { code, reason: reasonString });

                this.attemptReconnect();
            });

            this.ws.on('error', (error) => {
                console.error(`[WEBSOCKET] ❌ Error de WebSocket:`, error.message);
                this.emit('error', error);
                // El evento 'close' se llamará después, no es necesario reconectar aquí.
            });

        } catch (error) {
            console.error(`[WEBSOCKET] ❌ Error creando WebSocket:`, error);
            this.emit('error', error);
            this.attemptReconnect();
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * this.reconnectAttempts;
            console.log(`[WEBSOCKET] ⏳ Reintentando conexión en ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
        } else {
            console.log(`[WEBSOCKET] ❌ Máximo de reintentos alcanzado para ${this.uri}.`);
        }
    }
    
    /**
     * Envía las peticiones iniciales para obtener estados y suscribirse a cambios.
     */
    private initializeProtocol(): void {
        console.log(`[PROTOCOL] Inicializando protocolo para ${this.instance.server}`);
        this.sendRequestStateList();
        this.sendRequestStatePeek();
        this.sendRequestStartListener();
    }

    send(request: VeadotubeMessage): boolean {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const message = JSON.stringify(request);
            console.log(`[SEND] Enviando:`, message);
            this.ws.send(message);
            return true;
        }
        console.warn(`[SEND] No se pudo enviar el mensaje, WebSocket no está abierto.`);
        return false;
    }

    // --- Métodos para interactuar con la API de Veadotube ---

    public sendRequestStateList(): void {
        this.send({
            "event": "list",
            "type": "stateEvents",
            "id": "mini"
        });
    }

    public sendRequestStatePeek(): void {
        this.send({
            "event": "peek",
            "type": "stateEvents",
            "id": "mini"
        });
    }

    public sendRequestStartListener(): void {
        this.send({
            "event": "listen",
            "type": "stateEvents",
            "id": "mini",
            "token": (this.client as any).listenerToken // Accede a la propiedad privada del cliente
        });
    }

    public sendRequestStopListener(): void {
        this.send({
            "event": "unlisten",
            "type": "stateEvents",
            "id": "mini",
            "token": (this.client as any).listenerToken
        });
    }

    public setAvatarState(stateId: string): void {
        this.send({
            "event": "payload",
            "type": "stateEvents",
            "id": "mini",
            "payload": {
                "event": "set",
                "state": stateId
            }
        });
    }

    public close(): void {
        if (this.isConnected) {
            this.sendRequestStopListener();
        }
        // Evitar reconexiones al cerrar manualmente
        this.reconnectAttempts = this.maxReconnectAttempts;
        this.ws?.close();
    }
}