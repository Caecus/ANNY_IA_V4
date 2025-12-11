/**
 * Configuración del servicio de reconocimiento visual
 * 
 * IMPORTANTE:
 * - En desarrollo local (emulador): usa 'localhost' o '10.0.2.2' (Android)
 * - En dispositivo físico: usa la IP de tu computadora (misma red WiFi)
 * - Para obtener tu IP:
 *   - Windows: ejecuta 'ipconfig' en CMD
 *   - Mac/Linux: ejecuta 'ifconfig' en terminal
 *   - Busca la IP de tu adaptador WiFi (ej: 192.168.1.100)
 */

// Configuración por defecto
export const RECOGNITION_CONFIG = {
  // Desarrollo local con emulador
  localhost: 'http://localhost:4000',
  
  // Android emulator
  androidEmulator: 'http://10.0.2.2:4000',
  
  // Dispositivo físico (CAMBIAR POR TU IP)
  physical: 'http://192.168.1.100:4000',
  
  // Producción (cuando despliegues el backend)
  production: 'http://vision-ai-service-env.eba-jfqhpms9.us-east-2.elasticbeanstalk.com',
};

/**
 * URL activa del servidor
 * Cambia esta línea según tu entorno:
 * - RECOGNITION_CONFIG.localhost (emulador iOS)
 * - RECOGNITION_CONFIG.androidEmulator (emulador Android)
 * - RECOGNITION_CONFIG.physical (dispositivo físico)
 * - RECOGNITION_CONFIG.production (producción)
 */
export const ACTIVE_SERVER_URL = RECOGNITION_CONFIG.localhost;

// Configuración adicional
export const RECOGNITION_SETTINGS = {
  // Timeout para peticiones REST (en ms)
  requestTimeout: 30000,
  
  // Idioma por defecto
  defaultLanguage: 'es',
  
  // Región de billetes por defecto
  defaultCurrencyRegion: 'LATAM',
  
  // Modo de descripción de escena por defecto
  defaultSceneMode: 'general' as 'general' | 'seguridad' | 'interior' | 'exterior',
  
  // Habilitar logs de debug
  enableDebugLogs: true,
  
  // Reconexión automática de WebSocket
  enableAutoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 2000,
};
