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
import { useNavigation } from '../../context/NavigationContext';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function MicrophoneScreen() {
    const { voiceStart, voiceGetCommands } = useContext(AccessibilityContext);
    const { searchPlaces, selectDestination, state } = useNavigation();
    const [isListening, setIsListening] = useState(false);
    const [recognizedText, setRecognizedText] = useState('');
    const [pulseAnim] = useState(new Animated.Value(1));
    const colorScheme = useColorScheme();

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
        // Si detecta comando válido, navega automáticamente
        if (transcript) {
            const lower = transcript.toLowerCase();
            let destino = '';
            if (lower.includes('navegar hacia')) {
                destino = lower.split('navegar hacia')[1]?.trim();
            } else if (lower.includes('ir hacia')) {
                destino = lower.split('ir hacia')[1]?.trim();
            } else if (lower.includes('necesito ir hacia')) {
                destino = lower.split('necesito ir hacia')[1]?.trim();
            }
            if (destino) {
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

                {/* Ejemplos de comandos de navegación */}
                <ThemedView style={styles.examplesSection}>
                    <ThemedText style={styles.examplesTitle}>Ejemplos de comandos:</ThemedText>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Navegar hacia Hospital Italiano"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Busca y navega al destino</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Ir hacia Obelisco"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Comando alternativo</ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.exampleItem}>
                        <ThemedText style={styles.exampleCommand}>"Necesito ir hacia Plaza de Mayo"</ThemedText>
                        <ThemedText style={styles.exampleDescription}>Comando natural</ThemedText>
                    </ThemedView>
                </ThemedView>

                {/* Botones de prueba rápida */}
                <ThemedView style={styles.quickTestSection}>
                    <ThemedText style={styles.sectionTitle}>Prueba rápida:</ThemedText>
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
                    <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleDirectNavigation('Supermercado')}
                    >
                        <ThemedText style={styles.testButtonText}>🛒 Buscar Supermercado</ThemedText>
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
            // flex: 1,
        paddingBottom: 20,
        backgroundColor: '#f5f5fa',
    },
    content: {
        flex: 1,
        padding: 20,
        paddingBottom: 200
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
        // marginBottom: 32,
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
        marginTop: 'auto',
        paddingBottom: 24, // Solo un pequeño padding para separar del navbar
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
