import React from 'react';
import {
    AccessibilityInfo,
    Alert,
    StyleSheet,
    TouchableOpacity
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useNavigation } from '../../context/NavigationContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

export function NavigationControls() {
  const { state, startNavigation, stopNavigation, repeatInstruction, getCurrentLocation } = useNavigation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleGetLocation = async () => {
    try {
      await getCurrentLocation();
      AccessibilityInfo.announceForAccessibility('Obteniendo ubicación actual');
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación');
    }
  };

  const handleStartNavigation = async () => {
    if (!state.currentLocation) {
      Alert.alert('Ubicación requerida', 'Primero debe obtener su ubicación actual');
      return;
    }

    if (!state.selectedDestination) {
      Alert.alert('Destino requerido', 'Debe seleccionar un destino antes de iniciar la navegación');
      return;
    }

    try {
      await startNavigation();
      AccessibilityInfo.announceForAccessibility('Iniciando navegación');
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar la navegación');
    }
  };

  const handleStopNavigation = () => {
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

  return (
    <ThemedView style={styles.container}>
      {/* Información de ubicación actual */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Ubicación</ThemedText>
        <TouchableOpacity
          style={[
            styles.button,
            styles.locationButton,
            { backgroundColor: state.currentLocation ? colors.tint : colors.tabIconDefault }
          ]}
          onPress={handleGetLocation}
          disabled={state.isLoading}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={state.currentLocation ? "Ubicación obtenida, toca para actualizar" : "Obtener ubicación actual"}
          accessibilityHint="Toca dos veces para obtener o actualizar tu ubicación actual"
        >
          <ThemedText style={[styles.buttonText, { color: 'white' }]}>
            {state.currentLocation ? '📍 Ubicación obtenida' : '📍 Obtener ubicación'}
          </ThemedText>
        </TouchableOpacity>
        
        {state.currentLocation && (
          <ThemedText style={styles.locationText} accessible={true}>
            Lat: {state.currentLocation.latitude.toFixed(4)}, 
            Lng: {state.currentLocation.longitude.toFixed(4)}
          </ThemedText>
        )}
      </ThemedView>

      {/* Controles de navegación */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Navegación</ThemedText>
        
        {!state.isNavigating ? (
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              { 
                backgroundColor: (state.currentLocation && state.selectedDestination) ? colors.tint : colors.tabIconDefault,
                opacity: (state.currentLocation && state.selectedDestination) ? 1 : 0.6
              }
            ]}
            onPress={handleStartNavigation}
            disabled={state.isLoading || !state.currentLocation || !state.selectedDestination}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Iniciar navegación"
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
              style={[styles.button, styles.repeatButton, { backgroundColor: colors.tint }]}
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
            style={[styles.stepInfo, { backgroundColor: colors.tint + '10' }]}
            accessible={true}
            accessibilityLabel={`Paso ${state.currentStepIndex + 1} de ${state.totalSteps}`}
          >
            <ThemedText style={styles.stepCounter}>
              Paso {state.currentStepIndex + 1} de {state.totalSteps}
            </ThemedText>
            <ThemedText style={styles.stepDistance}>
              {state.currentStep.distance.text}
            </ThemedText>
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
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
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
    gap: 12,
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
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