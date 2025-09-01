// types.ts - Tipos completos para el protocolo Veadotube  
  
export interface InstanceFileData {  
    server: string;  
    name?: string;  
    version?: string;  
    time?: number; // Timestamp del archivo  
}  
  
// Representa una instancia de Veadotube descubierta y activa  
export interface VeadotubeInstance {  
    id: string;  
    server: string;  
    name: string;  
    version: string;  
}  
  
// Representa la estructura de un mensaje enviado o recibido por el WebSocket  
export interface VeadotubeMessage {  
    event: 'list' | 'peek' | 'listen' | 'unlisten' | 'payload' | 'info';  
    type?: 'stateEvents';  
    id?: string;  
    token?: string;  
    payload?: Record<string, any>;  
}  
  
// --- TIPOS DE MENSAJES DE RESULTADO ---  
  
// Mensaje base polimórfico  
export interface ResultMessage {  
    event: string;  
    channel?: string; // Añadido durante el procesamiento  
}  
  
// Mensaje con lista de entradas (respuesta a solicitudes de lista de nodos)  
export interface ResultMessageWithEntryList extends ResultMessage {  
    event: 'list';  
    entries: Entry[];  
}  
  
// Mensaje con información de instancia  
export interface ResultMessageWithInstanceInfo extends ResultMessage {  
    event: 'info';  
    id: string;  
    server: string;  
    name: string;  
    version: string;  
}  
  
// Mensaje con payload complejo (la mayoría de respuestas)  
export interface ResultMessageWithPayload extends ResultMessage {  
    event: 'payload';  
    type: string;  
    id: string;  
    name: string;  
    payload: ResultPayload;  
}  
  
// --- TIPOS DE PAYLOAD DE RESULTADO ---  
  
// Payload base polimórfico  
export interface ResultPayload {  
    event: string;  
}  
  
// Payload con datos de imagen PNG (miniaturas)  
export interface ResultPayloadPng extends ResultPayload {  
    event: 'thumb';  
    state: string;  
    width: number;  
    height: number;  
    png: string; // Base64 encoded PNG data  
    hash?: string; // Solo en versión 2.1+  
}  
  
// Payload con estado individual (peek, set, etc.)  
export interface ResultPayloadState extends ResultPayload {  
    event: 'peek' | 'set';  
    state: string;  
}  
  
// Payload con lista de estados  
export interface ResultPayloadStateList extends ResultPayload {  
    event: 'list';  
    states: State[];  
}  
  
// --- TIPOS DE DATOS BÁSICOS ---  
  
// Representa un estado/avatar individual  
export interface State {  
    id: string;  
    name: string;  
    thumb_hash?: string; // Solo en versión 2.1+  
}  
  
// Representa una entrada/nodo en el sistema  
export interface Entry {  
    type: string;  
    id: string;  
    name: string; // En v2.1+ name === id  
}  
  
// --- TIPOS DE EVENTOS ESPECÍFICOS ---  
  
// Evento de cambio de estado  
export interface StateChangeEvent {  
    instanceId: string;  
    previousState?: string;  
    newState: string;  
}  
  
// Evento de miniatura recibida  
export interface ThumbnailEvent {  
    instanceId: string;  
    state: string;  
    width: number;  
    height: number;  
    png: string;  
    hash?: string;  
}  
  
// --- TIPOS DE SOLICITUD ---  
  
// Payload para solicitar miniatura  
export interface RequestPayloadThumb {  
    event: 'thumb';  
    state: string;  
    width?: number;  
    height?: number;  
}  
  
// Payload para cambiar estado  
export interface RequestPayloadSet {  
    event: 'set';  
    state: string;  
}  
  
// Payload para peek  
export interface RequestPayloadPeek {  
    event: 'peek';  
}  
  
// Payload para lista de estados  
export interface RequestPayloadList {  
    event: 'list';  
}  
  
// --- TIPOS DE CONFIGURACIÓN ---  
  
// Configuración de conexión  
export interface ConnectionConfig {  
    maxReconnectAttempts?: number;  
    reconnectDelay?: number;  
    connectionTimeout?: number;  
    enableCache?: boolean;  
}  
  
// Configuración del cliente  
export interface ClientConfig {  
    instancesDir?: string;  
    listenerToken?: string;  
    autoConnect?: boolean;  
    connectionConfig?: ConnectionConfig;  
}  
  
// --- TIPOS DE UTILIDAD ---  
  
// Resultado de operación  
export interface OperationResult<T = any> {  
    success: boolean;  
    data?: T;  
    error?: string;  
}  
  
// Estadísticas de cache  
export interface CacheStats {  
    instancesWithStates: number;  
    instancesWithCurrentState: number;  
    thumbnailsCached: number;  
}  
  
// Información de conexión  
export interface ConnectionInfo {  
    instanceId: string;  
    uri: string;  
    isConnected: boolean;  
    reconnectAttempts: number;  
    lastError?: string;  
}
// --- TIPOS DE ERROR ---  
  
export interface VeadotubeError {  
    code: string;  
    message: string;  
    details?: any;  
}  
  
export interface ConnectionError extends VeadotubeError {  
    instanceId: string;  
    uri: string;  
    reconnectAttempts: number;  
}  
  
export interface ProtocolError extends VeadotubeError {  
    rawMessage?: string;  
    parsedMessage?: any;  
}  
  
// --- TIPOS DE EVENTOS DEL CLIENTE ---  
  
export interface ClientEvents {  
    'instanceStart': (instance: VeadotubeInstance) => void;  
    'instanceEnd': (instanceId: string) => void;  
    'connectionChange': (connection: any, isConnected: boolean) => void;  
    'connectionReceive': (connection: any, message: ResultMessage) => void;  
    'connectionError': (connection: any, error: Error) => void;  
}  
  
export interface ConnectionEvents {  
    'connected': () => void;  
    'disconnected': (info: { code: number; reason: string }) => void;  
    'message': (message: ResultMessage) => void;  
    'error': (error: Error) => void;  
    'stateChange': (state: string) => void;  
    'stateList': (states: State[]) => void;  
    'statePeek': (state: string) => void;  
    'thumbnail': (thumbnail: ThumbnailEvent) => void;  
    'nodeList': (entries: Entry[]) => void;  
    'entryList': (entries: Entry[]) => void;  
    'unknownMessage': (message: ResultMessage) => void;  
}  
  
// --- TIPOS DE VERSIÓN ---  
  
export type VeadotubeVersion = '2.0' | '2.1' | '2.1a' | string;  
  
export interface VersionFeatures {  
    supportsThumbHash: boolean;  
    supportsChannelPrefixes: boolean;  
    requiresNullTermination: boolean;  
}