import { PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { getEnvVar, getGlassesConfig } from '../utils/env';

// import Tts from 'react-native-tts';

interface GlassesInitParams {
    glassesResestState: () => void;
}

interface GlassesConnectParams {
    deviceMac: string;
}

interface GlassesPerformReadParams {
    glassesId: string;
    onDataReceived: (data: string) => void;
}

export default {
    async getBluetoothScanPermission(): Promise<Promise<boolean> | boolean> {
        try {
            if (Platform.OS !== 'android') return true;
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);
            return (
                granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
                granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
                granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
            );
        } catch (e) {
            return false;
        }
    },

    isGlassesDevice(device: any) {
        console.log('[bt] checking if device is CAECUS:', device.name, 'starts with CAECUS:', device.name?.startsWith('CAECUS'));
        return device.name && device.name.startsWith('CAECUS');
    },

    async btInitService({
        glassesResestState
    }: GlassesInitParams) {
        const config = getGlassesConfig();
        console.log('[bt] Configuration:', config);
        
        // En modo debug, simular conexión exitosa
        if (config.isDebugMode && config.useSimulatedData) {
            console.log('[bt] DEBUG MODE: Simulando conexión a anteojos CAECUS');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay de conexión
            return { 
                success: true, 
                isCaecus: true, 
                glassesId: config.bluetoothConfig.simulatedDeviceId 
            };
        }

        // Modo release: conexión real
        console.log('[bt] RELEASE MODE: Conectando a anteojos reales');
        console.log('[bt] access');
    
        const bluetooth_available = await RNBluetoothClassic.isBluetoothAvailable();
        console.log('[bt] available:', bluetooth_available);
    
        const bluetooth_enabled = await RNBluetoothClassic.isBluetoothEnabled();
        console.log('[bt] enabled:', bluetooth_enabled);
    
        const enableResponse = await RNBluetoothClassic.requestBluetoothEnabled().catch((err) => {
            console.log('[bt] failed to request permission', err);
        });
        console.log('[bt] request enable response:', enableResponse);
    
        if (!bluetooth_enabled) {
            console.warn('glassesInit: Bluetooth not activated');
            // Tts.speak('Bluetooth no está activado, activélo para hacer uso de Lentes Anny');
            glassesResestState();
            return { success: false, isCaecus: false, glassesId: null };
        }
        // Tts.speak('Bluetooth conectado');
    
        const list = await RNBluetoothClassic.getBondedDevices();
        console.log('[bt] bonded devices:', list);
        console.log('[bt] filtering for CAECUS devices...');
        
        const listGlasses = list.filter((device) => {
            console.log('[bt] checking device:', device.name, 'id:', device.id);
            return this.isGlassesDevice(device);
        });
        
        console.log('[bt] filtered glasses devices:', listGlasses);
    
        if (listGlasses.length < 1) {
            console.warn('glassesInit: Anny glasses not paired');
            // Tts.stop();
            // Tts.speak('Lentes Anny no detectados por Bluetooth');
            return { success: false, isCaecus: false, glassesId: null};
        } else if (listGlasses.length > 1) {
            console.warn('glassesInit: More than one pair of glasses paired, this could lead to undesired behaviour');
            // Tts.stop();
            // Tts.speak('Se han detectado múltiples Lentes Anny, el funcionamiento puede no ser el esperado');
        }
    
        // Verificación adicional antes de acceder al primer elemento
        const firstGlasses = listGlasses[0];
        if (!firstGlasses) {
            console.error('[bt] No glasses device found in list');
            return { success: false, isCaecus: false, glassesId: null };
        }
    
        // Tts.stop();
        // Tts.speak('Lentes Anny detectados, conectando...');
    
        const deviceMac = firstGlasses.id;
        console.log('[bt] glasses mac address is:', deviceMac);
        console.log('[bt] device object:', firstGlasses);
        
        // Verificar que la dirección MAC sea válida
        if (!deviceMac || typeof deviceMac !== 'string' || deviceMac.length < 10) {
            console.error('[bt] Invalid MAC address detected:', deviceMac);
            return { success: false, isCaecus: false, glassesId: null };
        }
        
        const result = await this.glassesConnectServiceBT({
        deviceMac,
        });
        if (result !== 'error') {
            return { success: true, isCaecus: true, glassesId: result };
        }
        return { success: true, isCaecus: true, glassesId: null };
    },

    async glassesDisconnectServiceBT(deviceId: string){
        try {
            const res = await RNBluetoothClassic.disconnectFromDevice(deviceId)
            if (res){
                console.warn('glassesDisconnectServiceBT: Lentes anny desconectados');
                // Tts.stop();
                // Tts.speak('Lentes Anny desconectados');
            }
        } catch (error) {
            console.warn('glassesDisconnectServiceBT: failed to disconnect, error:', error)
        }
    },

    async glassesConnectServiceBT({
        deviceMac,
    }: GlassesConnectParams): Promise<string> {
        try {
            const btDevice = await RNBluetoothClassic.connectToDevice(deviceMac);
            const isConnected = await btDevice.isConnected();

            if (!isConnected) {
                console.warn('glassesInit: Paired glasses but without connection');
                // Tts.stop();
                // Tts.speak('Lentes Anny no están encendidos o al alcance');
                return 'error';
            }

            // Tts.stop();
            // Tts.speak('Lentes Anny conectados');
            return btDevice.id;
        } catch (error) {
            console.warn('glassesInit: Error trying to connect with glasses', error);
            // Tts.stop();
            // Tts.speak('Lentes Anny no están encendidos o al alcance');
            return 'error';
        }
    },

    async writeCommandToDeviceBT(deviceId: string, command: string): Promise<void> {
        if (!deviceId) {
            console.warn('[BluetoothWriteService] deviceId no válido.');
            return;
        }

        try {
            await RNBluetoothClassic.writeToDevice(deviceId, command + '\n');
        } catch (error) {
            console.error('[BluetoothWriteService] Error al escribir comando:', error);
            throw error;
        }
    },

    async glassesPerformReadServiceBT({
        glassesId,
        onDataReceived,
    }: GlassesPerformReadParams): Promise<void> {
        if (!glassesId) {
            console.warn('[glassesPerformReadService]: glassesId no definido');
            return;
        }

        try {
            const dataAvailable = await RNBluetoothClassic.availableFromDevice(glassesId);
            if (!dataAvailable) {
                return;
            }
            const device = await RNBluetoothClassic.getConnectedDevice(glassesId);
            const data = await device.read();
            const key = data.toString().split('.')[0]
            onDataReceived(key);
        } catch (error) {
            console.warn('[glassesPerformReadService] Error leyendo datos:', error);
        }
    },

    async getStreamUrl(port: number, code: string): Promise<string> {
        return `${getEnvVar('APP_API_URL_GLASSES')}/video_feed/${port.toString()}/${code}`
    },
};

