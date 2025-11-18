// RecognitionService.ts
// Servicio avanzado para enviar imágenes y comandos al backend de AI por socket y recibir resultados
import { speak } from 'expo-speech';
import { io, Socket } from 'socket.io-client';
import { getSocketAIUrl } from '../utils/env';

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

class RecognitionService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private continuousAnalysisInterval: NodeJS.Timeout | null = null;
  private isStreamAnalysisActive: boolean = false;
  private currentGlassesFrame: GlassesFrame | null = null;

  constructor() {
    this.connect();
  }

  async connect(serverUrl?: string): Promise<boolean> {
    try {
      if (this.socket && this.isConnected) return true;
      const socketUrl = serverUrl || getSocketAIUrl();
      console.log('[SOCKET] Conectando a:', socketUrl);
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });
      return new Promise((resolve, reject) => {
        if (!this.socket) return reject(new Error('Socket no inicializado'));
        const timeout = setTimeout(() => reject(new Error('Timeout de conexión')), 10000);
        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.setupEventListeners();
          console.log('[SOCKET] Conectado correctamente');
          resolve(true);
        });
        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          this.isConnected = false;
          console.error('[SOCKET] Error de conexión:', error);
          reject(error);
        });
        this.socket.on('disconnect', () => {
          this.isConnected = false;
          console.warn('[SOCKET] Desconectado');
        });
      });
    } catch (error) {
      console.error('[SOCKET] Error en connect:', error);
      return false;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;
    this.socket.on('analysis_complete', (data: any) => {
      console.log('[SOCKET] analysis_complete:', data);
      speak(data.result || 'Reconocimiento completado');
    });
    this.socket.on('analysis_error', (error: any) => {
      console.error('[SOCKET] analysis_error:', error);
      speak(`Error: ${error.error || 'Error procesando imagen'}`);
    });
    this.socket.on('analysis_result', (data: any) => {
      console.log('[SOCKET] analysis_result:', data);
      speak(data.result || 'Reconocimiento completado');
    });
    this.socket.on('description', (description: string) => {
      console.log('[SOCKET] description:', description);
      speak(`Veo: ${description}`);
    });
    this.socket.on('error_response', (data) => {
      console.error('[SOCKET] error_response:', data);
      speak(`Error: ${data.message}`);
    });
    this.socket.on('notification', (data) => {
      console.log('[SOCKET] notification:', data);
      if (data.speak) speak(data.message);
    });
    this.socket.on('pong', () => {
      console.log('[SOCKET] pong');
    });
    this.socket.onAny((eventName, ...args) => {
      console.log('[SOCKET] Evento recibido:', eventName, args);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  async sendImageForRecognition(base64Image: string, analysisType: string = 'description', prompt?: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      console.error('[SOCKET] No hay conexión con el servidor');
      speak('No hay conexión con el servidor');
      return;
    }
    const cleanBase64 = base64Image.replace(/^data:image\/[[a-z]+;base64,/, '');
    const payload: any = {
      image: cleanBase64,
      analysisType,
      timestamp: Date.now()
    };
    if (prompt && analysisType === 'custom') payload.prompt = prompt;
    console.log('[SOCKET] Enviando imagen para análisis:', { analysisType, prompt, size: cleanBase64.length });
    this.socket.emit('analyze_image', payload);
  }

  /**
   * Realiza el análisis según el tipo solicitado, usando la imagen actual de los anteojos.
   * @param analysisType Tipo de análisis: 'description', 'text', 'objects', 'money', 'landmarks', 'custom'
   * @param prompt Prompt personalizado (solo para 'custom')
   */
  async analyzeFromGlasses(analysisType: string = 'description', prompt?: string): Promise<void> {
    console.log(`[RECOGNITION] analyzeFromGlasses: obteniendo frame de anteojos para '${analysisType}'`);
    const frame = await this.getCurrentFrameFromServer();
    await this.sendImageForRecognition(frame, analysisType, prompt);
  }

  // Obtener frame actual del streaming desde servidor (simulado o real)
  private async getCurrentFrameFromServer(): Promise<string> {
    // Aquí debes integrar la lógica real de obtención de frame desde los anteojos
    // Por ahora retorna una imagen vacía o simulada
    console.log('[RECOGNITION] getCurrentFrameFromServer: obteniendo frame de anteojos');
    return '';
  }

  // Otros métodos avanzados pueden agregarse aquí según necesidades
}

export default new RecognitionService();