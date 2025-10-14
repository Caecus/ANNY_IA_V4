import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useContext, useRef, useState } from 'react';
import { NativeModules, ToastAndroid } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import BTGlasses from '../services/BTGlasses';
import SocketGlasses from '../services/SocketGlasses';
import WIFIGlasses from '../services/WIFIGlasses';
import { Device } from '../store/devicesSlice';
import { GlassesProtocolEnum } from '../types/glasses-protocol.enum';
// import Tts from 'react-native-tts';
// import dgram from 'react-native-udp';
// import UdpSocket from 'react-native-udp/lib/types/UdpSocket';
import { getEnvVar } from '../utils/env';
import { AccessibilityContext, VoiceCommand } from './AccessibilityContext';

const { AudioManagerModule } = NativeModules;

export interface GlassesContextProps {
    glassesWiFiConnected: boolean;
    glassesLoadingWiFi: boolean;
    glassesInit: () => void;
    glassesConnectWiFi: (ssid: string, pass: string) => void;
    glassesStartRanging: () => void;
    glassesStopRanging: () => void;
    glassesStartStreaming: (port: number) => void;
    glassesStopStreaming: () => void;
    glassesGetDetectionPort: () => number;
    glassesGetDetectionCode: () => string;
    glassesDisconnect: () => void;
    glassesDetectOnFrame: (model: string) => any | null;
    glassesDetectOnImage: (blobImage: any, model: string) => any | null;
    glassesStartStreamingListener: () => Promise<boolean>;
    glassesStopStreamingListener: () => void;
    glassesResestState: () => void;
    glassesConnect: (deviceMac: string) => Promise<boolean | undefined | string>;
    GetIdRef: () => string;
    glassesProtocol(): Promise<GlassesProtocolEnum>;
    setGlassesProtocol(proto: GlassesProtocolEnum): Promise<void>;
    isGlassesBTProto: () => Promise<boolean>;
    isGlassesWifiProto: () => Promise<boolean>;
    getGlassesActive: () => boolean;
    getGlassesCommands: () => VoiceCommand[];
    listenUDPGlasses: () => void;
    glassesStreamUrl: () => Promise<string>;
    scanBluetoothDevices: () => Promise<void>;
    btDevices: Device[];
    glassesSocketConnect: (serverUrl: string) => Promise<boolean>;
    glassesSocketDisconnect: () => void;
    glassesRecognizeImage: (type?: 'object' | 'text' | 'money' | 'document') => Promise<string>;
    glassesScanText: () => Promise<string>;
    glassesRecognizeMoney: () => Promise<string>;
    glassesReadDocument: () => Promise<string>;
    glassesDescribeScene: () => Promise<string>;
    isSocketConnected: () => boolean;
    glassesStartStreamAnalysis: (analysisType?: 'continuous' | 'on_command') => Promise<boolean>;
    glassesStopStreamAnalysis: () => void;
    glassesAnalyzeCurrentFrame: (type?: 'scene' | 'text' | 'money' | 'objects') => Promise<void>;
    isStreamAnalysisActive: () => boolean;
}

export const GlassesContext = createContext({} as GlassesContextProps);

export const GlassesProvider = ({ children }: any) => {

    const { voiceStart,  setGlassesCommands} = useContext(AccessibilityContext);

    let glassesCommands: VoiceCommand[] = [
        {
            name: "iniciar detección",
            roles: ["PDV"],
            description: "Inicia la detección de objetos con lentes Anny",
            action: async () => { 
                console.log("GlassesCommand ->  iniciar deteccion")
                const ok = await glassesStartStreamingListener()
                if (ok){
                    await glassesStartStreaming(glassesDetectionPortRef.current); 
                } 
            },
          },
          {
            name: "parar detección",
            roles: ["PDV"],
            description: "Detiene la detección de objetos con lentes Anny",
            action: async () => { 
                console.log("GlassesCommand ->  parar detección")
                await glassesStopStreaming()
                await glassesStopStreamingListener()
            },
          },
          {
            name: "escanear texto",
            roles: ["PDV"],
            description: "Lee texto con los anteojos CAECUS",
            action: async () => { 
                console.log("GlassesCommand ->  escanear texto")
                await glassesScanText()
            },
          },
          {
            name: "reconocer billete",
            roles: ["PDV"],
            description: "Identifica billetes con los anteojos CAECUS",
            action: async () => { 
                console.log("GlassesCommand ->  reconocer billete")
                await glassesRecognizeMoney()
            },
          },
          {
            name: "describir escena",
            roles: ["PDV"],
            description: "Describe lo que ven los anteojos CAECUS",
            action: async () => { 
                console.log("GlassesCommand ->  describir escena")
                await glassesDescribeScene()
            },
          }
    ]

    // state variables
    const [glassesLoadingWiFi, setGlassesLoadingWiFi] = useState<boolean>(false);
    const [glassesWiFiConnected, setGlassesWiFiConnected] = useState<boolean>(false);
    const [btDevices, setBtDevices] = useState<Device[]>([]);

    // ref variables
    const glassesIdRef = useRef<string>('');
    const glassesReadListenerConnectedRef = useRef<boolean>(false);
    const glassesSSIDRef = useRef<string>('');
    const glassesPassRef = useRef<string>('');
    const glassesDetectionPortRef = useRef<number>(-1);
    const glassesDetectionCodeRef = useRef<string>('');
    const glassesDetectionIntervalIdRef = useRef<any>(null);
    const GlassesReadInterval = useRef<NodeJS.Timeout | undefined>(undefined);
    const glassesActive = useRef<boolean>(false);
    const socket = useRef<any|null>(null)
    const glassesWifiLastAttempt = useRef<number>(0);

    const getGlassesCommands = () => {
        return glassesCommands;
    }

    const scanBluetoothDevices = async () => {
        try {
            const list = await RNBluetoothClassic.getBondedDevices();
            setBtDevices(
                list.map((d) => ({
                    id: d.id,
                    name: d.name,
                    type: 'bluetooth',
                    connected: false,
                }))
            );
        } catch (e) {
            setBtDevices([]);
        }
    };

    const getGlassesActive = () => {
        return glassesActive.current
    }

    const glassesNotActiveMsg = (key: string) => {
        console.warn(`${key}: glasses not active`);
        // Tts.stop();
        // Tts.speak('Lentes Anny no encontrados');
        ToastAndroid.show('Lentes Anny no encontrados', ToastAndroid.LONG);
    }

    const setGlassesProtocol = async (proto: GlassesProtocolEnum) => {
        await AsyncStorage.setItem("glassesProtocol", proto.toString())
    }

    const glassesProtocol = async () => {
        const res = await AsyncStorage.getItem("glassesProtocol")
        if (res){
            return res as GlassesProtocolEnum
        } else {
            await AsyncStorage.setItem("glassesProtocol", GlassesProtocolEnum.wifi)
            return GlassesProtocolEnum.wifi
        }
    }

    const isGlassesBTProto = async () => {
        const proto = await glassesProtocol()
        return proto === GlassesProtocolEnum.bluetooth;
    }

    const isGlassesWifiProto = async () => {
        const proto = await glassesProtocol()
        return proto === GlassesProtocolEnum.wifi;
    }

    const glassesResestState = () => {
        setGlassesLoadingWiFi(false);
        glassesActive.current = false
        glassesIdRef.current = '';
        glassesReadListenerConnectedRef.current = false;
        glassesDetectionPortRef.current = 8888;
        glassesDetectionCodeRef.current = '';
        glassesDetectionIntervalIdRef.current = null;
        if (GlassesReadInterval.current) {
            clearInterval(GlassesReadInterval.current)
        }
    }

    const glassesConnect = async (deviceMac: string) => {
        if (!isGlassesBTProto()) {
            // Tts.speak('Tipo de lente no compatible');
            ToastAndroid.show(
                'Tipo de lente no compatible',
                ToastAndroid.SHORT
            );
            return
        }

        const result = await BTGlasses.glassesConnectServiceBT({
            deviceMac,
        });
        if (result !== 'error') {
            glassesIdRef.current = result;
            glassesActive.current = true

            // start process to listen for commands
            clearInterval(GlassesReadInterval.current)
            GlassesReadInterval.current = setInterval(
                () => BTGlasses.glassesPerformReadServiceBT({
                    glassesId: glassesIdRef.current,
                    onDataReceived: (data: string) => {
                        processData(data)
                    },
                }), 1000
            )

        }

        return result;
    };

    const glassesInitBT = async () => {
        const result = await BTGlasses.btInitService({
            glassesResestState
        });
        if (result.success && result.glassesId) {
            console.log("[glassesInit] BT device connected, setting active status")
            glassesActive.current = true;
            glassesIdRef.current = result.glassesId
            // check if wifi config is saved on storage
            const ssid = await AsyncStorage.getItem('ssid');
            const pass = await AsyncStorage.getItem('pass');
            // connect to wifi
            if (ssid && pass) {
                console.log("[glassesInit] connecting to wifi...", ssid, pass, glassesActive.current)
                await glassesConnectWiFi(ssid, pass);
            }

            // start process to listen for commands
            clearInterval(GlassesReadInterval.current)
            GlassesReadInterval.current = setInterval(
                () => BTGlasses.glassesPerformReadServiceBT({
                    glassesId: glassesIdRef.current,
                    onDataReceived: (data: string) => {
                        processData(data)
                    },
                }), 1000
            )
            console.log("[glassesInit] glassesActive ->", glassesActive.current)
        }
    }

    const _Setup = async () => {
        // then we just do a normal check on the hello endpoint
        const response = await WIFIGlasses.check();
        if (response) {
            // Tts.speak("Lentes Wifi conectados")
            glassesActive.current = true;
        } else {
            // // Tts.speak("Fallo al conectar lentes wifi")
            return
        }
        // on this proto wifi connection is implicit at this stage
        setGlassesWiFiConnected(true);

        // start process to listen for commands
        clearInterval(GlassesReadInterval.current)
        GlassesReadInterval.current = setInterval(
            () => WIFIGlasses.performRead({
                onDataReceived: (data: string) => {
                    processData(data)
                },
            }), 1000
        )
    }

    const listenUDPGlasses = async () => {
        if (socket.current) {
            // event already registered, skip
            console.log("UDP socket already listening...")
            return
        }
        // socket.current = dgram.createSocket({type:'udp4'})
        // const port = 9009
        // console.log(`UDP start listening on port ${port}`)
        // socket.current.bind(port)
        // socket.current.on('message', async function(msg, rinfo){
        //     // console.log("message recv ->", msg.toString())
        //     // console.log("rinfo recv ->", rinfo)
        //     const currentURL = await WIFIGlasses.getApiUrl()
        //     const newURL = `http://${rinfo.address}`
        //     if (await isGlassesWifiProto() && (currentURL !== newURL || !glassesActive.current)){
        //         console.log(`updating glasses IP, ${currentURL} -> ${newURL}`)
        //         if (currentURL !== newURL){
        //             // Tts.speak('Detectada nueva IP para lentes Wifi, conectando...')
        //         }
        //         if (glassesActive.current){
        //             // glasses was active, we must disconnect
        //             await glassesDisconnect()
        //             glassesResestState()
        //         }
        //         await WIFIGlasses.configureAPiUrl(newURL) // set the new url
        //         await _Setup() // reconfigure glasses
        //     }
        // })
    }

    const glassesInit = async () => {
        if (glassesActive.current) return;
        if ((await isGlassesBTProto())) {
            console.log("[glassesInit] connecting to BT glasses")
            // Tts.speak("Conectando a lentes Bluetooth")
            // init for BT protocol requires to find the correct
            // bluetooth devices based on name and mac address
            // and connect to it
            await glassesInitBT()

            // make sure to stop the listeners for UDP
            if (socket.current){
                socket.current.close()
                socket.current = null
            }
        }
        else if (await isGlassesWifiProto()) {
            // Tts.speak("Buscador de lentes Wifi activado, por favor conecte sus lentes")
            console.log("[glassesInit] connecting to Wifi glasses")
            await listenUDPGlasses()
        }
    }

    const processData = (data: string) => {
        switch (data) {
            case '<btn2,on':
                AudioManagerModule?.startBluetoothSco();
                voiceStart();
                break;
            case '<btn,off':
                break;
            case '<wifi connected':
                setGlassesLoadingWiFi(false);
                setGlassesWiFiConnected(true);
                // Tts.speak('Conexión de lentes a red exitosa');
                ToastAndroid.show('Conexión de lentes a red exitosa', ToastAndroid.SHORT);
                break;
            case '<wifi connection timeout':
                setGlassesLoadingWiFi(false);
                setGlassesWiFiConnected(false);
                // Tts.speak('Conexión de lentes a red fallida');
                ToastAndroid.show('Conexión de lentes a red fallida', ToastAndroid.SHORT);
                break;
        }
    }

    const glassesConnectWiFi = async (ssid: string, pass: string) => {
        if (!glassesActive.current) {
            glassesNotActiveMsg("glassesConnectWiFi")
            return;
        }
        glassesSSIDRef.current = ssid;
        glassesPassRef.current = pass;
        setGlassesLoadingWiFi(true);
        if (await isGlassesBTProto()) {
            const command = '<connect:' + ssid + ':' + pass;
            await BTGlasses.writeCommandToDeviceBT(glassesIdRef.current, command)
        } else if (await isGlassesWifiProto()) {
            await WIFIGlasses.connect({ ssid: ssid, password: pass })
        }
    }

    const GetIdRef = () => {
        return glassesIdRef.current;
    }

    const glassesDisconnect = async () => {
        console.warn('glassesDisconnect: Disconnecting');
        const deviceId = glassesIdRef.current;
        if (!glassesActive.current) {
            console.warn('glassesDisconnect: glasses not active, ignoring');
            return;
        }

        if (glassesIsStreamingActive()) {
            try {
                const { data } = await axios.post(`${getEnvVar('APP_API_URL_GLASSES')}/stop_streaming_listening`, {
                    port: glassesDetectionPortRef.current,
                    code: glassesDetectionCodeRef.current,
                });

                if (data && data.status) {
                    glassesDetectionPortRef.current = -1;
                    glassesDetectionCodeRef.current = '';

                    console.warn('glassesDisconnect: Streaming closed successfully');
                } else {
                    console.warn('glassesDisconnect: ' + data.message);
                }
            } catch (err) {
                console.warn('glassesDisconnect: ' + err);
            }
        }

        if (glassesDetectionIntervalIdRef.current !== null) {
            clearInterval(glassesDetectionIntervalIdRef.current);
            glassesDetectionIntervalIdRef.current = null;
        }
        if ((await isGlassesBTProto()) && deviceId){
            console.log("disconnecting BT glasses...")
            await BTGlasses.glassesDisconnectServiceBT(deviceId)
        }

        glassesResestState()
    }

    const glassesStartRanging = async () => {
        if (!glassesActive.current) {
            glassesNotActiveMsg("startRanging")
            return;
        }
        if (await isGlassesBTProto()) {
            const command = '<start_ranging:2000';
            await BTGlasses.writeCommandToDeviceBT(glassesIdRef.current, command)
        } else if (await isGlassesWifiProto()) {
            await WIFIGlasses.startRanging()
        }
    }

    const glassesStopRanging = async () => {
        if (!glassesActive.current) {
            glassesNotActiveMsg("stopRanging")
            return;
        }

        if (await isGlassesBTProto()) {
            const command = '<stop_ranging:2000';
            await BTGlasses.writeCommandToDeviceBT(glassesIdRef.current, command)
        } else if (await isGlassesWifiProto()) {
            await WIFIGlasses.stopRanging()
        }
    }

    const glassesStartStreaming = async (port: number) => {
        if (!glassesActive.current) {
            glassesNotActiveMsg("startStreaming")
            return;
        }

        if (await isGlassesBTProto()) {
            const command = `<start_stream:3.15.63.191:${port.toString()}`;
            await BTGlasses.writeCommandToDeviceBT(glassesIdRef.current, command)

            const command_res = '<resolution:1';
            await BTGlasses.writeCommandToDeviceBT(glassesIdRef.current, command)
        } else if (await isGlassesWifiProto()) {
            await WIFIGlasses.startStream({ ip: '3.15.63.191', port: port.toString() })
            // await WIFIGlasses.resolution({'resolution': 1})
        }
    }

    const glassesStopStreaming = async () => {
        if (!glassesActive.current) {
            glassesNotActiveMsg("stopStreaming")
            return;
        }

        if (await isGlassesBTProto()) {
            const command = '<stop_stream';
            await BTGlasses.writeCommandToDeviceBT(glassesIdRef.current, command)
        } else if (await isGlassesWifiProto()) {
            await WIFIGlasses.stopStream()
        }
    }

    const glassesStreamUrl = async () => {
        if (!glassesActive.current) {
            glassesNotActiveMsg("streamUrl")
            return '';
        }

        if (await isGlassesBTProto()) {
            return await BTGlasses.getStreamUrl(
                glassesDetectionPortRef.current,
                glassesDetectionCodeRef.current
            )
        } else if (await isGlassesWifiProto()) {
            return await WIFIGlasses.getStreamUrl(
                glassesDetectionPortRef.current,
                glassesDetectionCodeRef.current
            )
        }
        return ''
    }

    const glassesStartStreamingListener = async () => {
        if (!glassesActive.current) {
            glassesNotActiveMsg("glassesStartStreamingListener")
            return false;
        }

        if (glassesIsStreamingActive()) {
            // Tts.stop();
            // Tts.speak('Detección de lentes está activada');
            return true;
        }

        if (!glassesWiFiConnected) {
            // Tts.stop();
            // Tts.speak('Lentes Anny no conectados a red Wi-Fi');
            console.warn("glassesStartSteamingListener: No Wi-Fi connected");
            return false;
        }

        try {
            console.log("calling api to reserve a UDP port for streaming...")
            const { data } = await axios.post(`${getEnvVar('APP_API_URL_GLASSES')}/start_streaming_listening`, { show_detection: false}, {timeout: 10000});

            if (data.status) {
                glassesDetectionPortRef.current = data.port;
                glassesDetectionCodeRef.current = data.reservation_code;
                glassesStartStreaming(data.port);
                // glassesDetectionIntervalIdRef.current = setInterval(glassesGetDetections, 5000);
                console.log('glassesStartSteamingListener: Streaming started successfully');
                // Tts.stop();
                // Tts.speak('Detección iniciada');
            } else {
                console.warn('glassesStartSteamingListener: ' + data.message);
                return false
            }
        } catch (err) {
            console.warn('glassesStartSteamingListener: ' + err);
            return false
        }
        return true

    }

    const glassesStopStreamingListener = async () => {
        if (!glassesActive.current) {
            glassesNotActiveMsg("glassesStopStreamingListener")
            return;
        }

        try {
            const { data } = await axios.post(`${getEnvVar('APP_API_URL_GLASSES')}/stop_streaming_listening`, {
                port: glassesDetectionPortRef.current,
                code: glassesDetectionCodeRef.current,
            });

            if (data.status) {
                glassesDetectionPortRef.current = -1;
                glassesDetectionCodeRef.current = '';
                glassesStopStreaming();
                console.warn('glassesStopStreamingListener: Streaming closed successfully');
            } else {
                console.warn('glassesStopStreamingListener: ' + data.message);
            }
        } catch (err) {
            console.warn('glassesStopStreamingListener: ' + err);
        }
    }

    const glassesIsStreamingActive = () => {
        return glassesDetectionPortRef.current !== -1 && glassesDetectionCodeRef.current !== '';
    }

    const glassesGetDetectionPort = () => {
        return glassesDetectionPortRef.current;
    }

    const glassesGetDetectionCode = () => {
        return glassesDetectionCodeRef.current;
    }

    const glassesDetectOnFrame = async (model: string) => {
        console.log("[glassesDetectOnFrame]")
        try {
            console.log("calling endpoint to detect on frame")
            const detections = await axios.post(`${getEnvVar('APP_API_URL_GLASSES')}/detect_on_frame`, {
                port: glassesDetectionPortRef.current,
                code: glassesDetectionCodeRef.current,
                model: model
            });
            console.log("detections:", detections.data)
            return detections.data.detections
        } catch (error) {
            console.log("[glassesDetectOnFrame] error", error)
            return null
        }
    }

    const glassesDetectOnImage = async (imageUri: string, model: string) => {
        console.log("[glassesDetectOnImage]")
        try {
            const data = new FormData();
            //@ts-ignore
            data.append('file', {
                uri: imageUri,
                name: imageUri.split('/').pop(),
                type: 'image/jpeg',
            });
            console.log("image uri", imageUri, "| name", imageUri.split('/').pop())
            const _url = `${getEnvVar('APP_API_URL_GLASSES')}/detect_on_image/${model}`
            console.log("sending post to ", _url)

            const response = await fetch(_url, {
                method: 'POST',
                body: data,
                headers: {
                    'Accept': 'application/json',
                }
            })
            console.log("response.status:", response.status)
            const detections = await response.json()

            console.log("detections:", detections)
            return detections.detections
        } catch (error) {
            console.log("[glassesDetectOnImage] error", error)
            return null
        }
    }

    // Funciones de Socket para comandos avanzados
    const glassesSocketConnect = async (serverUrl: string): Promise<boolean> => {
        try {
            return await SocketGlasses.connect(serverUrl);
        } catch (error) {
            console.error('[GlassesContext] Error conectando socket:', error);
            return false;
        }
    };

    const glassesSocketDisconnect = (): void => {
        SocketGlasses.disconnect();
    };

    const glassesRecognizeImage = async (type: 'object' | 'text' | 'money' | 'document' = 'object'): Promise<string> => {
        if (!glassesActive.current) {
            throw new Error('Anteojos no conectados');
        }
        return await SocketGlasses.recognizeImage(type);
    };

    const glassesScanText = async (): Promise<string> => {
        if (!glassesActive.current) {
            throw new Error('Anteojos no conectados');
        }
        return await SocketGlasses.scanText();
    };

    const glassesRecognizeMoney = async (): Promise<string> => {
        if (!glassesActive.current) {
            throw new Error('Anteojos no conectados');
        }
        return await SocketGlasses.recognizeMoney();
    };

    const glassesReadDocument = async (): Promise<string> => {
        if (!glassesActive.current) {
            throw new Error('Anteojos no conectados');
        }
        return await SocketGlasses.readDocument();
    };

    const glassesDescribeScene = async (): Promise<string> => {
        if (!glassesActive.current) {
            throw new Error('Anteojos no conectados');
        }
        return await SocketGlasses.describeScene();
    };

    const isSocketConnected = (): boolean => {
        return SocketGlasses.isSocketConnected();
    };

    const glassesStartStreamAnalysis = async (analysisType: 'continuous' | 'on_command' = 'on_command'): Promise<boolean> => {
        if (!glassesActive.current) {
            console.warn('Anteojos no conectados para análisis de stream');
            return false;
        }

        if (!glassesWiFiConnected) {
            console.error('Anteojos no conectados a WiFi');
            return false;
        }

        // Configurar parámetros del streaming en SocketGlasses
        SocketGlasses.setGlassesStreamParams(
            glassesDetectionPortRef.current,
            glassesDetectionCodeRef.current
        );

        return await SocketGlasses.startStreamAnalysis(analysisType);
    };

    const glassesStopStreamAnalysis = (): void => {
        SocketGlasses.stopStreamAnalysis();
    };

    const glassesAnalyzeCurrentFrame = async (type: 'scene' | 'text' | 'money' | 'objects' = 'scene'): Promise<void> => {
        if (!glassesActive.current) {
            throw new Error('Anteojos no conectados');
        }

        if (!glassesWiFiConnected) {
            throw new Error('Anteojos no conectados a WiFi');
        }

        // Asegurar que los parámetros estén configurados
        SocketGlasses.setGlassesStreamParams(
            glassesDetectionPortRef.current,
            glassesDetectionCodeRef.current
        );

        await SocketGlasses.analyzeCurrentFrame(type);
    };

    const isStreamAnalysisActive = (): boolean => {
        return SocketGlasses.isStreamAnalysisRunning();
    };

    return (
        <GlassesContext.Provider
            value={{
                glassesWiFiConnected,
                glassesLoadingWiFi,
                glassesInit,
                glassesConnectWiFi,
                glassesStartRanging,
                glassesStopRanging,
                glassesStartStreaming,
                glassesStopStreaming,
                glassesGetDetectionPort,
                glassesGetDetectionCode,
                glassesDisconnect,
                glassesStartStreamingListener,
                glassesStopStreamingListener,
                glassesResestState,
                glassesDetectOnFrame,
                glassesDetectOnImage,
                GetIdRef,
                glassesProtocol,
                setGlassesProtocol,
                isGlassesBTProto,
                isGlassesWifiProto,
                glassesConnect,
                getGlassesActive,
                getGlassesCommands,
                listenUDPGlasses,
                glassesStreamUrl,
                btDevices,
                scanBluetoothDevices,
                glassesSocketConnect,
                glassesSocketDisconnect,
                glassesRecognizeImage,
                glassesScanText,
                glassesRecognizeMoney,
                glassesReadDocument,
                glassesDescribeScene,
                isSocketConnected,
                glassesStartStreamAnalysis,
                glassesStopStreamAnalysis,
                glassesAnalyzeCurrentFrame,
                isStreamAnalysisActive,
            }}>
            {children}
        </GlassesContext.Provider>
    );
}