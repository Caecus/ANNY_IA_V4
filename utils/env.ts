import Constants from 'expo-constants';

// Helper para obtener variables de entorno compatible con Expo Go y web
export function getEnvVar(key: string): string | undefined {
  // Usa expo-constants (Expo Go y builds EAS)
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key]) return Constants.expoConfig.extra[key];
  // Usa process.env (web)
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  return undefined;
}