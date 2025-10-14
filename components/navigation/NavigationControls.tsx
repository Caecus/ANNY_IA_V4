import colors from '@/assets/colors';
import * as Speech from 'expo-speech';
import React from 'react';
import {
    AccessibilityInfo,
    Alert, Dimensions, ScrollView, StyleSheet,
    TouchableOpacity
} from 'react-native';
import { useNavigation } from '../../context/NavigationContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

const { width, height } = Dimensions.get('window');

export function NavigationControls() {
  const { state, startNavigation, stopNavigation, repeatInstruction, getCurrentLocation } = useNavigation();
  const colorScheme = useColorScheme();
  const [navigationMode, setNavigationMode] = React.useState<'walking' | 'transit' | 'driving'>('walking');

    const speak = (text: string) => {
        Speech.speak(text, { language: 'es-ES', rate: 0.9 });
    };

  const handleGetLocation = async () => {
    try {
      await getCurrentLocation();
      AccessibilityInfo.announceForAccessibility('Obteniendo ubicación actual');
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación');
      speak('No se pudo obtener la ubicación');
    }
  };

  const handleStartNavigation = async () => {
    if (!state.currentLocation) {
      Alert.alert('Ubicación requerida', 'Primero debe obtener su ubicación actual');
      speak('Ubicación requerida. Primero debe obtener su ubicación actual');
      return;
    }

    if (!state.selectedDestination) {
      Alert.alert('Destino requerido', 'Debe seleccionar un destino antes de iniciar la navegación');
      speak('Destino requerido. Debe seleccionar un destino antes de iniciar la navegación');
      return;
    }

    try {
      await startNavigation(navigationMode);
      AccessibilityInfo.announceForAccessibility(`Iniciando navegación modo ${navigationMode === 'walking' ? 'a pie' : navigationMode === 'transit' ? 'colectivo' : 'auto'}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar la navegación');
      speak('No se pudo iniciar la navegación');
    }
  };

  const handleStopNavigation = () => {
    speak('¿Está seguro de que desea detener la navegación?');
    Alert.alert(
      'Detener navegación',
      '¿Está seguro de que desea detener la navegación?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Detener',
          style: 'destructive',
          onPress: () => {
            stopNavigation();
            AccessibilityInfo.announceForAccessibility('Navegación detenida');
          },
        },
      ]
    );
  };

  const handleRepeatInstruction = () => {
    if (state.isNavigating) {
      repeatInstruction();
      AccessibilityInfo.announceForAccessibility('Repitiendo instrucción');
    } else {
      Alert.alert('Sin navegación', 'No hay navegación activa para repetir instrucciones');
    }
  };

  // Estado para dirección amigable
  const [friendlyAddress, setFriendlyAddress] = React.useState<string | null>(null);
  React.useEffect(() => {
    async function fetchAddress() {
      if (state.currentLocation) {
        try {
          const geocode = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${state.currentLocation.latitude},${state.currentLocation.longitude}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAP_KEY}`);
          const data = await geocode.json();
          if (data.results && data.results.length > 0) {
            setFriendlyAddress(data.results[0].formatted_address);
          } else {
            setFriendlyAddress(null);
          }
        } catch {
          setFriendlyAddress(null);
        }
      } else {
        setFriendlyAddress(null);
      }
    }
    fetchAddress();
  }, [state.currentLocation]);

  return (
    <ScrollView
      style={[styles.scrollContainer]}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={styles.container}>
      {/* Controles de navegación */}
      <ThemedView style={styles.section}>
        {/* Selector de modo de navegación */}
        {!state.isNavigating && (
          <ThemedView style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeButton, navigationMode === 'walking' && styles.modeButtonActive]}
              onPress={() => setNavigationMode('walking')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Modo a pie"
              accessibilityHint="Selecciona navegación a pie"
            >
              <ThemedText style={styles.modeButtonText}>🚶‍♂️ A pie</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, navigationMode === 'transit' && styles.modeButtonActive]}
              onPress={() => setNavigationMode('transit')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Modo colectivo"
              accessibilityHint="Selecciona navegación en colectivo"
            >
              <ThemedText style={styles.modeButtonText}>🚌 Colectivo</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
        {/* Botón iniciar/detener navegación */}
        {!state.isNavigating ? (
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              { 
                backgroundColor: (state.currentLocation && state.selectedDestination) ? colors.secondary : colors.primary,
                opacity: (state.currentLocation && state.selectedDestination) ? 1 : 0.6
              }
            ]}
            onPress={handleStartNavigation}
            disabled={state.isLoading || !state.currentLocation || !state.selectedDestination}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Iniciar navegación modo ${navigationMode}`}
            accessibilityHint="Toca dos veces para comenzar la navegación al destino seleccionado"
          >
            <ThemedText style={[styles.buttonText, styles.primaryButtonText]}>
              🧭 Iniciar Navegación
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <ThemedView style={styles.navigationActive}>
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStopNavigation}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Detener navegación"
              accessibilityHint="Toca dos veces para detener la navegación actual"
            >
              <ThemedText style={[styles.buttonText, { color: 'white' }]}>
                ⏹️ Detener Navegación
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.repeatButton, { backgroundColor: colors.primary }]}
              onPress={handleRepeatInstruction}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Repetir instrucción"
              accessibilityHint="Toca dos veces para repetir la última instrucción de navegación"
            >
              <ThemedText style={[styles.buttonText, { color: 'white' }]}>
                🔄 Repetir Instrucción
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ThemedView>

      {/* Información del paso actual */}
      {state.isNavigating && state.currentStep && (
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Paso Actual</ThemedText>
          <ThemedView 
            style={[styles.stepInfo, { backgroundColor: colors.secondary + '10' }]}
            accessible={true}
            accessibilityLabel={`Paso ${state.currentStepIndex + 1} de ${state.totalSteps}`}
          >
            <ThemedText style={styles.stepCounter}>
              Paso {state.currentStepIndex + 1} de {state.totalSteps}
            </ThemedText>
            <ThemedText style={styles.stepDistance}>
              {state.currentStep.distance.text}
            </ThemedText>
            {/* Mostrar detalles de colectivo si existen */}
            {state.currentStep.transit_details ? (
              <>
                {console.log('[TRANSIT]', state.currentStep.transit_details)}
                <ThemedText style={styles.stepTransit}>
                  {`Toma el colectivo ${state.currentStep.transit_details.line?.short_name || ''} (${state.currentStep.transit_details.line?.name || ''}) desde ${state.currentStep.transit_details.departure_stop?.name || ''} hasta ${state.currentStep.transit_details.arrival_stop?.name || ''}. Salida: ${state.currentStep.transit_details.departure_time?.text || ''}, llegada: ${state.currentStep.transit_details.arrival_time?.text || ''}. Duración: ${state.currentStep.transit_details.duration?.text || ''}`}
                </ThemedText>
                {state.currentStep.transit_details.line?.agencies && (
                  <ThemedText style={styles.stepTransitAgency}>
                    {`Operado por: ${state.currentStep.transit_details.line.agencies.map(a => a.name).join(', ')}`}
                  </ThemedText>
                )}
                {/* TTS para colectivo */}
                {(() => {
                  const ttsMsg = `Toma el colectivo ${state.currentStep.transit_details.line?.short_name || ''} (${state.currentStep.transit_details.line?.name || ''}) desde ${state.currentStep.transit_details.departure_stop?.name || ''} hasta ${state.currentStep.transit_details.arrival_stop?.name || ''}. Salida: ${state.currentStep.transit_details.departure_time?.text || ''}, llegada: ${state.currentStep.transit_details.arrival_time?.text || ''}. Duración: ${state.currentStep.transit_details.duration?.text || ''}`;
                  speak(ttsMsg);
                  if (state.currentStep.transit_details.line?.agencies) {
                    speak(`Operado por: ${state.currentStep.transit_details.line.agencies.map(a => a.name).join(', ')}`);
                  }
                  return null;
                })()}
              </>
            ) : (
              <>
                {(() => { console.log('[STEP]', state.currentStep); return null; })()}
                <ThemedText style={styles.stepInstruction}>
                  {state.currentStep.html_instructions?.replace(/<[^>]*>/g, '')}
                </ThemedText>
              </>
            )}
          </ThemedView>
        </ThemedView>
      )}

      {/* Indicador de carga */}
      {state.isLoading && (
        <ThemedView style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText} accessible={true}>
            Procesando...
          </ThemedText>
        </ThemedView>
      )}

      {/* Mensaje de error */}
      {state.error && (
        <ThemedView style={styles.errorContainer}>
          <ThemedText 
            style={[styles.errorText, { color: '#FF6B6B' }]}
            accessible={true}
            accessibilityLiveRegion="assertive"
          >
            {state.error}
          </ThemedText>
        </ThemedView>
      )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stepTransit: {
    fontSize: 15,
    color: '#1a237e',
    marginTop: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  stepTransitAgency: {
    fontSize: 13,
    color: '#3949ab',
    marginTop: 4,
    textAlign: 'center',
  },
  stepInstruction: {
    fontSize: 15,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  modeButtonActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  modeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    minHeight: 220,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 24,
    paddingBottom: 24,
    width: '100%',
    alignSelf: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  locationButton: {
    // Color se maneja dinámicamente
  },
  primaryButton: {
    // Color se maneja dinámicamente
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
  },
  navigationActive: {
    gap: 12
  },
  stopButton: {
    backgroundColor: colors.secondary,
  },
  repeatButton: {
    // Color se maneja dinámicamente
  },
  locationText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  stepInfo: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  stepCounter: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stepDistance: {
    fontSize: 14,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});