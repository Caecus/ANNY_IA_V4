// services/wifiService.js
import { PermissionsAndroid, Platform } from 'react-native';
import {
    ConnectGlassesPayload,
    ConnectGlassesResponse,
    DisconnectGlassesResponse,
    HelloGlassesWifi,
    PostResolutionPayload,
    PostResolutionResponse,
    PostStartRangingResponse,
    PostStartStreamResponse,
    StartStreamPayload,
    StopRangingResponse,
    StopStreamResponse
} from '../types/glassesWifi';
import { getEnvVar } from '../utils/env';
import glasses from './glasses';

interface GlassesPerformReadParams {
    onDataReceived: (data: string) => void;
}


export default {
    /**
     * Pide permisos de escaneo WiFi de forma robusta.
     * En Expo Go retorna true, en build nativo pide permisos reales si existen.
     */
    async getWifiScanPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: 'Permiso para escanear WiFi',
                    message: 'La app necesita acceso a tu ubicación para escanear redes WiFi.',
                    buttonNeutral: 'Preguntar luego',
                    buttonNegative: 'Cancelar',
                    buttonPositive: 'OK',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (e) {
            return false;
        }
    },
    async configureAPiUrl(url: string){
        await glasses.setApiUrl(url)
    },
    async removeApiUrl(){
        await glasses.removeApiUrl()
    },
    async getApiUrl(){
        return await glasses.getApiUrl()
    },
    async init(): Promise<HelloGlassesWifi> {
        try {
            const { data } = await glasses.getGlasses();
            return data;
        } catch (error) {
            console.error('Error en wifiInitService:', error);
            throw error;
        }
    },

    async getStreamUrl(port: number, code: string): Promise<string> {
        const apiUrl = await glasses.getApiUrl()
    return `${getEnvVar('APP_API_URL_GLASSES')}/video_feed/${port.toString()}/${code}`
    },

    async check(): Promise<boolean> {
        try {
            const res = await glasses.getGlasses();
            const data: HelloGlassesWifi = res.data
            console.log("whoiam -> :", data.whoiam)
            return res.status == 200;
        } catch (error) {
            console.warn('Error in GET glasses:', error);
            return false
        }
    },

    async connect(payload: ConnectGlassesPayload): Promise<ConnectGlassesResponse> {
        try {
            const { data } = await glasses.connectGlasses(payload);
            return data;
        } catch (error) {
            console.error('Error en connectGlassesService:', error);
            throw error;
        }
    },
    async disconnect(): Promise<DisconnectGlassesResponse> {
        try {
            const { data } = await glasses.disconnetGlasses();
            return data;
        } catch (error) {
            console.error('Error en disconnectGlassesService:', error);
            throw error;
        }
    },

    async resolution(payload: PostResolutionPayload): Promise<PostResolutionResponse> {
        try {
            const {data} = await glasses.postResolution(payload);
            return data;
        } catch (error) {
            console.error('Error en postResolutionService:', error);
            throw error;
        }
    },
    async startStream(payload: StartStreamPayload): Promise<PostStartStreamResponse> {
        try {
            const {data} = await glasses.postStartStream(payload);
            return data;
        } catch (error: any) {
            console.error('Error en postStartStreamService:', error);
            return {"data": "", error: error.toString()}
        }
    },
    async stopStream(): Promise<StopStreamResponse> {
        try {
            const {data} = await glasses.stopStream();
            return data;
        } catch (error: any) {
            console.error('Error en stopStreamService:', error);
            return {"data": "", error: error.toString()}
        }
    },

    async startRanging(): Promise<PostStartRangingResponse> {
        try {
            const {data} = await glasses.postStartRanging();
            return data;
        } catch (error: any) {
            console.error('Error en postStartRangingService:', error);
            return {"data": "", error: error.toString()}
        }
    },

    async stopRanging(): Promise<StopRangingResponse> {
        try {
            const {data} = await glasses.stopRanging();
            return data;
        } catch (error: any) {
            console.error('Error en stopRangingService:', error);
            return {"data": "", error: error.toString()}
        }
    },

    async performRead({onDataReceived}: GlassesPerformReadParams): Promise<void> {
        let res
        try {
            res = await glasses.btn();
        } catch (error) {
            console.log("[performRead] Error in calling endpoint /btn:", error);
            return
        }
        try {
            let key = ""
            if (res.time > 0 && res.time < 1000) {
                key = "<btn2,on>"
            }
            onDataReceived(key)
        } catch (error) {
            console.error('[performRead] Error in dataReceived:', error);
        }
    }
}
