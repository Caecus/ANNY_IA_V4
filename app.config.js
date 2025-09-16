import 'dotenv/config';

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
            APP_API_URL: process.env.APP_API_URL,
            APP_API_URL_PORT: process.env.APP_API_URL_PORT,
            APP_API_URL_TWO: process.env.APP_API_URL_TWO,
            APP_API_URL_GLASSES: process.env.APP_API_URL_GLASSES,
            APP_API_URL_INTERSECTIONS: process.env.APP_API_URL_INTERSECTIONS,
            GOOGLE_MAP_KEY: process.env.GOOGLE_MAP_KEY,
            ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID,
            KAIROS_API_KEY: process.env.KAIROS_API_KEY,
            GPS_HIGH_ACCURACY: process.env.GPS_HIGH_ACCURACY,
        }
    }
};