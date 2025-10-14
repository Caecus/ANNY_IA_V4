import axios from 'axios';
import * as Speech from 'expo-speech';
import { getEnvVar } from '../utils/env';

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

class SocketGlassesService {
    private socket: WebSocket | null = null;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 2000;
    private pingInterval: NodeJS.Timeout | null = null;
    private continuousAnalysisInterval: NodeJS.Timeout | null = null;
    private isStreamAnalysisActive: boolean = false;
    private currentGlassesFrame: GlassesFrame | null = null;

    /**
     * Conectar al servidor de sockets para comandos avanzados
     */
    async connect(serverUrl: string): Promise<boolean> {
        try {
            if (this.socket && this.isConnected) {
                console.log('[SocketGlasses] Ya conectado al servidor');
                return true;
            }

            console.log('[SocketGlasses] Conectando a:', serverUrl);
            
            this.socket = new WebSocket(serverUrl);

            return new Promise((resolve, reject) => {
                if (!this.socket) {
                    reject(new Error('Socket no inicializado'));
                    return;
                }

                this.socket.onopen = () => {
                    console.log('[SocketGlasses] Conectado al servidor');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.startPing();
                    resolve(true);
                };

                this.socket.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.socket.onclose = () => {
                    console.log('[SocketGlasses] Conexión cerrada');
                    this.isConnected = false;
                    this.stopPing();
                    this.handleReconnect();
                };

                this.socket.onerror = (error) => {
                    console.error('[SocketGlasses] Error de conexión:', error);
                    this.isConnected = false;
                    reject(error);
                };

                // Timeout para la conexión
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Timeout de conexión'));
                    }
                }, 10000);
            });
        } catch (error) {
            console.error('[SocketGlasses] Error conectando:', error);
            return false;
        }
    }

    /**
     * Desconectar del servidor
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected = false;
        this.stopPing();
    }

    /**
     * Enviar comando al servidor
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
            try {
                this.socket?.send(JSON.stringify(command));
                
                // Esperar respuesta (implementar timeout)
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout esperando respuesta'));
                }, 15000);

                // Manejar respuesta (simplificado - en implementación real usar IDs únicos)
                const handleResponse = (response: SocketResponse) => {
                    clearTimeout(timeout);
                    resolve(response);
                };

                // Guardar callback para manejar respuesta
                // En implementación real, usar un sistema de callbacks por ID
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Reconocer imagen desde los anteojos
     */
    async recognizeImage(imageType: 'object' | 'text' | 'money' | 'document' = 'object'): Promise<string> {
        try {
            Speech.speak('Analizando imagen, por favor espera...');
            
            const response = await this.sendCommand('recognize_image', {
                type: imageType,
                source: 'glasses_stream'
            });

            if (response.success && response.data) {
                const result = this.formatRecognitionResult(imageType, response.data);
                Speech.speak(result);
                return result;
            } else {
                throw new Error(response.message || 'Error desconocido');
            }
        } catch (error) {
            const errorMsg = 'No se pudo analizar la imagen';
            Speech.speak(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Escanear texto desde los anteojos
     */
    async scanText(): Promise<string> {
        try {
            Speech.speak('Escaneando texto, mantén los anteojos enfocados...');
            
            const response = await this.sendCommand('scan_text', {
                source: 'glasses_stream',
                language: 'es'
            });

            if (response.success && response.data?.text) {
                const text = response.data.text;
                Speech.speak(`Texto detectado: ${text}`);
                return text;
            } else {
                throw new Error('No se detectó texto');
            }
        } catch (error) {
            const errorMsg = 'No se pudo escanear el texto';
            Speech.speak(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Reconocer billetes/dinero
     */
    async recognizeMoney(): Promise<string> {
        try {
            Speech.speak('Reconociendo billete, mantén enfocado...');
            
            const response = await this.sendCommand('recognize_money', {
                source: 'glasses_stream',
                currency: 'ARS' // Pesos argentinos por defecto
            });

            if (response.success && response.data) {
                const { denomination, currency, confidence } = response.data;
                const result = `Billete de ${denomination} ${currency}`;
                Speech.speak(result);
                return result;
            } else {
                throw new Error('No se detectó billete válido');
            }
        } catch (error) {
            const errorMsg = 'No se pudo reconocer el billete';
            Speech.speak(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Leer documento/texto largo
     */
    async readDocument(): Promise<string> {
        try {
            Speech.speak('Leyendo documento, por favor espera...');
            
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
            Speech.speak(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Describir escena completa
     */
    async describeScene(): Promise<string> {
        try {
            Speech.speak('Analizando la escena...');
            
            const response = await this.sendCommand('describe_scene', {
                source: 'glasses_stream',
                detail_level: 'medium'
            });

            if (response.success && response.data?.description) {
                const description = response.data.description;
                Speech.speak(description);
                return description;
            } else {
                throw new Error('No se pudo describir la escena');
            }
        } catch (error) {
            const errorMsg = 'No se pudo describir la escena';
            Speech.speak(errorMsg);
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
                    Speech.speak(currentText.trim());
                }
                currentText = sentence;
            } else {
                currentText += sentence + (index < sentences.length - 1 ? '. ' : '');
            }
        });

        if (currentText.trim()) {
            Speech.speak(currentText.trim());
        }
    }

    /**
     * Manejar mensajes del servidor
     */
    private handleMessage(data: string): void {
        try {
            const message = JSON.parse(data);
            console.log('[SocketGlasses] Mensaje recibido:', message);
            
            // Manejar diferentes tipos de mensajes
            switch (message.type) {
                case 'notification':
                    if (message.speak) {
                        Speech.speak(message.message);
                    }
                    break;
                
                case 'error':
                    console.error('[SocketGlasses] Error del servidor:', message.message);
                    break;
                
                default:
                    // Manejar respuestas a comandos
                    break;
            }
        } catch (error) {
            console.error('[SocketGlasses] Error procesando mensaje:', error);
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
                // Aquí necesitarías la URL del servidor guardada
                // this.connect(lastServerUrl);
            }, this.reconnectDelay);
        } else {
            console.error('[SocketGlasses] Máximo de intentos de reconexión alcanzado');
            Speech.speak('Se perdió la conexión con el servidor de análisis');
        }
    }

    /**
     * Ping periódico para mantener conexión
     */
    private startPing(): void {
        this.pingInterval = setInterval(() => {
            if (this.isConnected && this.socket) {
                this.socket.send(JSON.stringify({ action: 'ping', timestamp: Date.now() }));
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
        this.currentGlassesFrame = { port, code, model: 'yolov8n' };
        console.log('[SocketGlasses] Parámetros de stream configurados:', this.currentGlassesFrame);
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
            Speech.speak('Análisis de video en tiempo real activado');

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
            Speech.speak('Análisis de video desactivado');
        }
    }

    /**
     * Obtener frame actual del streaming desde servidor (método correcto para React Native)
     */
    private async getCurrentFrameFromServer(): Promise<string | null> {
        try {
            if (!this.currentGlassesFrame) {
                console.error('[SocketGlasses] Parámetros de streaming no configurados');
                return null;
            }

            // Usar endpoint del servidor para obtener detecciones del frame actual
            const response = await axios.post(`${getEnvVar('APP_API_URL_GLASSES')}/detect_on_frame`, {
                port: this.currentGlassesFrame.port,
                code: this.currentGlassesFrame.code,
                model: this.currentGlassesFrame.model || 'yolov8n'
            }, { timeout: 10000 });

            if (response.data && response.data.frame_base64) {
                return response.data.frame_base64;
            }

            return null;

        } catch (error) {
            console.error('[SocketGlasses] Error obteniendo frame del servidor:', error);
            return null;
        }
    }

    /**
     * Analizar frame actual del streaming de los anteojos
     */
    async analyzeCurrentFrame(analysisType: 'scene' | 'text' | 'money' | 'objects' = 'scene'): Promise<void> {
        try {
            if (!this.currentGlassesFrame) {
                console.warn('[SocketGlasses] Parámetros de streaming no configurados');
                Speech.speak('El streaming de video no está configurado');
                return;
            }

            if (!this.isConnected || !this.socket) {
                console.warn('[SocketGlasses] Socket no conectado');
                Speech.speak('Conexión al servidor no disponible');
                return;
            }

            console.log(`[SocketGlasses] Obteniendo frame actual para análisis: ${analysisType}`);
            Speech.speak('Capturando imagen actual...');

            // Obtener frame actual desde el servidor de anteojos
            const frameBase64 = await this.getCurrentFrameFromServer();
            if (!frameBase64) {
                console.error('[SocketGlasses] No se pudo obtener frame del servidor');
                Speech.speak('No se pudo capturar la imagen');
                return;
            }

            let action = '';
            switch (analysisType) {
                case 'scene':
                    action = 'describe_scene';
                    break;
                case 'text':
                    action = 'scan_text';
                    break;
                case 'money':
                    action = 'recognize_money';
                    break;
                case 'objects':
                    action = 'recognize_image';
                    break;
                default:
                    action = 'describe_scene';
            }

            const command: SocketCommand = {
                action: action,
                data: {
                    image: frameBase64,
                    frameId: `glasses_frame_${Date.now()}`,
                    source: 'glasses_stream',
                    port: this.currentGlassesFrame.port,
                    code: this.currentGlassesFrame.code
                },
                timestamp: Date.now()
            };

            this.socket.send(JSON.stringify(command));
            console.log(`[SocketGlasses] Frame enviado para análisis: ${action}`);
            Speech.speak('Analizando imagen actual');

        } catch (error) {
            console.error('[SocketGlasses] Error analizando frame actual:', error);
            Speech.speak('Error al analizar la imagen');
        }
    }

    /**
     * Análisis automático continuo usando frames del servidor
     */
    private async analyzeCurrentStreamFrame(analysisType: 'scene' | 'text' | 'money' | 'objects'): Promise<void> {
        try {
            if (!this.isConnected || !this.currentGlassesFrame) {
                return;
            }

            const frameBase64 = await this.getCurrentFrameFromServer();
            if (!frameBase64) {
                return;
            }

            const command: SocketCommand = {
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

            if (this.socket) {
                this.socket.send(JSON.stringify(command));
            }

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
}

export default new SocketGlassesService();