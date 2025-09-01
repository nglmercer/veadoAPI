// veadotube-protocol-utils.ts  
export class VeadotubeProtocolUtils {  
      
    /**  
     * Crea un mensaje de solicitud de lista de estados  
     */  
    static createStateListRequest(): any {  
        return {  
            "event": "payload",  
            "type": "stateEvents",  
            "id": "mini",  
            "payload": {  
                "event": "list"  
            }  
        };  
    }  
  
    /**  
     * Crea un mensaje de solicitud de peek  
     */  
    static createStatePeekRequest(): any {  
        return {  
            "event": "payload",   
            "type": "stateEvents",  
            "id": "mini",  
            "payload": {  
                "event": "peek"  
            }  
        };  
    }  
  
    /**  
     * Crea un mensaje de solicitud de miniatura  
     */  
    static createThumbnailRequest(stateId: string, width?: number, height?: number): any {  
        const payload: any = {  
            event: "thumb",  
            state: stateId  
        };  
  
        if (width !== undefined) payload.width = width;  
        if (height !== undefined) payload.height = height;  
  
        return {  
            "event": "payload",  
            "type": "stateEvents",  
            "id": "mini",   
            "payload": payload  
        };  
    }  
  
    /**  
     * Crea un mensaje para establecer estado del avatar  
     */  
    static createSetStateRequest(stateId: string): any {  
        return {  
            "event": "payload",  
            "type": "stateEvents",  
            "id": "mini",  
            "payload": {  
                "event": "set",  
                "state": stateId  
            }  
        };  
    }  
  
    /**  
     * Crea un mensaje para iniciar listener  
     */  
    static createStartListenerRequest(token: string): any {  
        return {  
            "event": "listen",  
            "type": "stateEvents",   
            "id": "mini",  
            "token": token  
        };  
    }  
  
    /**  
     * Crea un mensaje para detener listener  
     */  
    static createStopListenerRequest(token: string): any {  
        return {  
            "event": "unlisten",  
            "type": "stateEvents",  
            "id": "mini",   
            "token": token  
        };  
    }  
  
    /**  
     * Crea un mensaje de solicitud de información de instancia  
     */  
    static createInstanceInfoRequest(): any {  
        return {  
            "event": "info"  
        };  
    }  
  
    /**  
     * Crea un mensaje de solicitud de lista de nodos  
     */  
    static createNodeListRequest(): any {  
        return {  
            "event": "list"  
        };  
    }  
  
    /**  
     * Parsea un mensaje con prefijo de canal  
     */  
    static parseChannelMessage(rawMessage: string): { channel: string; message: any } {  
        const colonIndex = rawMessage.indexOf(':');  
        if (colonIndex > 0) {  
            const channel = rawMessage.substring(0, colonIndex);  
            const messageText = rawMessage.substring(colonIndex + 1);  
            return {  
                channel,  
                message: JSON.parse(messageText)  
            };  
        }  
        return {  
            channel: '',  
            message: JSON.parse(rawMessage)  
        };  
    }  
  
    /**  
     * Valida si un mensaje es una respuesta de lista de estados  
     */  
    static isStateListResponse(message: any): boolean {  
        return message?.payload?.event === 'list' && Array.isArray(message?.payload?.states);  
    }  
  
    /**  
     * Valida si un mensaje es una respuesta de peek  
     */  
    static isStatePeekResponse(message: any): boolean {  
        return message?.payload?.event === 'peek' && typeof message?.payload?.state === 'string';  
    }  
  
    /**  
     * Valida si un mensaje es una respuesta de miniatura  
     */  
    static isThumbnailResponse(message: any): boolean {  
        return message?.payload?.event === 'thumb' &&   
               typeof message?.payload?.png === 'string' &&  
               typeof message?.payload?.state === 'string';  
    }  
  
    /**  
     * Valida si un mensaje es una notificación de cambio de estado  
     */  
    static isStateChangeNotification(message: any): boolean {  
        return message?.payload?.event === 'set' && typeof message?.payload?.state === 'string';  
    }  
}