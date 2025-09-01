// veadotube-event-handler.ts  
import { EventEmitter } from 'events';  
import type { VeadotubeInstance, State, Entry } from './types';  
  
export class VeadotubeEventHandler extends EventEmitter {  
    private stateCache: Map<string, State[]> = new Map();  
    private currentStateCache: Map<string, string> = new Map();  
    private thumbnailCache: Map<string, string> = new Map();  
  
    /**  
     * Maneja eventos de lista de estados y los cachea  
     */  
    public handleStateList(instanceId: string, states: State[]): void {  
        this.stateCache.set(instanceId, states);  
        this.emit('stateListUpdated', instanceId, states);  
          
        // Emitir eventos individuales para cada estado  
        states.forEach(state => {  
            this.emit('stateDiscovered', instanceId, state);  
        });  
    }  
  
    /**  
     * Maneja cambios de estado del avatar  
     */  
    public handleStateChange(instanceId: string, newState: string): void {  
        const previousState = this.currentStateCache.get(instanceId);  
        this.currentStateCache.set(instanceId, newState);  
          
        this.emit('stateChanged', {  
            instanceId,  
            previousState,  
            newState  
        });  
    }  
  
    /**  
     * Maneja respuestas de peek  
     */  
    public handleStatePeek(instanceId: string, currentState: string): void {  
        this.currentStateCache.set(instanceId, currentState);  
        this.emit('statePeeked', instanceId, currentState);  
    }  
  
    /**  
     * Maneja miniaturas recibidas  
     */  
    public handleThumbnail(instanceId: string, thumbnail: {  
        state: string;  
        width: number;  
        height: number;  
        png: string;  
        hash?: string;  
    }): void {  
        // Cachear miniatura  
        this.thumbnailCache.set(`${instanceId}:${thumbnail.state}`, thumbnail.png);  
          
        this.emit('thumbnailReceived', instanceId, thumbnail);  
    }  
  
    /**  
     * Maneja lista de nodos/entradas  
     */  
    public handleNodeList(instanceId: string, entries: Entry[]): void {  
        this.emit('nodeListReceived', instanceId, entries);  
          
        // Emitir eventos para cada tipo de nodo  
        entries.forEach(entry => {  
            this.emit('nodeDiscovered', instanceId, entry);  
              
            if (entry.type === 'stateEvents') {  
                this.emit('stateEventsNodeDiscovered', instanceId, entry);  
            }  
        });  
    }  
  
    // --- Métodos de acceso a cache ---  
  
    /**  
     * Obtiene los estados cacheados para una instancia  
     */  
    public getCachedStates(instanceId: string): State[] | undefined {  
        return this.stateCache.get(instanceId);  
    }  
  
    /**  
     * Obtiene el estado actual cacheado para una instancia  
     */  
    public getCurrentState(instanceId: string): string | undefined {  
        return this.currentStateCache.get(instanceId);  
    }  
  
    /**  
     * Obtiene una miniatura cacheada  
     */  
    public getCachedThumbnail(instanceId: string, stateId: string): string | undefined {  
        return this.thumbnailCache.get(`${instanceId}:${stateId}`);  
    }  
  
    /**  
     * Limpia el cache para una instancia específica  
     */  
    public clearInstanceCache(instanceId: string): void {  
        this.stateCache.delete(instanceId);  
        this.currentStateCache.delete(instanceId);  
          
        // Limpiar miniaturas relacionadas con esta instancia  
        const keysToDelete = Array.from(this.thumbnailCache.keys())  
            .filter(key => key.startsWith(`${instanceId}:`));  
        keysToDelete.forEach(key => this.thumbnailCache.delete(key));  
          
        this.emit('instanceCacheCleared', instanceId);  
    }  
  
    /**  
     * Limpia todo el cache  
     */  
    public clearAllCache(): void {  
        this.stateCache.clear();  
        this.currentStateCache.clear();  
        this.thumbnailCache.clear();  
        this.emit('allCacheCleared');  
    }  
  
    /**  
     * Obtiene estadísticas del cache  
     */  
    public getCacheStats(): {  
        instancesWithStates: number;  
        instancesWithCurrentState: number;  
        thumbnailsCached: number;  
    } {  
        return {  
            instancesWithStates: this.stateCache.size,  
            instancesWithCurrentState: this.currentStateCache.size,  
            thumbnailsCached: this.thumbnailCache.size  
        };  
    }  
}