import axios from 'axios';
import * as Speech from 'expo-speech';
import { io, Socket } from 'socket.io-client';
import { getEnvVar, getGlassesConfig, getSocketAIUrl } from '../utils/env';

interface SocketCommand {
    action: string;
    data?: any;
    timestamp: number;
}

interface SocketResponse {
    success: boolean;
    message: string;
    data?: any;
}

interface GlassesFrame {
    port: number;
    code: string;
    model?: string;
}

const speak = (text: string) => {
    Speech.speak(text, { language: 'es-ES', rate: 0.9 });
};

class SocketGlassesService {
    private socket: Socket | null = null;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 2000;
    private pingInterval: NodeJS.Timeout | null = null;
    private continuousAnalysisInterval: NodeJS.Timeout | null = null;
    private isStreamAnalysisActive: boolean = false;
    private currentGlassesFrame: GlassesFrame | null = null;

    /**
     * Conectar al servidor Socket.IO para comandos avanzados
     */
    async connect(serverUrl?: string): Promise<boolean> {
        try {
            if (this.socket && this.isConnected) {
                console.log('[SocketGlasses] Ya conectado al servidor');
                return true;
            }

            // Usar la URL proporcionada o detectar automáticamente
            const socketUrl = getSocketAIUrl();
            console.log(socketUrl, 'SOY LA URL');
            console.log('[SocketGlasses] Conectando a Socket.IO:', socketUrl);
            
            // Configurar Socket.IO con opciones para React Native
            this.socket = io(socketUrl, {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                forceNew: true,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay
            });

            return new Promise((resolve, reject) => {
                if (!this.socket) {
                    reject(new Error('Socket no inicializado'));
                    return;
                }

                // Timeout para la conexión
                const timeout = setTimeout(() => {
                    console.error('[SocketGlasses] Timeout de conexión');
                    reject(new Error('Timeout de conexión'));
                }, 10000);

                this.socket.on('connect', () => {
                    clearTimeout(timeout);
                    console.log('[SocketGlasses] ✅ Conectado al servidor Socket.IO');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.setupEventListeners();
                    resolve(true);
                });

                this.socket.on('connect_error', (error) => {
                    clearTimeout(timeout);
                    console.error('[SocketGlasses] ❌ Error de conexión:', error);
                    this.isConnected = false;
                    reject(error);
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('[SocketGlasses] Desconectado:', reason);
                    this.isConnected = false;
                    this.handleReconnect();
                });
            });

        } catch (error) {
            console.error('[SocketGlasses] Error conectando:', error);
            return false;
        }
    }

    /**
     * Configurar listeners de eventos del socket
     */
    private setupEventListeners(): void {
        if (!this.socket) return;

        console.log('[SocketGlasses] 🎧 Configurando event listeners...');

        // Escuchar el evento 'analysis_complete' del nuevo servidor WebSocket
        this.socket.on('analysis_complete', (data: any) => {
            console.log('[SocketGlasses] 🎯 EVENTO ANALYSIS_COMPLETE RECIBIDO:', data);
            
            const message = this.formatAnalysisResultMessage(data.type, data.result);
            console.log('[SocketGlasses] 🔊 Mensaje formateado:', message);
            speak(message);
        });

        // Escuchar errores de análisis
        this.socket.on('analysis_error', (error: any) => {
            console.error('[SocketGlasses] ❌ ERROR DE ANÁLISIS:', error);
            speak(`Error: ${error.error || 'Error procesando imagen'}`);
        });

        // Mantener compatibilidad con eventos anteriores
        this.socket.on('analysis_result', (data: any) => {
            console.log('[SocketGlasses] 🎯 EVENTO ANALYSIS_RESULT RECIBIDO (legacy):', data);
            const message = this.formatAnalysisResultMessage(data.type, data.result);
            speak(message);
        });

        this.socket.on('description', (description: string) => {
            console.log('[SocketGlasses] 🎯 EVENTO DESCRIPTION RECIBIDO (legacy):', description);
            speak(`Veo: ${description}`);
        });

        this.socket.on('error_response', (data) => {
            console.error('[SocketGlasses] ❌ Error del servidor por Socket:', data);
            speak(`Error: ${data.message}`);
        });

        this.socket.on('notification', (data) => {
            console.log('[SocketGlasses] 🔔 Notificación:', data);
            if (data.speak) {
                speak(data.message);
            }
        });

        // Ping/pong para mantener conexión
        this.socket.on('pong', (data) => {
            console.log('[SocketGlasses] 🏓 Pong recibido:', data);
        });

        // Log de todos los eventos para debug
        this.socket.onAny((eventName, ...args) => {
            console.log('[SocketGlasses] 📡 Evento recibido:', eventName, 'con datos:', args);
        });

        console.log('[SocketGlasses] ✅ Event listeners configurados correctamente');
    }

    /**
     * Formatear mensaje según el tipo de análisis
     */
    private formatAnalysisResultMessage(type: string, result: string): string {
        switch (type) {
            case 'description':
                return `Veo: ${result}`;
            case 'text':
                return result === 'No se detectó texto' ? 'No encuentro texto en la imagen' : `Texto detectado: ${result}`;
            case 'objects':
                return result ? `Objetos identificados: ${result}` : 'No se detectaron objetos específicos';
            case 'money':
                return result.includes('No se detectó dinero') ? 'No identifico dinero en la imagen' : result;
            case 'faces':
                return `${result}`;
            case 'landmarks':
                return result === 'No se detectaron puntos de referencia' ? 'No identifico lugares conocidos' : `Lugares identificados: ${result}`;
            case 'custom':
                return `Análisis personalizado: ${result}`;
            default:
                return result;
        }
    }

    /**
     * Manejar resultados de análisis
     */
    private handleAnalysisResult(data: any): void {
        try {
            if (data.success && data.result) {
                const message = this.formatAnalysisResult(data.type, data.result);
                speak(message);
            } else {
                speak(data.message || 'No se pudo completar el análisis');
            }
        } catch (error) {
            console.error('[SocketGlasses] Error procesando resultado:', error);
        }
    }

    /**
     * Formatear resultado de análisis
     */
    private formatAnalysisResult(type: string, result: any): string {
        switch (type) {
            case 'scene_description':
                return result.description || 'Escena analizada';
            case 'text_recognition':
                return `Texto detectado: ${result.text}`;
            case 'object_detection':
                const objects = result.objects?.map((obj: any) => obj.name).join(', ');
                return objects ? `Objetos detectados: ${objects}` : 'No se detectaron objetos';
            case 'money_recognition':
                return `Billete de ${result.denomination} ${result.currency}`;
            default:
                return 'Análisis completado';
        }
    }

    /**
     * Desconectar del servidor
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.stopPing();
    }

    /**
     * Enviar comando al servidor Socket.IO
     */
    async sendCommand(action: string, data?: any): Promise<SocketResponse> {
        if (!this.isConnected || !this.socket) {
            throw new Error('No hay conexión con el servidor');
        }

        const command: SocketCommand = {
            action,
            data,
            timestamp: Date.now()
        };

        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket no disponible'));
                return;
            }

            // Timeout para la respuesta
            const timeout = setTimeout(() => {
                reject(new Error('Timeout esperando respuesta'));
            }, 15000);

            // Escuchar respuesta específica para este comando
            const responseHandler = (response: SocketResponse) => {
                clearTimeout(timeout);
                resolve(response);
            };

            // Enviar comando y esperar respuesta
            this.socket.emit('ai_command', command, responseHandler);
        });
    }

    /**
     * Reconocer imagen desde los anteojos
     */
    async recognizeImage(imageType: 'object' | 'text' | 'money' | 'document' = 'object'): Promise<string> {
        try {
            speak('Analizando imagen, por favor espera...');
            
            const response = await this.sendCommand('recognize_image', {
                type: imageType,
                source: 'glasses_stream'
            });

            if (response.success && response.data) {
                const result = this.formatRecognitionResult(imageType, response.data);
                speak(result);
                return result;
            } else {
                throw new Error(response.message || 'Error desconocido');
            }
        } catch (error) {
            const errorMsg = 'No se pudo analizar la imagen';
            speak(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Escanear texto desde los anteojos
     */
    async scanText(): Promise<string> {
        try {
            speak('Escaneando texto, mantén los anteojos enfocados...');
            
            const response = await this.sendCommand('scan_text', {
                source: 'glasses_stream',
                language: 'es'
            });

            if (response.success && response.data?.text) {
                const text = response.data.text;
                speak(`Texto detectado: ${text}`);
                return text;
            } else {
                throw new Error('No se detectó texto');
            }
        } catch (error) {
            const errorMsg = 'No se pudo escanear el texto';
            speak(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Reconocer billetes/dinero
     */
    async recognizeMoney(): Promise<string> {
        try {
            speak('Reconociendo billete, mantén enfocado...');
            
            const response = await this.sendCommand('recognize_money', {
                source: 'glasses_stream',
                currency: 'ARS' // Pesos argentinos por defecto
            });

            if (response.success && response.data) {
                const { denomination, currency, confidence } = response.data;
                const result = `Billete de ${denomination} ${currency}`;
                speak(result);
                return result;
            } else {
                throw new Error('No se detectó billete válido');
            }
        } catch (error) {
            const errorMsg = 'No se pudo reconocer el billete';
            speak(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Leer documento/texto largo
     */
    async readDocument(): Promise<string> {
        try {
            speak('Leyendo documento, por favor espera...');
            
            const response = await this.sendCommand('read_document', {
                source: 'glasses_stream',
                language: 'es',
                format: 'structured'
            });

            if (response.success && response.data?.content) {
                const content = response.data.content;
                // Leer por partes para no saturar el TTS
                this.readLongText(content);
                return content;
            } else {
                throw new Error('No se pudo leer el documento');
            }
        } catch (error) {
            const errorMsg = 'No se pudo leer el documento';
            speak(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Describir escena completa
     */
    async describeScene(): Promise<string> {
        try {
            speak('Analizando la escena...');
            
            const response = await this.sendCommand('describe_scene', {
                source: 'glasses_stream',
                detail_level: 'medium'
            });

            if (response.success && response.data?.description) {
                const description = response.data.description;
                speak(description);
                return description;
            } else {
                throw new Error('No se pudo describir la escena');
            }
        } catch (error) {
            const errorMsg = 'No se pudo describir la escena';
            speak(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Formatear resultado de reconocimiento según tipo
     */
    private formatRecognitionResult(type: string, data: any): string {
        switch (type) {
            case 'object':
                if (data.objects && data.objects.length > 0) {
                    const objects = data.objects.map((obj: any) => obj.name).join(', ');
                    return `Objetos detectados: ${objects}`;
                }
                return 'No se detectaron objetos';
            
            case 'text':
                return data.text || 'No se detectó texto';
            
            case 'money':
                return `${data.denomination} ${data.currency}`;
            
            case 'document':
                return data.content || 'Documento vacío';
            
            default:
                return 'Análisis completado';
        }
    }

    /**
     * Leer texto largo dividiéndolo en partes
     */
    private readLongText(text: string): void {
        const maxLength = 200; // Máximo caracteres por fragmento
        const sentences = text.split(/[.!?]+/);
        let currentText = '';

        sentences.forEach((sentence, index) => {
            if (currentText.length + sentence.length > maxLength) {
                if (currentText.trim()) {
                    speak(currentText.trim());
                }
                currentText = sentence;
            } else {
                currentText += sentence + (index < sentences.length - 1 ? '. ' : '');
            }
        });

        if (currentText.trim()) {
            speak(currentText.trim());
        }
    }

    /**
     * Manejar reconexión automática
     */
    private handleReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[SocketGlasses] Reintentando conexión (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                // Socket.IO maneja la reconexión automáticamente, pero podemos forzarla
                if (this.socket && !this.isConnected) {
                    this.socket.connect();
                }
            }, this.reconnectDelay);
        } else {
            console.error('[SocketGlasses] Máximo de intentos de reconexión alcanzado');
            speak('Se perdió la conexión con el servidor de análisis');
        }
    }

    /**
     * Ping periódico para mantener conexión (Socket.IO maneja esto automáticamente)
     */
    private startPing(): void {
        // Socket.IO maneja el ping automáticamente, pero podemos agregar nuestro propio heartbeat
        this.pingInterval = setInterval(() => {
            if (this.isConnected && this.socket) {
                this.socket.emit('ping', { timestamp: Date.now() });
            }
        }, 30000); // Ping cada 30 segundos
    }

    private stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Verificar estado de conexión
     */
    isSocketConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Configurar parámetros del streaming de anteojos
     */
    setGlassesStreamParams(port: number, code: string): void {
        const config = getGlassesConfig();
        
        if (config.isDebugMode && config.useSimulatedData) {
            // En debug usar parámetros simulados
            this.currentGlassesFrame = { 
                port: config.streamingConfig.simulatedPort, 
                code: config.streamingConfig.simulatedCode, 
                model: 'yolov8n' 
            };
            console.log('[SocketGlasses] DEBUG MODE: Parámetros simulados configurados:', this.currentGlassesFrame);
        } else {
            // En release usar parámetros reales
            this.currentGlassesFrame = { port, code, model: 'yolov8n' };
            console.log('[SocketGlasses] RELEASE MODE: Parámetros reales configurados:', this.currentGlassesFrame);
        }
    }

    /**
     * Iniciar análisis continuo del streaming usando endpoint del servidor
     */
    async startStreamAnalysis(analysisType: 'continuous' | 'on_command' = 'on_command'): Promise<boolean> {
        try {
            if (!this.isConnected) {
                console.error('[SocketGlasses] Socket no conectado para análisis de stream');
                return false;
            }

            if (!this.currentGlassesFrame) {
                console.error('[SocketGlasses] Parámetros de streaming no configurados');
                return false;
            }

            if (this.isStreamAnalysisActive) {
                console.log('[SocketGlasses] Análisis de stream ya activo');
                return true;
            }

            console.log('[SocketGlasses] Iniciando análisis continuo del streaming');

            if (analysisType === 'continuous') {
                // Iniciar análisis automático cada 3 segundos
                this.continuousAnalysisInterval = setInterval(() => {
                    this.analyzeCurrentStreamFrame('scene');
                }, 3000);
            }

            this.isStreamAnalysisActive = true;
            console.log('[SocketGlasses] Análisis de streaming iniciado');
            speak('Análisis de video en tiempo real activado');

            return true;

        } catch (error) {
            console.error('[SocketGlasses] Error iniciando análisis de stream:', error);
            return false;
        }
    }

    /**
     * Detener análisis de streaming
     */
    stopStreamAnalysis(): void {
        if (this.isStreamAnalysisActive) {
            if (this.continuousAnalysisInterval) {
                clearInterval(this.continuousAnalysisInterval);
                this.continuousAnalysisInterval = null;
            }
            this.isStreamAnalysisActive = false;
            console.log('[SocketGlasses] Análisis de streaming detenido');
            speak('Análisis de video desactivado');
        }
    }

    /**
     * Obtener frame actual del streaming desde servidor (método correcto para React Native)
     */
    private async getCurrentFrameFromServer(): Promise<string | null> {
        try {
            const config = getGlassesConfig();
            
            // En modo debug, generar frame simulado
            if (config.isDebugMode && config.useSimulatedData) {
                console.log('[SocketGlasses] DEBUG MODE: Generando frame simulado');
                return this.generateSimulatedFrame();
            }

            // Modo release: obtener frame real de los anteojos
            if (!this.currentGlassesFrame) {
                console.error('[SocketGlasses] Parámetros de streaming no configurados');
                return null;
            }

            console.log('[SocketGlasses] RELEASE MODE: Obteniendo frame real de anteojos');
            console.log('[SocketGlasses] Parámetros:', this.currentGlassesFrame);

            // Usar endpoint del servidor para obtener detecciones del frame actual
            const response = await axios.post(`${getEnvVar('APP_API_URL_GLASSES')}/detect_on_frame`, {
                port: this.currentGlassesFrame.port,
                code: this.currentGlassesFrame.code,
                model: this.currentGlassesFrame.model || 'yolov8n'
            }, { timeout: 10000 });

            if (response.data && response.data.frame_base64) {
                console.log('[SocketGlasses] Frame real obtenido exitosamente');
                return response.data.frame_base64;
            }

            console.warn('[SocketGlasses] No se recibió frame válido del servidor');
            return null;

        } catch (error) {
            console.error('[SocketGlasses] Error obteniendo frame del servidor:', error);
            return null;
        }
    }

    /**
     * Generar frame simulado para modo debug
     */
    private generateSimulatedFrame(): string {
        // Frame base64 simulado (imagen pequeña de prueba)
        // Esta es una imagen 1x1 pixel en base64 para pruebas
        const simulatedFrame = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        console.log('[SocketGlasses] Frame simulado generado para testing');
        return simulatedFrame;
    }

    /**
     * Analizar frame actual del streaming de los anteojos
     */
    async analyzeCurrentFrame(analysisType: 'description' | 'text' | 'objects' | 'faces' | 'landmarks' | 'money' | 'custom' = 'description', customPrompt?: string): Promise<void> {
        try {
            if (!this.currentGlassesFrame) {
                console.warn('[SocketGlasses] Parámetros de streaming no configurados');
                speak('El streaming de video no está configurado');
                return;
            }

            console.log(`[SocketGlasses] Obteniendo frame actual para análisis: ${analysisType}`);
            
            // Mensajes específicos según el tipo de análisis
            const analysisMessages = {
                description: 'Capturando imagen para descripción general...',
                text: 'Buscando texto en la imagen...',
                objects: 'Identificando objetos en la imagen...',
                faces: 'Detectando caras en la imagen...',
                landmarks: 'Buscando lugares conocidos...',
                money: 'Detectando dinero o billetes...',
                custom: customPrompt ? `Analizando: ${customPrompt}` : 'Realizando análisis personalizado...'
            };

            speak(analysisMessages[analysisType]);

            // Obtener frame actual desde el servidor de anteojos
            const frameBase64 = await this.getCurrentFrameFromServer();
            if (!frameBase64) {
                console.error('[SocketGlasses] No se pudo obtener frame del servidor');
                speak('No se pudo capturar la imagen');
                return;
            }

            // Enviar imagen por WebSocket al servidor de análisis
            await this.uploadImageForAnalysis(frameBase64, analysisType, customPrompt);

        } catch (error) {
            console.error('[SocketGlasses] Error analizando frame actual:', error);
            speak('Error al analizar la imagen');
        }
    }

    /**
     * Analizar imagen usando WebSocket (nuevo método del servidor)
     */
    private async uploadImageForAnalysis(
        imageBase64: string, 
        analysisType: 'description' | 'text' | 'objects' | 'faces' | 'landmarks' | 'money' | 'custom' = 'description',
        customPrompt?: string
    ): Promise<void> {
        try {
            if (!this.socket || !this.isConnected) {
                console.error('[SocketGlasses] Socket no conectado');
                speak('No hay conexión con el servidor');
                return;
            }

            console.log('[SocketGlasses] =================== ANÁLISIS DE IMAGEN VIA WEBSOCKET ===================');
            console.log('[SocketGlasses] 🎯 Tipo de análisis:', analysisType);
            if (customPrompt) console.log('[SocketGlasses] 💭 Prompt personalizado:', customPrompt);
            console.log('[SocketGlasses] 📸 Tamaño imagen base64:', imageBase64.length, 'caracteres');

            // Limpiar base64 (quitar prefijo data:image si existe)
            const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            console.log('[SocketGlasses] 🔄 Base64 limpiado, tamaño:', cleanBase64.length);

            // Preparar payload para WebSocket
            const payload: any = {
                image: cleanBase64,
                analysisType: analysisType,
                timestamp: Date.now()
            };

            if (customPrompt && analysisType === 'custom') {
                payload.prompt = customPrompt;
            }

            console.log('[SocketGlasses] 📋 Payload preparado para WebSocket');
            console.log('[SocketGlasses] 🚀 Enviando via socket.emit("analyze_image")...');

            const startTime = Date.now();

            // Enviar por WebSocket
            this.socket.emit('analyze_image', payload);

            console.log('[SocketGlasses] ✅ Imagen enviada por WebSocket exitosamente');
            console.log('[SocketGlasses] ⏱️ Tiempo de envío:', Date.now() - startTime, 'ms');
            console.log('[SocketGlasses] 👁️ Esperando evento "analysis_complete"...');
            console.log('[SocketGlasses] ========================================================');

        } catch (error) {
            console.error('[SocketGlasses] 💥 EXCEPCIÓN en uploadImageForAnalysis:', error);
            
            if (error instanceof Error) {
                console.error('[SocketGlasses] 💥 Tipo de error:', error.constructor.name);
                console.error('[SocketGlasses] 💥 Mensaje:', error.message);
                if (error.stack) {
                    console.error('[SocketGlasses] 💥 Stack trace:', error.stack);
                }
            } else {
                console.error('[SocketGlasses] 💥 Error desconocido:', String(error));
            }
            
            speak('Error enviando imagen al servidor');
        }
    }

    /**
     * Análisis automático continuo usando frames del servidor
     */
    private async analyzeCurrentStreamFrame(analysisType: 'scene' | 'text' | 'money' | 'objects'): Promise<void> {
        try {
            if (!this.isConnected || !this.currentGlassesFrame || !this.socket) {
                return;
            }

            const frameBase64 = await this.getCurrentFrameFromServer();
            if (!frameBase64) {
                return;
            }

            const command = {
                action: 'analyze_continuous_stream',
                data: {
                    image: frameBase64,
                    analysisType: analysisType,
                    frameId: `continuous_${Date.now()}`,
                    source: 'glasses_continuous',
                    port: this.currentGlassesFrame.port
                },
                timestamp: Date.now()
            };

            this.socket.emit('ai_analysis', command);

        } catch (error) {
            console.error('[SocketGlasses] Error en análisis continuo:', error);
        }
    }

    /**
     * Verificar si el análisis de streaming está activo
     */
    isStreamAnalysisRunning(): boolean {
        return this.isStreamAnalysisActive;
    }

    // ============= MÉTODOS ESPECÍFICOS DE ANÁLISIS =============

    /**
     * Descripción general de la escena
     */
    async describeCurrentScene(): Promise<void> {
        await this.analyzeCurrentFrame('description');
    }

    /**
     * Detectar y leer texto en la imagen
     */
    async readTextInImage(): Promise<void> {
        await this.analyzeCurrentFrame('text');
    }

    /**
     * Identificar objetos en la imagen
     */
    async identifyObjects(): Promise<void> {
        await this.analyzeCurrentFrame('objects');
    }

    /**
     * Detectar caras y emociones
     */
    async detectFaces(): Promise<void> {
        await this.analyzeCurrentFrame('faces');
    }

    /**
     * Identificar lugares conocidos
     */
    async identifyLandmarks(): Promise<void> {
        await this.analyzeCurrentFrame('landmarks');
    }

    /**
     * Detectar dinero, billetes y monedas
     */
    async detectMoney(): Promise<void> {
        await this.analyzeCurrentFrame('money');
    }

    /**
     * Análisis personalizado con prompt específico
     */
    async customAnalysis(prompt: string): Promise<void> {
        if (!prompt || prompt.trim() === '') {
            speak('Necesito que especifiques qué quieres que analice');
            return;
        }
        await this.analyzeCurrentFrame('custom', prompt);
    }

    // ============= COMANDOS DE VOZ PREDEFINIDOS =============

    /**
     * Probar conectividad a diferentes servidores
     */
    async testConnectivity(): Promise<void> {
        const servers = [
            { name: 'Desarrollo Local', url: 'http://192.168.31.254:4001' },
            { name: 'Producción AWS', url: 'http://ai-vision-backend-env.eba-mjkziv3t.us-east-2.elasticbeanstalk.com' }
        ];

        speak('Probando conectividad de servidores...');
        
        for (const server of servers) {
            try {
                console.log(`[SocketGlasses] 🔍 Probando conexión a ${server.name}...`);
                
                // Desconectar conexión actual si existe
                if (this.socket) {
                    this.disconnect();
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
                }
                
                const connected = await this.connect(server.url);
                
                if (connected) {
                    console.log(`[SocketGlasses] ✅ ${server.name} CONECTADO exitosamente`);
                    speak(`Servidor ${server.name} disponible`);
                } else {
                    console.log(`[SocketGlasses] ❌ ${server.name} NO DISPONIBLE`);
                    speak(`Servidor ${server.name} no disponible`);
                }
                
                // Desconectar después de la prueba
                this.disconnect();
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`[SocketGlasses] ❌ Error probando ${server.name}:`, error);
                speak(`Error conectando a ${server.name}`);
            }
        }
        
        // Reconectar al servidor automático
        try {
            const autoConnected = await this.connect();
            if (autoConnected) {
                speak('Reconectado al servidor automático');
            }
        } catch (error) {
            speak('Error reconectando al servidor automático');
        }
    }

    /**
     * Procesar comando de voz del usuario
     */
    async processVoiceCommand(command: string): Promise<void> {
        const normalizedCommand = command.toLowerCase().trim();
        
        console.log('[SocketGlasses] Procesando comando de voz:', normalizedCommand);

        // Comandos para descripción general
        if (normalizedCommand.includes('describe') || 
            normalizedCommand.includes('qué veo') || 
            normalizedCommand.includes('que veo') ||
            normalizedCommand.includes('escena')) {
            await this.describeCurrentScene();
            return;
        }

        // Comandos para lectura de texto
        if (normalizedCommand.includes('leer') || 
            normalizedCommand.includes('texto') ||
            normalizedCommand.includes('letras')) {
            await this.readTextInImage();
            return;
        }

        // Comandos para identificación de objetos
        if (normalizedCommand.includes('objetos') || 
            normalizedCommand.includes('cosas') ||
            normalizedCommand.includes('elementos')) {
            await this.identifyObjects();
            return;
        }

        // Comandos para detección de caras
        if (normalizedCommand.includes('caras') || 
            normalizedCommand.includes('personas') ||
            normalizedCommand.includes('gente')) {
            await this.detectFaces();
            return;
        }

        // Comandos para lugares
        if (normalizedCommand.includes('lugar') || 
            normalizedCommand.includes('dónde') ||
            normalizedCommand.includes('donde') ||
            normalizedCommand.includes('edificio')) {
            await this.identifyLandmarks();
            return;
        }

        // Comandos para dinero
        if (normalizedCommand.includes('dinero') || 
            normalizedCommand.includes('billete') ||
            normalizedCommand.includes('billetes') ||
            normalizedCommand.includes('moneda') ||
            normalizedCommand.includes('monedas') ||
            normalizedCommand.includes('plata') ||
            normalizedCommand.includes('efectivo')) {
            await this.detectMoney();
            return;
        }

        // Comando personalizado
        if (normalizedCommand.startsWith('analiza ') || 
            normalizedCommand.startsWith('busca ') ||
            normalizedCommand.startsWith('encuentra ')) {
            const prompt = normalizedCommand.replace(/^(analiza|busca|encuentra)\s+/, '');
            await this.customAnalysis(prompt);
            return;
        }

        // Si no se reconoce el comando, usar descripción general
        console.log('[SocketGlasses] Comando no reconocido, usando descripción general');
        await this.describeCurrentScene();
    }
}

export default new SocketGlassesService();