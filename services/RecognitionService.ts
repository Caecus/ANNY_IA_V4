import { GlassesContextProps } from '@/context/GlassesContext';
// RecognitionService.ts
// Servicio de reconocimiento visual usando REST API y WebSocket
import * as FileSystem from 'expo-file-system';
import { speak } from './speaker';

// ===========================
// TIPOS DE DATOS
// ===========================

type SceneMode = 'general' | 'seguridad' | 'interior' | 'exterior';

interface OCRResult {
  text: string;
  description: string;
  confidence: number;
  lang: string;
  lines: Array<{
    text: string;
    confidence: number;
    bbox?: { x: number; y: number; width: number; height: number };
  }>;
  processingTime: number;
  tts?: string;
}

interface SceneDescription {
  description: string;
  objects: string[];
  colors: string[];
  confidence: number;
  mode: SceneMode;
  processingTime: number;
  tts?: string;
}

interface CurrencyResult {
  description: string;
  currency: string;
  value: number;
  region: string;
  confidence: number;
  processingTime: number;
  tts?: string;
}

interface StreamMessage {
  type: 'ocr' | 'scene' | 'currency';
  data: OCRResult | SceneDescription | CurrencyResult;
  timestamp: number;
}

// ===========================
// SERVICIO DE RECONOCIMIENTO
// ===========================

class RecognitionService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private baseUrl: string = 'http://vision-ai-service-env.eba-jfqhpms9.us-east-2.elasticbeanstalk.com';
  private wsUrl: string = 'ws://vision-ai-service-env.eba-jfqhpms9.us-east-2.elasticbeanstalk.com/v1/stream';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor() {
    // No auto-conectar, dejar que la app controle cuándo conectar
  }

  // ===========================
  // CONFIGURACIÓN
  // ===========================

  /**
   * Configura la URL del servidor
   * @param url URL base del servidor (ej: 'http://192.168.1.100:4000')
   */
  setServerUrl(url: string): void {
    this.baseUrl = url;
    this.wsUrl = url.replace('http://', 'ws://').replace('https://', 'wss://') + '/v1/stream';
    console.log('[RECOGNITION] URLs configuradas:', { rest: this.baseUrl, ws: this.wsUrl });
  }

  /**
   * Verifica si el servidor está disponible
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      console.log('[RECOGNITION] Health check:', data);
      return data.ok === true;
    } catch (error) {
      console.error('[RECOGNITION] Health check error:', error);
      return false;
    }
  }

  /**
   * Procesa reconocimiento usando los anteojos conectados
   * @param apiType 'ocr' | 'describe' | 'currency'
   * @param glasses contexto actual de Glasses
   * @returns resultado en formato compatible con backend
   */
  async analyzeFromGlasses(apiType: 'ocr' | 'describe' | 'currency', glasses: GlassesContextProps): Promise<any> {
    try {
      if (!glasses.getGlassesActive()) throw new Error('Anteojos no conectados');
      const imageUrl = glasses.glassesGetCurrentImageUrl();
      if (!imageUrl) {
        speak('No se pudo obtener la imagen actual de los anteojos');
        return null;
      }
      // Los métodos pueden devolver solo texto o una imagen (URI/base64)
      if (apiType === 'ocr') {
        // Si el método devuelve una imagen, procesarla aquí
        await this.recognizeText(imageUrl);
      } else if (apiType === 'describe') {
        await this.describeScene(imageUrl);
      } else if (apiType === 'currency') {
        await this.identifyCurrency(imageUrl);
      }
    } catch (err) {
      console.error('[RECOGNITION] Error usando anteojos:', err);
      return null;
    }
  }

  // ===========================
  // REST API - OCR
  // ===========================

  /**
   * Reconocimiento de texto (OCR) usando REST API
   * @param imageUri URI de la imagen (desde expo-camera)
   * @param lang Idioma del texto ('es', 'en', etc.)
   * @param layout Preservar estructura del texto
   */
  async recognizeText(imageUri: string, lang: string = 'es', layout: boolean = false): Promise<OCRResult | null> {
    try {
      console.log('[RECOGNITION TEXT] OCR iniciado:', { lang, layout, uri: imageUri });
      speak('Procesando texto, por favor espera');

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg'
      } as any);
      formData.append('prompt', 'Describe TODO el texto que hay en la imagen');

      console.log('[RECOGNITION TEXT] Enviando request a:', `${this.baseUrl}/v1/images/describe`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${this.baseUrl}/v1/images/describe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // ⚠️ NO incluir Content-Type, fetch lo maneja automáticamente con FormData
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      console.log('[RECOGNITION TEXT] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RECOGNITION TEXT] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: OCRResult = await response.json();
      console.log('[RECOGNITION TEXT] OCR completado:', result);

        if (result.description.includes('Lo siento, pero no puedo describir la imagen') || result.description.includes('Lo siento, ')) {
        speak('Lo lamentamos pero el texto no puede ser procesado en este momento, intenta nuevamente más tarde.');
        return null;
      }
      if (result.description) {
        speak(result.description);
      }

      return result;
    } catch (error) {
      console.error('[RECOGNITION TEXT] Error en OCR:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          speak('Timeout: El servidor tardó demasiado');
        } else if (error.message.includes('Network request failed')) {
          speak('Error de red: No se puede conectar al servidor');
        } else {
          speak(`Error al reconocer texto: ${error.message}`);
        }
      } else {
        speak('Error al reconocer texto');
      }
      return null;
    }
  }

  // ===========================
  // REST API - DESCRIPCIÓN DE ESCENA
  // ===========================

  /**
   * Descripción de escena usando REST API
   * @param imageUri URI de la imagen
   * @param lang Idioma de la descripción
   * @param mode Modo de descripción (general, seguridad, interior, exterior)
   */
  async describeScene(
    imageUri: string
  ): Promise<SceneDescription | null> {
    try {
      console.log('[RECOGNITION SCENE] Descripción iniciada:', { uri: imageUri });
      speak('Analizando entorno, por favor espera');

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg'
      } as any);
      formData.append('prompt', 'Describe la imagen dando contexto de qué hay en ella y todos los detalles posibles');

      console.log('[RECOGNITION SCENE] Enviando request a:', `${this.baseUrl}/v1/images/describe`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${this.baseUrl}/v1/images/describe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // ⚠️ NO incluir Content-Type, fetch lo maneja automáticamente con FormData
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      console.log('[RECOGNITION SCENE] Response status:', response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RECOGNITION SCENE] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: SceneDescription = await response.json();
      console.log('[RECOGNITION SCENE] Descripción completada:', result);

      if (result.description.includes('Lo siento, pero no puedo describir la imagen') || result.description.includes('Lo siento, ')) {
        speak('Lo lamentamos pero la imagen no puede ser procesada en este momento, intenta nuevamente más tarde.');
        return null;
      }
      if (result.description) {
        speak(result.description);
      }

      return result;
    } catch (error) {
      console.error('[RECOGNITION SCENE] Error en descripción:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          speak('Timeout: El servidor tardó demasiado');
        } else if (error.message.includes('Network request failed')) {
          speak('Error de red: No se puede conectar al servidor');
        } else {
          speak(`Error al analizar entorno: ${error.message}`);
        }
      } else {
        speak('Error al analizar entorno');
      }
      return null;
    }
  }

  // ===========================
  // REST API - IDENTIFICACIÓN DE BILLETES
  // ===========================

  /**
   * Identificación de billetes usando REST API
   * @param imageUri URI de la imagen
   * @param region Región del billete (US, EU, LATAM)
   */
  async identifyCurrency(imageUri: string, region: string = 'LATAM'): Promise<CurrencyResult | null> {
    try {
      console.log('[RECOGNITION] Descripción iniciada:', { uri: imageUri });
      speak('Analizando billetes o monedas, por favor espera');

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg'
      } as any);
      formData.append('prompt', 'Describe los billetes o monedas en la imagen, indicando montos y moneda (Pais)');

      console.log('[RECOGNITION CURRENCY] Enviando request a:', `${this.baseUrl}/v1/images/describe`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${this.baseUrl}/v1/images/describe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // ⚠️ NO incluir Content-Type, fetch lo maneja automáticamente con FormData
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      console.log('[RECOGNITION CURRENCY] Response status:', response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RECOGNITION CURRENCY] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: CurrencyResult = await response.json();
      console.log('[RECOGNITION CURRENCY] Descripción completada:', result);

      if (result.description.includes('Lo siento, pero no puedo describir la imagen') || result.description.includes('Lo siento, ')) {
        speak('Lo lamentamos pero la imagen no puede ser procesada en este momento, intenta nuevamente más tarde.');
        return null;
      }
      if (result.description) {
        speak(result.description);
      }

      return result;
    } catch (error) {
      console.error('[RECOGNITION CURRENCY] Error en descripción:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          speak('Timeout: El servidor tardó demasiado');
        } else if (error.message.includes('Network request failed')) {
          speak('Error de red: No se puede conectar al servidor');
        } else {
          speak(`Error al analizar entorno: ${error.message}`);
        }
      } else {
        speak('Error al analizar entorno');
      }
      return null;
    }
  }

  // ===========================
  // WEBSOCKET - STREAMING
  // ===========================

  /**
   * Conecta al WebSocket para streaming en tiempo real
   */
  async connectWebSocket(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        console.log('[RECOGNITION] Conectando a WebSocket:', this.wsUrl);

        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('[RECOGNITION] WebSocket conectado');
          speak('Streaming conectado');
          resolve(true);
        };

        this.ws.onerror = (error) => {
          console.error('[RECOGNITION] WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('[RECOGNITION] WebSocket cerrado');
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              console.log(`[RECOGNITION] Reintento ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
              this.connectWebSocket();
            }, this.reconnectDelay);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const message: StreamMessage = JSON.parse(event.data);
            console.log('[RECOGNITION] WebSocket mensaje:', message);
            
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
              handler(message.data);
            }

            const data: any = message.data;
            if (data.tts) {
              speak(data.tts);
            }
          } catch (error) {
            console.error('[RECOGNITION] Error procesando mensaje:', error);
          }
        };

      } catch (error) {
        console.error('[RECOGNITION] Error creando WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Desconecta el WebSocket
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    console.log('[RECOGNITION] WebSocket desconectado');
  }

  /**
   * Registra un handler para un tipo de mensaje
   * @param type Tipo de mensaje ('ocr', 'scene', 'currency')
   * @param handler Función que procesa el resultado
   */
  onMessage(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Elimina un handler de mensajes
   * @param type Tipo de mensaje
   */
  offMessage(type: string): void {
    this.messageHandlers.delete(type);
  }

  // ===========================
  // MÉTODO AUXILIAR: CONVERSIÓN BASE64 → ARCHIVO
  // ===========================

  /**
   * Convierte base64 a archivo temporal y llama al método REST correspondiente
   * @param base64Image Imagen en base64 (con o sin prefijo data:image)
   * @param apiType Tipo de API ('ocr', 'describe', 'currency')
   * @param options Opciones adicionales
   */
  async sendImageForRecognition(
    base64Image: string,
    apiType: 'ocr' | 'describe' | 'currency',
    options?: { lang?: string; mode?: SceneMode; region?: string; layout?: boolean }
  ): Promise<any> {
    try {
      console.log('[RECOGNITION] 📥 Preparando imagen para:', apiType, 'Base64 length:', base64Image.length);
      const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const tempPath = `${FileSystem.cacheDirectory}temp_recognition.jpg`;
      await FileSystem.writeAsStringAsync(tempPath, cleanBase64, {
        encoding: FileSystem.EncodingType.Base64
      });

      console.log('[RECOGNITION] ✅ Archivo temporal creado:', tempPath);
      
      // Verificar que el archivo existe
      const fileInfo = await FileSystem.getInfoAsync(tempPath);
      console.log('[RECOGNITION] 📄 Archivo existe:', fileInfo.exists, 'Tamaño:', fileInfo.exists ? (fileInfo as any).size : 0);

      if (!fileInfo.exists) {
        throw new Error('El archivo temporal no se creó correctamente');
      }

      console.log('[RECOGNITION] 🚀 Llamando a método REST:', apiType);

      let result = null;

      switch (apiType) {
        case 'ocr':
          result = await this.recognizeText(tempPath, options?.lang, options?.layout);
          break;
        case 'describe':
          result = await this.describeScene(tempPath);
          break;
        case 'currency':
          result = await this.identifyCurrency(tempPath, options?.region);
          break;
      }

      console.log('[RECOGNITION] 🎯 Resultado recibido:', result ? 'OK' : 'NULL');

      await FileSystem.deleteAsync(tempPath, { idempotent: true });
      console.log('[RECOGNITION] 🗑️  Archivo temporal eliminado');

      return result;
    } catch (error) {
      console.error('[RECOGNITION] ❌ Error en sendImageForRecognition:', error);
      return null;
    }
  }
}

export default new RecognitionService();