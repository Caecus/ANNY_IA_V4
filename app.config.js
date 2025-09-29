import 'dotenv/config';

function warnIfMissing(key, fallback) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.warn(`⚠️  [app.config.js] La variable de entorno ${key} no está definida. Usando valor por defecto: ${fallback}`);
    return fallback;
  }
  return process.env[key];
}

export default {
    expo: {
        name: "ANNY_IA_V4",
        slug: "ANNY_IA_V4",
        version: "1.0.0",
        android: {
            package: "com.caecus.anny_ia_v4",
        },
        extra: {
            eas: {
                projectId: "156e6c14-54e2-4deb-86fe-c96552cc6471"
            },
            APP_API_URL: warnIfMissing('APP_API_URL', 'http://3.15.63.191:7003'),
            APP_API_URL_PORT: warnIfMissing('APP_API_URL_PORT', 'http://3.15.63.191:7003/api'),
            APP_API_URL_TWO: warnIfMissing('APP_API_URL_TWO', 'http://3.15.63.191/apitwo'),
            APP_API_URL_GLASSES: warnIfMissing('APP_API_URL_GLASSES', 'http://3.15.63.191:7006'),
            APP_API_URL_INTERSECTIONS: warnIfMissing('APP_API_URL_INTERSECTIONS', 'http://3.15.63.191:7008'),
            GOOGLE_MAP_KEY: warnIfMissing('GOOGLE_MAP_KEY', 'AIzaSyA9z3Vopcf3z9BMYZKpwMCnGX8zCkmpcnk'),
            ONESIGNAL_APP_ID: warnIfMissing('ONESIGNAL_APP_ID', '5dcbdd4d-f28b-4a3a-98ff-37f6629038d8'),
            KAIROS_API_KEY: warnIfMissing('KAIROS_API_KEY', 'a9f8262bb43e8b71d47d30e5f8248902'),
            GPS_HIGH_ACCURACY: warnIfMissing('GPS_HIGH_ACCURACY', 'false'),
        }
    }
};