import { MaterialIcons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
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

type RouteParams = {
  voiceDestination?: string;
};
// Importación condicional de MapView para evitar errores
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;
let isMapAvailable = false;

try {
  const Maps = require('react-native-maps');
  MapView = Maps.default || Maps.MapView;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  // Verificar que realmente esté disponible
  isMapAvailable = !!(MapView && Marker && Polyline);
} catch (error) {
  console.warn('react-native-maps no está disponible:', error);
  isMapAvailable = false;
}

import colors from '@/assets/colors';
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
  const { state, searchPlaces, stopNavigation, startNavigation } = useNavigation();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  
  const mapRef = useRef<any>(null);
  // Usar ubicación actual si está disponible, sino fallback a Córdoba, Argentina
  const cordobaCoords = { latitude: -31.4167, longitude: -64.1833 };
  const initialRegion = state.currentLocation
    ? {
        latitude: state.currentLocation.latitude,
        longitude: state.currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: cordobaCoords.latitude,
        longitude: cordobaCoords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
  const [mapRegion, setMapRegion] = useState(initialRegion);
  // TTS amigable
  const speak = (text: string) => {
    Speech.speak(text, { language: 'es-ES', rate: 0.9 });
  };
  // Ejecutar getCurrentLocation del contexto al montar la pantalla
  const { getCurrentLocation } = useNavigation();
  useEffect(() => {
    getCurrentLocation();
  }, []);
  
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const [travelMode, setTravelMode] = useState<'walking' | 'transit' | 'driving'>('walking');

  // Manejar navegación iniciada por comando de voz
  useEffect(() => {
    const voiceDestination = route.params?.voiceDestination;
    if (voiceDestination) {
      setIsSearchVisible(true);
      speak('Ya estás en el explorador. Procesando tu destino: ' + voiceDestination);
      Alert.alert('Explorador', 'Procesando destino: ' + voiceDestination);
      // Buscar automáticamente el destino mencionado por voz y avisar
  searchPlaces(voiceDestination);
    }
  }, [route.params?.voiceDestination, searchPlaces, travelMode]);

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

    // Generar polyline de la ruta (sin duplicados, mínimo dos puntos)
  const getRouteCoordinates = () => {
    if (!state.currentRoute || !state.currentRoute.steps) return [];
    console.log(state.currentRoute, 'SOY LA RUTA=>>>>>>>>>>>')
    const coordinates: { latitude: number; longitude: number }[] = [];
    state.currentRoute.steps.forEach((step, idx) => {
      if (step.start_location) {
        const current = {
          latitude: step.start_location.lat,
          longitude: step.start_location.lng,
        };
        if (
          coordinates.length === 0 ||
          coordinates[coordinates.length - 1].latitude !== current.latitude ||
          coordinates[coordinates.length - 1].longitude !== current.longitude
        ) {
          coordinates.push(current);
        }
      }
      if (step.end_location) {
        const current = {
          latitude: step.end_location.lat,
          longitude: step.end_location.lng,
        };
        if (
          coordinates.length === 0 ||
          coordinates[coordinates.length - 1].latitude !== current.latitude ||
          coordinates[coordinates.length - 1].longitude !== current.longitude
        ) {
          coordinates.push(current);
        }
      }
    });
    // Solo retorna si hay al menos dos puntos
    return coordinates.length > 1 ? coordinates : [];
  };

  // Centrar mapa en todos los puntos de la Polyline roja
  useEffect(() => {
    if (state.currentRoute && mapRef.current) {
      const polylineCoords = getRouteCoordinates();
      if (polylineCoords.length > 1) {
        mapRef.current.fitToCoordinates(polylineCoords, {
          edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
          animated: true,
        });
      }
    }
  }, [state.currentRoute]);

  // Genera polylines separadas para cada tramo (caminar, colectivo, caminar)
  const getSegmentedPolylines = () => {
    if (!state.currentRoute || !state.currentRoute.steps) return [];
    const segments = [];
    let currentSegment = [];
    let currentMode = null;
    state.currentRoute.steps.forEach((step, idx) => {
      // Detecta cambio de modo
      if (currentMode !== step.travel_mode) {
        if (currentSegment.length > 1) {
          segments.push({ coordinates: [...currentSegment], mode: currentMode });
        }
        currentSegment = [];
        currentMode = step.travel_mode;
      }
      if (step.start_location) {
        currentSegment.push({
          latitude: step.start_location.lat,
          longitude: step.start_location.lng,
        });
      }
      if (step.end_location) {
        currentSegment.push({
          latitude: step.end_location.lat,
          longitude: step.end_location.lng,
        });
      }
    });
    if (currentSegment.length > 1) {
      segments.push({ coordinates: [...currentSegment], mode: currentMode });
    }
    return segments;
  };

  const handleMyLocationPress = async () => {
    try {
      speak('Obteniendo tu ubicación actual, por favor espera...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos de ubicación para usar esta función');
        speak('Por favor, permite el acceso a tu ubicación para centrar el mapa.');
        setMapRegion({
          latitude: cordobaCoords.latitude,
          longitude: cordobaCoords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        return;
      }
      // Timeout robusto para obtener ubicación
      let location: Location.LocationObject | undefined;
      try {
        location = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000)),
        ]) as Location.LocationObject;
      } catch (err) {
        if (err instanceof Error && err.message === 'timeout') {
          Alert.alert('Error', 'La obtención de ubicación tardó demasiado. Mostrando Córdoba, Argentina.');
          speak('No se pudo obtener tu ubicación a tiempo. Mostrando Córdoba, Argentina en el mapa.');
          setMapRegion({
            latitude: cordobaCoords.latitude,
            longitude: cordobaCoords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          return;
        }
        throw err;
      }
      if (!location || typeof location !== 'object' || !('coords' in location) || !location.coords) {
        Alert.alert('Error', 'No se pudo obtener la ubicación del dispositivo. Mostrando Córdoba, Argentina.');
        speak('No se pudo obtener tu ubicación. Mostrando Córdoba, Argentina en el mapa.');
        setMapRegion({
          latitude: cordobaCoords.latitude,
          longitude: cordobaCoords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        return;
      }
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(newRegion);
      speak('Mapa centrado en tu ubicación actual.');
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación del dispositivo. Mostrando Córdoba, Argentina.');
      speak('No se pudo obtener tu ubicación. Mostrando Córdoba, Argentina en el mapa.');
      setMapRegion({
        latitude: cordobaCoords.latitude,
        longitude: cordobaCoords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

    // TTS para loading amigable (hook debe ir fuera del render)
  useEffect(() => {
    console.log('[Ubicación] useEffect state.isLoading:', state.isLoading);
    if (state.isLoading) {
      speak('Procesando búsqueda o navegación, por favor espera.');
    }
  }, [state.isLoading]);

    // TTS para cada segmento al iniciar navegación
  useEffect(() => {
    if (!state.currentRoute || !state.currentRoute.steps) return;
    if (!state.isNavigating) return;
    state.currentRoute.steps.forEach((step, idx) => {
      if (step.travel_mode === 'walking') {
        speak(`Tramo ${idx + 1}: Camina. ${step.html_instructions?.replace(/<[^>]*>/g, '')}`);
      } else if (step.travel_mode === 'transit' && step.transit_details) {
        const t = step.transit_details;
        speak(`Tramo ${idx + 1}: Toma el colectivo ${t.line?.short_name || ''} (${t.line?.name || ''}) desde ${t.departure_stop?.name || ''} hasta ${t.arrival_stop?.name || ''}. Salida: ${t.departure_time?.text || ''}, llegada: ${t.arrival_time?.text || ''}. Duración: ${t.duration?.text || ''}`);
        if (t.line?.agencies) {
          speak(`Operado por: ${t.line.agencies.map(a => a.name).join(', ')}`);
        }
      } else if (step.travel_mode === 'driving') {
        speak(`Tramo ${idx + 1}: Maneja. ${step.html_instructions?.replace(/<[^>]*>/g, '')}`);
      }
    });
  }, [state.currentRoute, state.isNavigating]);

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
        // customMapStyle={colorScheme === 'dark' ? darkMapStyle : []}
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
        {/* Pintar cada segmento con color según modo */}
        {state.currentRoute && getSegmentedPolylines().map((segment, idx) => (
          <Polyline
            key={idx}
            coordinates={segment.coordinates}
            strokeColor={
              segment.mode === 'WALKING' ? 'blue' :
              segment.mode === 'TRANSIT' ? 'green' :
              segment.mode === 'DRIVING' ? 'orange' : 'red'
            }
            strokeWidth={6}
          />
        ))}
      </MapView>

      {/* Botones flotantes */}
      <View style={styles.floatingButtons}>
        {/* Botón Búsqueda */}
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: themeColors.background }]}
          onPress={() => setIsSearchVisible(!isSearchVisible)}
          accessible={true}
          accessibilityLabel="Mostrar búsqueda de destinos"
        >
          <MaterialIcons 
            name={isSearchVisible ? "close" : "search"} 
            size={36} 
            color={colors.primary} 
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
            size={36} 
            color={colors.primary} 
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

      {/* Información de navegación activa y depuración */}
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
    paddingTop: 10
  },
  map: {
    flex: 1,
    minHeight: 320,
    minWidth: '100%',
    maxHeight: height,
    maxWidth: '100%',
    borderRadius: 0,
  },
  floatingButtons: {
    position: 'absolute',
    top: 96,
    right: 8,
    gap: 12,
    zIndex: 10,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  floatingButton: {
    width: 66,
    height: 66,
    borderRadius: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 1000,
    marginBottom: 8,
  },
  cancelNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#c00',
    elevation: 2,
  },
  cancelNavText: {
    color: '#c00',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 15,
  },
  debugPanel: {
    marginTop: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#333',
  },
  searchPanel: {
    position: 'absolute',
    top: 80,
    left: 8,
    right: 72,
    maxHeight: height * 0.5,
    minWidth: 220,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },
  controlsPanel: {
    position: 'absolute',
    bottom: 16,
    left: 8,
    right: 8,
    maxHeight: height * 0.45,
    minWidth: 220,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
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
    top: 80,
    left: 8,
    right: 8,
    padding: 12,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 3,
    minWidth: 220,
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
    backgroundColor: 'rgba(0,0,0,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
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