// veadotube-connection-extended.ts  
import { VeadotubeConnection } from './veadotube-client';  
import type {   
    VeadotubeInstance,   
    ResultMessage,   
    ResultMessageWithPayload,  
    ResultMessageWithEntryList,  
    ResultPayloadStateList,  
    ResultPayloadState,  
    ResultPayloadPng,  
    Entry,  
    State  
} from './types';  
  
export class VeadotubeConnectionExtended extends VeadotubeConnection {  
      
    constructor(uri: string, instance: VeadotubeInstance, client: any) {  
        super(uri, instance, client);  
        this.setupMessageHandlers();  
    }  
  
    /**  
     * Configura los manejadores de mensajes específicos del protocolo  
     */  
    private setupMessageHandlers(): void {  
        this.on('message', (rawMessage: any) => {  
            this.processReceivedMessage(rawMessage);  
        });  
    }  
  
    /**  
     * Procesa mensajes recibidos y los separa por canal y tipo  
     * Basado en el procesamiento de BleatKan  
     */  
    private processReceivedMessage(rawMessage: any): void {  
        try {  
            // Extraer canal si existe (formato "nodes:JSON")  
            let messageText = rawMessage.toString();  
            let channel = '';  
              
            const colonIndex = messageText.indexOf(':');  
            if (colonIndex > 0) {  
                channel = messageText.substring(0, colonIndex);  
                messageText = messageText.substring(colonIndex + 1);  
            }  
  
            const message = JSON.parse(messageText) as ResultMessage;  
            message.channel = channel;  
  
            this.routeMessage(message);  
        } catch (error) {  
            console.error('[PROTOCOL] Error procesando mensaje:', error);  
        }  
    }  
  
    /**  
     * Enruta mensajes a los manejadores específicos según su tipo  
     */  
    private routeMessage(message: ResultMessage): void {  
        if (this.isResultMessageWithEntryList(message)) {  
            this.handleEntryListMessage(message);  
        } else if (this.isResultMessageWithPayload(message)) {  
            this.handlePayloadMessage(message);  
        } else {  
            this.emit('unknownMessage', message);  
        }  
    }  
  
    /**  
     * Maneja mensajes de lista de entradas (respuesta a "list")  
     */  
    private handleEntryListMessage(message: ResultMessageWithEntryList): void {  
        this.emit('entryList', message.entries);  
          
        // Emitir evento específico para lista de nodos  
        if (message.event === 'list') {  
            this.emit('nodeList', message.entries);  
        }  
    }  
  
    /**  
     * Maneja mensajes con payload (la mayoría de respuestas)  
     */  
    private handlePayloadMessage(message: ResultMessageWithPayload): void {  
        const { payload } = message;  
  
        if (this.isResultPayloadStateList(payload)) {  
            this.emit('stateList', payload.states);  
        } else if (this.isResultPayloadState(payload)) {  
            this.handleStatePayload(payload, message);  
        } else if (this.isResultPayloadPng(payload)) {  
            this.emit('thumbnail', {  
                state: payload.state,  
                width: payload.width,  
                height: payload.height,  
                png: payload.png,  
                hash: payload.hash  
            });  
        }  
    }  
  
    /**  
     * Maneja payloads de estado individual  
     */  
    private handleStatePayload(payload: ResultPayloadState, message: ResultMessageWithPayload): void {  
        switch (payload.event) {  
            case 'peek':  
                this.emit('statePeek', payload.state);  
                break;  
            case 'set':  
                this.emit('stateChange', payload.state);  
                break;  
            default:  
                this.emit('stateEvent', payload);  
        }  
    }  
  
    // --- Métodos de solicitud adicionales ---  
  
    /**  
     * Solicita una miniatura de un estado específico  
     */  
    public requestThumbnail(stateId: string, width?: number, height?: number): void {  
        const payload: any = {  
            event: "thumb",  
            state: stateId  
        };  
  
        if (width !== undefined) payload.width = width;  
        if (height !== undefined) payload.height = height;  
  
        this.send({  
            "event": "payload",  
            "type": "stateEvents",   
            "id": "mini",  
            "payload": payload  
        });  
    }  
  
    /**  
     * Solicita información de la instancia  
     */  
    public requestInstanceInfo(): void {  
        this.send({  
            "event": "info"  
        });  
    }  
  
    /**  
     * Solicita lista de nodos disponibles  
     */  
    public requestNodeList(): void {  
        this.send({  
            "event": "list"  
        });  
    }  
  
    // --- Type Guards ---  
  
    private isResultMessageWithEntryList(message: ResultMessage): message is ResultMessageWithEntryList {  
        return 'entries' in message;  
    }  
  
    private isResultMessageWithPayload(message: ResultMessage): message is ResultMessageWithPayload {  
        return 'payload' in message;  
    }  
  
    private isResultPayloadStateList(payload: any): payload is ResultPayloadStateList {  
        return payload && 'states' in payload;  
    }  
  
    private isResultPayloadState(payload: any): payload is ResultPayloadState {  
        return payload && 'state' in payload && !('states' in payload) && !('png' in payload);  
    }  
  
    private isResultPayloadPng(payload: any): payload is ResultPayloadPng {  
        return payload && 'png' in payload;  
    }  
  
    // --- Métodos de conveniencia para listeners ---  
  
    /**  
     * Registra un listener para cambios de estado del avatar  
     */  
    public onStateChange(callback: (state: string) => void): this {  
        this.on('stateChange', callback);  
        return this;  
    }  
  
    /**  
     * Registra un listener para cuando se recibe la lista de estados  
     */  
    public onStateList(callback: (states: State[]) => void): this {  
        this.on('stateList', callback);  
        return this;  
    }  
  
    /**  
     * Registra un listener para respuestas de peek  
     */  
    public onStatePeek(callback: (currentState: string) => void): this {  
        this.on('statePeek', callback);  
        return this;  
    }  
  
    /**  
     * Registra un listener para miniaturas recibidas  
     */  
    public onThumbnail(callback: (thumbnail: {  
        state: string;  
        width: number;  
        height: number;  
        png: string;  
        hash?: string;  
    }) => void): this {  
        this.on('thumbnail', callback);  
        return this;  
    }  
  
    /**  
     * Registra un listener para la lista de nodos  
     */  
    public onNodeList(callback: (entries: Entry[]) => void): this {  
        this.on('nodeList', callback);  
        return this;  
    }  
}