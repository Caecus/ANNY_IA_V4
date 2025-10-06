import * as KeepAwake from 'expo-keep-awake';
import React, { useEffect } from 'react';
import {
    AccessibilityInfo,
    ScrollView,
    StatusBar,
    StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { AccessibleSearch } from '../../components/navigation/AccessibleSearch';
import { NavigationControls } from '../../components/navigation/NavigationControls';
import { Colors } from '../../constants/Colors';
import { NavigationProvider, useNavigation } from '../../context/NavigationContext';
import { useColorScheme } from '../../hooks/useColorScheme';

function NavigationScreenContent() {
  const { state } = useNavigation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    // Mantener la pantalla activa durante la navegación
    if (state.isNavigating) {
      KeepAwake.activateKeepAwakeAsync('navigation');
    } else {
      KeepAwake.deactivateKeepAwake('navigation');
    }

    return () => {
      KeepAwake.deactivateKeepAwake('navigation');
    };
  }, [state.isNavigating]);

  useEffect(() => {
    // Configurar accesibilidad de la pantalla
    AccessibilityInfo.announceForAccessibility('Pantalla de navegación accesible cargada');
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background}
      />
      
      <ThemedView style={styles.header}>
        <ThemedText 
          style={styles.title}
          accessible={true}
          accessibilityRole="header"
        >
          🧭 Navegación Accesible
        </ThemedText>
        <ThemedText 
          style={styles.subtitle}
          accessible={true}
        >
          Sistema de navegación para personas con discapacidad visual
        </ThemedText>
      </ThemedView>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        accessible={true}
        accessibilityLabel="Contenido principal de navegación"
      >
        {/* Buscador de destinos */}
        <ThemedView style={styles.section}>
          <ThemedText 
            style={styles.sectionTitle}
            accessible={true}
            accessibilityRole="header"
          >
            🔍 Buscar Destino
          </ThemedText>
          <AccessibleSearch 
            placeholder="¿A dónde deseas ir?"
            onDestinationSelected={(destination: any) => {
              console.log('Destino seleccionado:', destination);
            }}
          />
        </ThemedView>

        {/* Controles de navegación */}
        <ThemedView style={styles.section}>
          <NavigationControls />
        </ThemedView>

        {/* Estado de navegación */}
        {state.isNavigating && (
          <ThemedView style={[styles.section, styles.navigationStatus]}>
            <ThemedText 
              style={styles.sectionTitle}
              accessible={true}
              accessibilityRole="header"
            >
              🚶 Navegando
            </ThemedText>
            <ThemedView 
              style={[styles.statusCard, { backgroundColor: colors.tint + '15' }]}
              accessible={true}
              accessibilityLabel="Estado actual de navegación"
            >
              <ThemedText style={styles.statusText}>
                ✅ Navegación activa
              </ThemedText>
              <ThemedText style={styles.statusSubtext}>
                Sigue las instrucciones de voz para llegar a tu destino
              </ThemedText>
              
              {state.selectedDestination && (
                <ThemedText 
                  style={styles.destinationText}
                  accessible={true}
                  accessibilityLabel={`Navegando hacia ${state.selectedDestination.name}`}
                >
                  📍 {state.selectedDestination.name}
                </ThemedText>
              )}
            </ThemedView>
          </ThemedView>
        )}

        {/* Instrucciones de uso */}
        <ThemedView style={styles.section}>
          <ThemedText 
            style={styles.sectionTitle}
            accessible={true}
            accessibilityRole="header"
          >
            📋 Instrucciones de Uso
          </ThemedText>
          <ThemedView style={styles.instructionsCard}>
            <ThemedText style={styles.instructionItem} accessible={true}>
              1. 📍 Obtén tu ubicación actual
            </ThemedText>
            <ThemedText style={styles.instructionItem} accessible={true}>
              2. 🔍 Busca tu destino escribiendo el nombre
            </ThemedText>
            <ThemedText style={styles.instructionItem} accessible={true}>
              3. ✅ Selecciona el lugar de la lista
            </ThemedText>
            <ThemedText style={styles.instructionItem} accessible={true}>
              4. 🧭 Inicia la navegación
            </ThemedText>
            <ThemedText style={styles.instructionItem} accessible={true}>
              5. 👂 Escucha las instrucciones de voz
            </ThemedText>
            <ThemedText style={styles.instructionItem} accessible={true}>
              6. 🔄 Usa "Repetir" si necesitas oír de nuevo
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Características de accesibilidad */}
        <ThemedView style={styles.section}>
          <ThemedText 
            style={styles.sectionTitle}
            accessible={true}
            accessibilityRole="header"
          >
            ♿ Funciones de Accesibilidad
          </ThemedText>
          <ThemedView style={styles.accessibilityCard}>
            <ThemedText style={styles.accessibilityFeature} accessible={true}>
              🔊 Instrucciones de voz en español
            </ThemedText>
            <ThemedText style={styles.accessibilityFeature} accessible={true}>
              🏃 Navegación optimizada para caminar
            </ThemedText>
            <ThemedText style={styles.accessibilityFeature} accessible={true}>
              🔄 Repetición de instrucciones
            </ThemedText>
            <ThemedText style={styles.accessibilityFeature} accessible={true}>
              🛣️ Anuncios de intersecciones
            </ThemedText>
            <ThemedText style={styles.accessibilityFeature} accessible={true}>
              📱 Compatible con lectores de pantalla
            </ThemedText>
            <ThemedText style={styles.accessibilityFeature} accessible={true}>
              🌙 Soporte para modo oscuro
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function NavigationScreen() {
  return (
    <NavigationProvider>
      <NavigationScreenContent />
    </NavigationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  navigationStatus: {
    paddingHorizontal: 16,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsCard: {
    paddingHorizontal: 16,
  },
  instructionItem: {
    fontSize: 16,
    paddingVertical: 8,
    paddingLeft: 8,
  },
  accessibilityCard: {
    paddingHorizontal: 16,
  },
  accessibilityFeature: {
    fontSize: 15,
    paddingVertical: 6,
    paddingLeft: 8,
  },
});