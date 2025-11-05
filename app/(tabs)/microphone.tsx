import colors from '@/assets/colors';
import { MaterialIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Animated, PermissionsAndroid, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { AccessibilityContext } from '../../context/AccessibilityContext';
import { GlassesContext } from '../../context/GlassesContext';
import { useNavigation } from '../../context/NavigationContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { getEnvVar } from '../../utils/env';

export default function MicrophoneScreen() {
    const { voiceStart, voiceGetCommands } = useContext(AccessibilityContext);
    const { searchPlaces, selectDestination, state } = useNavigation();
    const { 
        getGlassesActive, 
        glassesStartStreamingListener, 
        glassesStopStreamingListener,
        glassesStartRanging,
        glassesStopRanging,
        glassesDetectOnFrame,
        glassesInit,
        glassesWiFiConnected,
        glassesScanText,
        glassesRecognizeMoney,
        glassesDescribeScene,
        glassesReadDocument,
        isSocketConnected,
        glassesSocketConnect,
        glassesStartStreamAnalysis,
        glassesStopStreamAnalysis,
        glassesAnalyzeCurrentFrame,
        isStreamAnalysisActive
    } = useContext(GlassesContext);
    const [isListening, setIsListening] = useState(false);
    const [recognizedText, setRecognizedText] = useState('');
    const [pulseAnim] = useState(new Animated.Value(1));
    const colorScheme = useColorScheme();

    // Inicializar conexión de socket al cargar el componente
    useEffect(() => {
        const initSocketConnection = async () => {
            if (!isSocketConnected()) {
                try {
                    const socketUrl = getEnvVar('APP_SOCKET_AI_URL') || 'http://ai-vision-backend-env.eba-mjkziv3t.us-east-2.elasticbeanstalk.com';
                    const connected = await glassesSocketConnect(socketUrl);
                    if (connected) {
                        console.log('[MicrophoneScreen] Socket AI conectado:', socketUrl);
                    } else {
                        console.warn('[MicrophoneScreen] No se pudo conectar al Socket AI');
                    }
                } catch (error) {
                    console.error('[MicrophoneScreen] Error conectando Socket AI:', error);
                }
            }
        };

        initSocketConnection();
    }, []);

    useEffect(() => {
        if (isListening) {
            // Animación de pulso mientras escucha
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isListening]);

    // Mensaje amigable para TTS
    const speakAlert = (text: string, friendly?: string) => {
        const msg = friendly ? friendly : text.replace(/\n/g, ' ').replace(/Código:.*$/, '').replace(/Detalles:/, '').trim();
        Speech.speak(msg, { language: 'es-ES' });
    };

    const handleStartListening = async () => {
        setRecognizedText('');
        setIsListening(true);
        try {
            // Solicitar permiso RECORD_AUDIO en Android solo si no está concedido
            if (Platform.OS === 'android') {
                const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
                if (!hasPermission) {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                        {
                            title: 'Permiso de micrófono',
                            message: 'La app necesita acceso al micrófono para reconocer tu voz.',
                            buttonPositive: 'Aceptar',
                        }
                    );
                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        Alert.alert('Permiso requerido', 'Debes permitir el acceso al micrófono para usar el reconocimiento de voz.');
                        speakAlert(
                            'Debes permitir el acceso al micrófono para usar el reconocimiento de voz.',
                            'Por favor, permite el acceso al micrófono para que la aplicación pueda escuchar tus comandos de voz.'
                        );
                        setIsListening(false);
                        return;
                    }
                }
            }
            ExpoSpeechRecognitionModule.start({
                lang: 'es-ES',
                interimResults: true,
                maxAlternatives: 1,
            });
        } catch (error) {
            Alert.alert('Error', 'No se pudo iniciar el reconocimiento de voz');
            speakAlert(
                'No se pudo iniciar el reconocimiento de voz',
                'Ocurrió un problema al iniciar el reconocimiento de voz. Intenta nuevamente.'
            );
            setIsListening(false);
        }
    };

    const handleStopListening = () => {
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
    };

    // Listen for recognition results
    useSpeechRecognitionEvent('result', (event) => {
        if (!event || !event.results || event.results.length === 0) return;
        const transcript = event.results[0].transcript;
        setRecognizedText(transcript);
        // Si detecta comando válido, procesa automáticamente
        if (transcript) {
            const lower = transcript.toLowerCase();
            let destino = '';
            
            // Comandos de navegación
            if (lower.includes('navegar hacia')) {
                destino = lower.split('navegar hacia')[1]?.trim();
            } else if (lower.includes('ir hacia')) {
                destino = lower.split('ir hacia')[1]?.trim();
            } else if (lower.includes('necesito ir hacia')) {
                destino = lower.split('necesito ir hacia')[1]?.trim();
            }
            
            // Comandos de anteojos CAECUS
            if (lower.includes('iniciar detección') || lower.includes('empezar detección')) {
                handleGlassesCommand('start_detection');
                handleStopListening();
            } else if (lower.includes('parar detección') || lower.includes('detener detección')) {
                handleGlassesCommand('stop_detection');
                handleStopListening();
            } else if (lower.includes('activar sensores')) {
                handleGlassesCommand('start_ranging');
                handleStopListening();
            } else if (lower.includes('desactivar sensores')) {
                handleGlassesCommand('stop_ranging');
                handleStopListening();
            } else if (lower.includes('detectar objetos') || lower.includes('qué veo')) {
                handleGlassesCommand('detect_objects');
                handleStopListening();
            } else if (lower.includes('escanear texto') || lower.includes('leer texto')) {
                handleGlassesCommand('scan_text');
                handleStopListening();
            } else if (lower.includes('reconocer billete') || lower.includes('cuánto dinero')) {
                handleGlassesCommand('recognize_money');
                handleStopListening();
            } else if (lower.includes('leer documento') || lower.includes('leer papel')) {
                handleGlassesCommand('read_document');
                handleStopListening();
            } else if (lower.includes('describir escena') || lower.includes('qué hay aquí')) {
                handleGlassesCommand('describe_scene');
                handleStopListening();
            } else if (lower.includes('activar análisis continuo') || lower.includes('análisis automático')) {
                handleGlassesCommand('start_stream_analysis');
                handleStopListening();
            } else if (lower.includes('desactivar análisis') || lower.includes('parar análisis')) {
                handleGlassesCommand('stop_stream_analysis');
                handleStopListening();
            } else if (lower.includes('analizar ahora') || lower.includes('qué veo ahora')) {
                handleGlassesCommand('analyze_current_frame');
                handleStopListening();
            } else if (destino) {
                handleDirectNavigation(destino);
                handleStopListening();
            }
        }
        // Stop listening if final result
        if (event.isFinal) {
            handleStopListening();
        }
    });

    // Listen for errors
    useSpeechRecognitionEvent('error', (event) => {
        let mensaje = 'No se pudo reconocer la voz';
        let friendly = 'No se pudo reconocer lo que dijiste. Por favor, habla claro y cerca del micrófono.';
        if (event && event.message) {
            mensaje += `\n\nDetalles: ${event.message}`;
            if (event.message.includes('Missing RECORD_AUDIO permissions')) {
                friendly = 'No se detectó permiso para usar el micrófono. Por favor, acepta el permiso y vuelve a intentarlo.';
            }
        }
        if (event && event.error) {
            mensaje += `\nCódigo: ${event.error}`;
        }
        Alert.alert('Error', mensaje);
        speakAlert(mensaje, friendly);
        setIsListening(false);
    });

    const handleGlassesCommand = async (command: string) => {
        try {
            if (!getGlassesActive()) {
                Alert.alert('Anteojos no conectados', 'Los anteojos CAECUS no están conectados. Conéctalos primero.');
                speakAlert('Los anteojos CAECUS no están conectados. Conéctalos primero.');
                return;
            }

            switch (command) {
                case 'start_detection':
                    if (!glassesWiFiConnected) {
                        Alert.alert('WiFi requerido', 'Los anteojos necesitan estar conectados a WiFi para la detección.');
                        speakAlert('Los anteojos necesitan estar conectados a WiFi para la detección.');
                        return;
                    }
                    const started = await glassesStartStreamingListener();
                    if (started) {
                        Alert.alert('Detección iniciada', 'La detección de objetos está activa.');
                        speakAlert('Detección de objetos iniciada correctamente.');
                    } else {
                        Alert.alert('Error', 'No se pudo iniciar la detección.');
                        speakAlert('No se pudo iniciar la detección de objetos.');
                    }
                    break;

                case 'stop_detection':
                    await glassesStopStreamingListener();
                    Alert.alert('Detección detenida', 'La detección de objetos se ha detenido.');
                    speakAlert('Detección de objetos detenida.');
                    break;

                case 'start_ranging':
                    await glassesStartRanging();
                    Alert.alert('Sensores activados', 'Los sensores de distancia están activos.');
                    speakAlert('Sensores de distancia activados.');
                    break;

                case 'stop_ranging':
                    await glassesStopRanging();
                    Alert.alert('Sensores desactivados', 'Los sensores de distancia se han desactivado.');
                    speakAlert('Sensores de distancia desactivados.');
                    break;

                case 'detect_objects':
                    speakAlert('Analizando lo que ves...');
                    const detections = await glassesDetectOnFrame('yolov8n');
                    if (detections && detections.length > 0) {
                        const objectNames = detections.map((d: any) => d.class_name).join(', ');
                        const msg = `Veo: ${objectNames}`;
                        Alert.alert('Objetos detectados', msg);
                        speakAlert(msg);
                    } else {
                        Alert.alert('Sin objetos', 'No se detectaron objetos en el campo de visión.');
                        speakAlert('No se detectaron objetos en el campo de visión.');
                    }
                    break;

                case 'scan_text':
                    if (!isSocketConnected()) {
                        Alert.alert('Socket no conectado', 'Necesitas conectar al servidor de análisis primero.');
                        speakAlert('Necesitas conectar al servidor de análisis primero.');
                        return;
                    }
                    try {
                        const text = await glassesScanText();
                        Alert.alert('Texto escaneado', text);
                    } catch (error) {
                        Alert.alert('Error', 'No se pudo escanear el texto');
                    }
                    break;

                case 'recognize_money':
                    if (!isSocketConnected()) {
                        Alert.alert('Socket no conectado', 'Necesitas conectar al servidor de análisis primero.');
                        speakAlert('Necesitas conectar al servidor de análisis primero.');
                        return;
                    }
                    try {
                        const money = await glassesRecognizeMoney();
                        Alert.alert('Billete reconocido', money);
                    } catch (error) {
                        Alert.alert('Error', 'No se pudo reconocer el billete');
                    }
                    break;

                case 'read_document':
                    if (!isSocketConnected()) {
                        Alert.alert('Socket no conectado', 'Necesitas conectar al servidor de análisis primero.');
                        speakAlert('Necesitas conectar al servidor de análisis primero.');
                        return;
                    }
                    try {
                        const document = await glassesReadDocument();
                        Alert.alert('Documento leído', 'El documento se está leyendo por voz');
                    } catch (error) {
                        Alert.alert('Error', 'No se pudo leer el documento');
                    }
                    break;

                case 'describe_scene':
                    if (!isSocketConnected()) {
                        Alert.alert('Socket no conectado', 'Necesitas conectar al servidor de análisis primero.');
                        speakAlert('Necesitas conectar al servidor de análisis primero.');
                        return;
                    }
                    try {
                        const description = await glassesDescribeScene();
                        Alert.alert('Descripción de la escena', description);
                    } catch (error) {
                        Alert.alert('Error', 'No se pudo describir la escena');
                    }
                    break;

                case 'start_stream_analysis':
                    if (!isSocketConnected()) {
                        Alert.alert('Socket no conectado', 'Necesitas conectar al servidor de análisis primero.');
                        speakAlert('Necesitas conectar al servidor de análisis primero.');
                        return;
                    }
                    try {
                        const started = await glassesStartStreamAnalysis('continuous');
                        if (started) {
                            Alert.alert('Análisis continuo', 'Análisis automático del streaming activado');
                            speakAlert('Análisis automático del video activado');
                        } else {
                            Alert.alert('Error', 'No se pudo iniciar el análisis continuo');
                            speakAlert('No se pudo iniciar el análisis automático');
                        }
                    } catch (error) {
                        Alert.alert('Error', 'Error al iniciar análisis continuo');
                        speakAlert('Error al iniciar análisis automático');
                    }
                    break;

                case 'stop_stream_analysis':
                    try {
                        glassesStopStreamAnalysis();
                        Alert.alert('Análisis detenido', 'Análisis automático del streaming desactivado');
                        speakAlert('Análisis automático del video desactivado');
                    } catch (error) {
                        Alert.alert('Error', 'Error al detener análisis');
                        speakAlert('Error al detener análisis automático');
                    }
                    break;

                case 'analyze_current_frame':
                    if (!isSocketConnected()) {
                        Alert.alert('Socket no conectado', 'Necesitas conectar al servidor de análisis primero.');
                        speakAlert('Necesitas conectar al servidor de análisis primero.');
                        return;
                    }
                    if (!isStreamAnalysisActive()) {
                        Alert.alert('Streaming no activo', 'Necesitas activar el streaming primero.');
                        speakAlert('Necesitas activar el streaming primero.');
                        return;
                    }
                    try {
                        await glassesAnalyzeCurrentFrame('scene');
                        speakAlert('Analizando la imagen actual');
                    } catch (error) {
                        Alert.alert('Error', 'No se pudo analizar la imagen actual');
                        speakAlert('No se pudo analizar la imagen actual');
                    }
                    break;

                default:
                    speakAlert('Comando no reconocido.');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo ejecutar el comando de anteojos');
            speakAlert('No se pudo ejecutar el comando de anteojos.');
        }
    };

    const handleDirectNavigation = async (destination: string) => {
        try {
            // Buscar el destino
            await searchPlaces(destination);
            // Esperar brevemente para que el contexto se actualice
            setTimeout(async () => {
                if (state.searchResults && state.searchResults.length > 0) {
                    // Seleccionar automáticamente el primer resultado
                    await selectDestination(state.searchResults[0]);
                    const navMsg = `Destino seleccionado automáticamente: "${state.searchResults[0].description}". Puedes iniciar la navegación en la pestaña Explore.`;
                    Alert.alert('Navegación por Voz', navMsg);
                    speakAlert(navMsg, `Destino ${state.searchResults[0].description} seleccionado. Puedes iniciar la navegación en la pestaña explorar.`);
                } else {
                    const navMsg = `No se encontraron resultados para "${destination}".`;
                    Alert.alert('Navegación por Voz', navMsg);
                    speakAlert(navMsg, navMsg);
                }
            }, 600);
        } catch (error) {
            Alert.alert('Error', 'No se pudo procesar el destino');
            speakAlert('No se pudo procesar el destino', 'No se pudo encontrar el destino que pediste. Intenta con otro lugar o revisa tu conexión.');
        }
    };

    const getAvailableCommands = () => {
        const commands = voiceGetCommands();
        return commands.filter((cmd: any) => 
            cmd.name.includes('navegar') || 
            cmd.name.includes('ir hacia') || 
            cmd.name.includes('necesito ir')
        );
    };

    return (
        <SafeAreaView style={[styles.container, { flex: 1 }]}> 
            <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <ThemedView style={styles.header}>
                    <MaterialIcons name="mic" size={32} color={colors.primary} />
                    <ThemedText style={styles.title}>Comandos de Voz</ThemedText>
                    <ThemedText style={styles.subtitle}>
                        Usa tu voz para navegar y controlar la app
                    </ThemedText>
                </ThemedView>

                {/* Botón principal de micrófono */}
                <ThemedView style={styles.microphoneSection}>
                    <TouchableOpacity
                        style={[
                            styles.microphoneButton,
                            { backgroundColor: isListening ? colors.secondary : colors.primary }
                        ]}
                        onPress={isListening ? handleStopListening : handleStartListening}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={isListening ? "Escuchando..." : "Tocar para hablar"}
                    >
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <MaterialIcons
                                name={isListening ? "mic" : "mic-none"}
                                size={64}
                                color="white"
                            />
                        </Animated.View>
                    </TouchableOpacity>
                    <ThemedText style={styles.microphoneText}>
                        {isListening ? '🎤 Escuchando...' : '🎤 Toca para hablar'}
                    </ThemedText>
                    {/* Mostrar texto reconocido */}
                    {recognizedText ? (
                        <ThemedText style={styles.recognizedText}>
                            {`🗣️ "${recognizedText}"`}
                        </ThemedText>
                    ) : null}
                </ThemedView>

                {/* Ejemplos de comandos */}
                <ThemedView style={styles.examplesSection}>
                    <ThemedText style={styles.examplesTitle}>Comandos de Navegación:</ThemedText>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Navegar hacia Hospital Italiano"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Busca y navega al destino</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Ir hacia Obelisco"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Comando alternativo</ThemedText>
                    </ThemedView>
                    
                    <ThemedText style={[styles.examplesTitle, { marginTop: 24 }]}>Comandos de Anteojos CAECUS:</ThemedText>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Iniciar detección"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Inicia el streaming y detección de objetos</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Parar detección"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Detiene el streaming</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Activar sensores"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Activa sensores de distancia</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Qué veo"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Analiza objetos en tiempo real</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Escanear texto"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Lee texto con los anteojos</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Reconocer billete"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Identifica denominación del billete</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Describir escena"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Describe todo lo que hay alrededor</ThemedText>
                    </ThemedView>
                    
                    <ThemedText style={[styles.examplesTitle, { marginTop: 24 }]}>Comandos de Análisis en Tiempo Real:</ThemedText>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Activar análisis continuo"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Análisis automático del streaming</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Desactivar análisis"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Detiene análisis automático</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Analizar ahora"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Analiza la imagen actual del streaming</ThemedText>
                    </ThemedView>
                </ThemedView>

                {/* Botones de prueba rápida */}
                <ThemedView style={styles.quickTestSection}>
                    <ThemedText style={styles.sectionTitle}>Prueba de Navegación:</ThemedText>
                    <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleDirectNavigation('Hospital')}
                    >
                        <ThemedText style={styles.testButtonText}>🏥 Buscar Hospital</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleDirectNavigation('Farmacia')}
                    >
                        <ThemedText style={styles.testButtonText}>💊 Buscar Farmacia</ThemedText>
                    </TouchableOpacity>
                    
                    <ThemedText style={[styles.sectionTitle, { marginTop: 20 }]}>Prueba de Anteojos:</ThemedText>
                    <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: getGlassesActive() ? colors.secondary : '#999' }]}
                        onPress={() => handleGlassesCommand('start_detection')}
                        disabled={!getGlassesActive()}
                    >
                        <ThemedText style={styles.testButtonText}>👁️ Iniciar Detección</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: getGlassesActive() ? colors.secondary : '#999' }]}
                        onPress={() => handleGlassesCommand('detect_objects')}
                        disabled={!getGlassesActive()}
                    >
                        <ThemedText style={styles.testButtonText}>🔍 ¿Qué Veo?</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: getGlassesActive() && isSocketConnected() ? colors.secondary : '#999' }]}
                        onPress={() => handleGlassesCommand('scan_text')}
                        disabled={!getGlassesActive() || !isSocketConnected()}
                    >
                        <ThemedText style={styles.testButtonText}>📄 Escanear Texto</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: getGlassesActive() && isSocketConnected() ? colors.secondary : '#999' }]}
                        onPress={() => handleGlassesCommand('recognize_money')}
                        disabled={!getGlassesActive() || !isSocketConnected()}
                    >
                        <ThemedText style={styles.testButtonText}>💵 Reconocer Billete</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: colors.primary }]}
                        onPress={() => glassesInit()}
                    >
                        <ThemedText style={styles.testButtonText}>🔗 Conectar Anteojos</ThemedText>
                    </TouchableOpacity>
                </ThemedView>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    recognizedText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        textAlign: 'center',
        color: '#2196F3',
    },
    container: {
        paddingBottom: 20,
        backgroundColor: '#f5f5fa',
    },
    content: {
        // flex: 1,
        // padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 8,
        opacity: 0.7,
    },
    microphoneSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    microphoneButton: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    microphoneText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
    examplesSection: {
        marginBottom: 32,
    },
    examplesTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    exampleItem: {
        marginBottom: 16,
        paddingLeft: 16,
    },
    exampleCommand: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },
    exampleDescription: {
        fontSize: 14,
        marginTop: 4,
        opacity: 0.7,
    },
    quickTestSection: {
        paddingBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    testButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
    },
    testButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});