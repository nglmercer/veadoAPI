// veadotube-type-guards.ts  
import type {  
    ResultMessage,  
    ResultMessageWithEntryList,  
    ResultMessageWithPayload,  
    ResultMessageWithInstanceInfo,  
    ResultPayload,  
    ResultPayloadPng,  
    ResultPayloadState,  
    ResultPayloadStateList,
    VeadotubeMessage,  
    Entry,  
    State  
} from './types';  
  
export class VeadotubeTypeGuards {  
      
    // --- Type Guards para ResultMessage ---  
      
    static isResultMessageWithEntryList(message: ResultMessage): message is ResultMessageWithEntryList {  
        return 'entries' in message && Array.isArray((message as any).entries);  
    }  
  
    static isResultMessageWithPayload(message: ResultMessage): message is ResultMessageWithPayload {  
        return 'payload' in message && typeof (message as any).payload === 'object';  
    }  
  
    static isResultMessageWithInstanceInfo(message: ResultMessage): message is ResultMessageWithInstanceInfo {  
        return 'server' in message && 'version' in message;  
    }  
  
    // --- Type Guards para ResultPayload ---  
  
    static isResultPayloadPng(payload: ResultPayload): payload is ResultPayloadPng {  
        return payload.event === 'thumb' &&   
               'png' in payload &&   
               'width' in payload &&   
               'height' in payload;  
    }  
  
    static isResultPayloadState(payload: ResultPayload): payload is ResultPayloadState {  
        return (payload.event === 'peek' || payload.event === 'set') &&   
               'state' in payload &&   
               !('states' in payload) &&   
               !('png' in payload);  
    }  
  
    static isResultPayloadStateList(payload: ResultPayload): payload is ResultPayloadStateList {  
        return payload.event === 'list' &&   
               'states' in payload &&   
               Array.isArray((payload as any).states);  
    }  
  
    // --- Validadores de estructura ---  
  
    static isValidState(obj: any): obj is State {  
        return obj &&   
               typeof obj.id === 'string' &&   
               typeof obj.name === 'string';  
    }  
  
    static isValidEntry(obj: any): obj is Entry {  
        return obj &&   
               typeof obj.type === 'string' &&   
               typeof obj.id === 'string' &&   
               typeof obj.name === 'string';  
    }  
  
    static isValidVeadotubeMessage(obj: any): obj is VeadotubeMessage {  
        return obj &&   
               typeof obj.event === 'string' &&   
               ['list', 'peek', 'listen', 'unlisten', 'payload', 'info'].includes(obj.event);  
    }  
  
    // --- Validadores de canal ---  
  
    static extractChannelFromMessage(rawMessage: string): { channel: string; message: string } {  
        const colonIndex = rawMessage.indexOf(':');  
        if (colonIndex > 0) {  
            return {  
                channel: rawMessage.substring(0, colonIndex),  
                message: rawMessage.substring(colonIndex + 1)  
            };  
        }  
        return {  
            channel: '',  
            message: rawMessage  
        };  
    }  
  
    static isChannelMessage(rawMessage: string): boolean {  
        return rawMessage.includes(':') && rawMessage.indexOf(':') > 0;  
    }  
}