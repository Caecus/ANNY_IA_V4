import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Importación condicional de MapView para evitar errores
let MapView: any, Marker: any, Polyline: any, PROVIDER_GOOGLE: any;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default || Maps.MapView;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
} catch (error) {
  console.warn('react-native-maps no está disponible:', error);
}

import colors from '../../assets/colors';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { AccessibleSearch } from '../../components/navigation/AccessibleSearch';
import { NavigationControls } from '../../components/navigation/NavigationControls';
import { Colors } from '../../constants/Colors';
import { useNavigation } from '../../context/NavigationContext';
import { useColorScheme } from '../../hooks/useColorScheme';

const { width, height } = Dimensions.get('window');

interface MapExploreProps {}

export default function MapExplore({}: MapExploreProps) {
  const { state } = useNavigation();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  
  const mapRef = useRef<any>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: -33.4489, // Santiago, Chile por defecto
    longitude: -70.6693,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(false);

  // Actualizar región del mapa cuando cambie la ubicación
  useEffect(() => {
    if (state.currentLocation) {
      const newRegion = {
        latitude: state.currentLocation.latitude,
        longitude: state.currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(newRegion);
      
      // Animar mapa a la nueva ubicación
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    }
  }, [state.currentLocation]);

  // Centrar mapa en la ruta cuando se calcule
  useEffect(() => {
    if (state.currentRoute && state.currentLocation && state.selectedDestination && mapRef.current) {
      const coordinates = [
        {
          latitude: state.currentLocation.latitude,
          longitude: state.currentLocation.longitude,
        },
        {
          latitude: state.selectedDestination.location.lat,
          longitude: state.selectedDestination.location.lng,
        },
      ];
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true,
      });
    }
  }, [state.currentRoute, state.selectedDestination]);

  // Generar polyline de la ruta
  const getRouteCoordinates = () => {
    if (!state.currentRoute) return [];
    
    const coordinates: { latitude: number; longitude: number }[] = [];
    
    state.currentRoute.steps.forEach(step => {
      coordinates.push({
        latitude: step.start_location.lat,
        longitude: step.start_location.lng,
      });
      coordinates.push({
        latitude: step.end_location.lat,
        longitude: step.end_location.lng,
      });
    });
    
    return coordinates;
  };

  const handleMyLocationPress = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos de ubicación para usar esta función');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setMapRegion(newRegion);
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación');
    }
  };

  // Si MapView no está disponible, mostrar interfaz alternativa
  if (!MapView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.fallbackContainer}>
          <MaterialIcons name="map" size={64} color={themeColors.tabIconDefault} />
          <ThemedText style={styles.fallbackTitle}>Mapa no disponible</ThemedText>
          <ThemedText style={styles.fallbackText}>
            Ejecuta 'npx expo prebuild --clean' y 'npx expo run:android' para configurar react-native-maps
          </ThemedText>
        </View>
        
        {/* Panel de Controles siempre disponible */}
        <ThemedView style={styles.fallbackControlsPanel}>
          <ThemedView style={styles.panelHeader}>
            <ThemedText style={styles.panelTitle}>🧭 Navegación por Voz</ThemedText>
          </ThemedView>
          <NavigationControls />
          <AccessibleSearch />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Mapa */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        followsUserLocation={state.isNavigating}
        customMapStyle={colorScheme === 'dark' ? darkMapStyle : []}
      >
        {/* Marcador de destino */}
        {state.selectedDestination && (
          <Marker
            coordinate={{
              latitude: state.selectedDestination.location.lat,
              longitude: state.selectedDestination.location.lng,
            }}
            title={state.selectedDestination.name}
            description="Destino seleccionado"
            pinColor="red"
          />
        )}
        
        {/* Ruta */}
        {state.currentRoute && (
          <Polyline
            coordinates={getRouteCoordinates()}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={state.isNavigating ? [] : [5, 5]}
          />
        )}
      </MapView>

      {/* Botones flotantes */}
      <View style={styles.floatingButtons}>
        {/* Botón Mi Ubicación */}
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: themeColors.background }]}
          onPress={handleMyLocationPress}
          accessible={true}
          accessibilityLabel="Centrar mapa en mi ubicación"
        >
          <MaterialIcons name="my-location" size={24} color={themeColors.tint} />
        </TouchableOpacity>

        {/* Botón Búsqueda */}
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: themeColors.background }]}
          onPress={() => setIsSearchVisible(!isSearchVisible)}
          accessible={true}
          accessibilityLabel="Mostrar búsqueda de destinos"
        >
          <MaterialIcons 
            name={isSearchVisible ? "close" : "search"} 
            size={24} 
            color={themeColors.tint} 
          />
        </TouchableOpacity>

        {/* Botón Controles */}
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: themeColors.background }]}
          onPress={() => setIsControlsVisible(!isControlsVisible)}
          accessible={true}
          accessibilityLabel="Mostrar controles de navegación"
        >
          <MaterialIcons 
            name={isControlsVisible ? "keyboard-arrow-down" : "navigation"} 
            size={24} 
            color={themeColors.tint} 
          />
        </TouchableOpacity>
      </View>

      {/* Panel de Búsqueda */}
      {isSearchVisible && (
        <ThemedView style={styles.searchPanel}>
          <ThemedView style={styles.panelHeader}>
            <ThemedText style={styles.panelTitle}>🔍 Buscar Destino</ThemedText>
            <TouchableOpacity onPress={() => setIsSearchVisible(false)}>
              <MaterialIcons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </ThemedView>
          <AccessibleSearch onDestinationSelected={() => setIsSearchVisible(false)} />
        </ThemedView>
      )}

      {/* Panel de Controles */}
      {isControlsVisible && (
        <ThemedView style={styles.controlsPanel}>
          <ThemedView style={styles.panelHeader}>
            <ThemedText style={styles.panelTitle}>🧭 Navegación</ThemedText>
            <TouchableOpacity onPress={() => setIsControlsVisible(false)}>
              <MaterialIcons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </ThemedView>
          <NavigationControls />
        </ThemedView>
      )}

      {/* Información de navegación activa */}
      {state.isNavigating && (
        <ThemedView style={styles.navigationInfo}>
          <ThemedText style={styles.navigationTitle}>
            🚶 Navegando...
          </ThemedText>
          {state.currentStep && (
            <ThemedText style={styles.navigationStep}>
              Paso {state.currentStepIndex + 1} de {state.totalSteps}: {state.currentStep.distance.text}
            </ThemedText>
          )}
        </ThemedView>
      )}

      {/* Loading indicator */}
      {state.isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={themeColors.tint} />
          <ThemedText style={styles.loadingText}>Procesando...</ThemedText>
        </View>
      )}
    </SafeAreaView>
  );
}

// Estilo de mapa oscuro
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{"color": "#242f3e"}]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#242f3e"}]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#746855"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{"color": "#38414e"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{"color": "#17263c"}]
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  floatingButtons: {
    position: 'absolute',
    top: 60,
    right: 16,
    gap: 12,
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  searchPanel: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 80,
    maxHeight: height * 0.6,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  controlsPanel: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    maxHeight: height * 0.5,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  navigationInfo: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  navigationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  navigationStep: {
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'white',
  },
  // Estilos para fallback cuando MapView no está disponible
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  fallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
  },
  fallbackControlsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.6,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});