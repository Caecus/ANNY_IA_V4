import Constants from 'expo-constants';

// Helper para obtener variables de entorno compatible con Expo Go y web
export function getEnvVar(key: string): string | undefined {
  // Usa expo-constants (Expo Go y builds EAS)
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key]) return Constants.expoConfig.extra[key];
  // Usa process.env (web)
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  return undefined;
}

// Detectar si estamos en modo debug o release
export function isDebugMode(): boolean {
  // En Expo, __DEV__ indica modo desarrollo
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__;
  }
  
  // Fallback: revisar si estamos en desarrollo basado en Constants
  if (Constants?.expoConfig?.extra?.isDev !== undefined) {
    return Constants.expoConfig.extra.isDev;
  }
  
  // Por defecto asumir desarrollo si no podemos determinarlo
  return true;
}

// Configuración específica para debug/release
export function getGlassesConfig() {
  const isDebug = isDebugMode();
  
  return {
    isDebugMode: isDebug,
    // En debug usamos datos simulados, en release datos reales
    useSimulatedData: isDebug,
    // Configuraciones específicas por modo
    bluetoothConfig: {
      autoConnect: !isDebug, // En debug no conectar automáticamente
      requireRealDevice: !isDebug, // En release requerir dispositivo real
      simulatedDeviceId: 'DEBUG_CAECUS_001'
    },
    streamingConfig: {
      simulatedPort: 8080,
      simulatedCode: 'DEBUG_CODE_123',
      realTimeAnalysis: !isDebug // En release activar análisis en tiempo real
    }
  };
}

// Obtener URL del servidor Socket AI basado en el entorno
export function getSocketAIUrl(): string {
  const isDebug = isDebugMode();
  
  // // En desarrollo, usar servidor local
  if (isDebug) {
    const devUrl = getEnvVar('APP_SOCKET_AI_URL_DEVELOPMENT') || getEnvVar('APP_SOCKET_AI_URL');
    console.log('[ENV] Usando servidor Socket AI de DESARROLLO:', devUrl);
    return devUrl || 'http://192.168.31.254:4001';
  }
  
  // En producción, usar servidor AWS
  const prodUrl = getEnvVar('APP_SOCKET_AI_URL_PRODUCTION');
  console.log('[ENV] Usando servidor Socket AI de PRODUCCIÓN:', prodUrl);
  return prodUrl || 'http://ai-vision-backend-env.eba-mjkziv3t.us-east-2.elasticbeanstalk.com';
}