import { MaterialIcons } from '@expo/vector-icons';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Colors } from '../../constants/Colors';
import { AccessibilityContext } from '../../context/AccessibilityContext';
import { useNavigation } from '../../context/NavigationContext';
import { useColorScheme } from '../../hooks/useColorScheme';

export default function MicrophoneScreen() {
    const { voiceStart, voiceGetCommands } = useContext(AccessibilityContext);
    const { searchPlaces, selectDestination } = useNavigation();
    const [isListening, setIsListening] = useState(false);
    const [pulseAnim] = useState(new Animated.Value(1));
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

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

    const handleStartListening = async () => {
        // Por ahora, mostrar instrucciones al usuario sobre comandos disponibles
        Alert.alert(
            'Comandos de Voz Disponibles',
            'Usa estos comandos:\n\n• "Navegar hacia [lugar]"\n• "Ir hacia [lugar]"\n• "Necesito ir hacia [lugar]"\n\nEjemplo: "Navegar hacia Hospital Italiano"',
            [
                {
                    text: 'Entendido',
                    onPress: () => {
                        // Simular que está "escuchando"
                        setIsListening(true);
                        setTimeout(() => setIsListening(false), 2000);
                    }
                }
            ]
        );
    };

    const handleDirectNavigation = async (destination: string) => {
        try {
            // Buscar el destino
            await searchPlaces(destination);
            // Note: En una implementación real, seleccionarías automáticamente el primer resultado
            Alert.alert(
                'Navegación por Voz',
                `Buscando destino: "${destination}". Ve a la pestaña Explore para ver los resultados.`
            );
        } catch (error) {
            Alert.alert('Error', 'No se pudo procesar el destino');
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
        <SafeAreaView style={styles.container}>
            <ThemedView style={styles.content}>
                {/* Header */}
                <ThemedView style={styles.header}>
                    <MaterialIcons name="mic" size={32} color={colors.tint} />
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
                            { backgroundColor: isListening ? '#FF6B6B' : colors.tint }
                        ]}
                        onPress={handleStartListening}
                        disabled={isListening}
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
                        style={[styles.testButton, { backgroundColor: colors.tint }]}
                        onPress={() => handleDirectNavigation('Hospital')}
                    >
                        <ThemedText style={styles.testButtonText}>🏥 Buscar Hospital</ThemedText>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: colors.tint }]}
                        onPress={() => handleDirectNavigation('Farmacia')}
                    >
                        <ThemedText style={styles.testButtonText}>💊 Buscar Farmacia</ThemedText>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: colors.tint }]}
                        onPress={() => handleDirectNavigation('Supermercado')}
                    >
                        <ThemedText style={styles.testButtonText}>🛒 Buscar Supermercado</ThemedText>
                    </TouchableOpacity>
                </ThemedView>
            </ThemedView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5fa',
    },
    content: {
        flex: 1,
        padding: 20,
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
        color: '#2196F3',
    },
    exampleDescription: {
        fontSize: 14,
        marginTop: 4,
        opacity: 0.7,
    },
    quickTestSection: {
        marginTop: 'auto',
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
