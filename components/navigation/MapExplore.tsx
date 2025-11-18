import colors from '@/assets/colors';
import { speak } from '@/services/speaker';
import { MaterialIcons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { AccessibleSearch } from '../../components/navigation/AccessibleSearch';
import { NavigationControls } from '../../components/navigation/NavigationControls';
import { Colors } from '../../constants/Colors';
import { useNavigation } from '../../context/NavigationContext';
import { useColorScheme } from '../../hooks/useColorScheme';

const { width, height } = Dimensions.get('window');

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  isMapAvailable = !!(MapView && Marker && Polyline);
} catch (error) {
  console.warn('react-native-maps no está disponible:', error);
  isMapAvailable = false;
}

type RouteParams = {
  voiceDestination?: string;
};

interface MapExploreProps {}

export default function MapExplore({}: MapExploreProps) {
  const { state, searchPlaces, stopNavigation } = useNavigation();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const mapRef = useRef<any>(null);

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

  const { getCurrentLocation } = useNavigation();
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const [spokenSteps, setSpokenSteps] = useState<Set<number>>(new Set());
  const [allStepsSpoken, setAllStepsSpoken] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Función para limpiar navegación
  const resetNavigationState = () => {
    setSpokenSteps(new Set());
    setAllStepsSpoken(false);
    setCurrentStepIndex(0);
  };

  // Dictado reactivo basado en ubicación (no cambia)
  useEffect(() => {
    if (
      !state.isNavigating ||
      !state.currentRoute ||
      !state.currentRoute.steps ||
      !state.currentLocation
    )
      return;

    const steps = state.currentRoute.steps;
    if (spokenSteps.size === steps.length && !allStepsSpoken) {
      setAllStepsSpoken(true);
      speak('Ha llegado a su destino');
    }
    if (allStepsSpoken) return;

    steps.forEach((step: any, idx: number) => {
      if (spokenSteps.has(idx)) return;
      const target = step.start_location || step.end_location;
      if (!target) return;
      const dist = getDistanceMeters(
        state.currentLocation.latitude,
        state.currentLocation.longitude,
        target.lat,
        target.lng
      );
      if (dist < 30) {
        let instruction = '';
        const mode = String(step.travel_mode).toLowerCase();
        if (mode === 'walking') {
          instruction = `Paso ${idx + 1}: ${step.html_instructions?.replace(/<[^>]*>/g, '')}`;
        } else if (mode === 'transit' && step.transit_details) {
          const t = step.transit_details;
          instruction = `Paso ${idx + 1}: Toma el colectivo ${t.line?.short_name || ''} (${t.line?.name || ''}) desde ${t.departure_stop?.name || ''} hasta ${t.arrival_stop?.name || ''}. Salida: ${t.departure_time?.text || ''}, llegada: ${t.arrival_time?.text || ''}. Duración: ${t.duration?.text || ''}`;
          if (t.line?.agencies) {
            instruction += `. Operado por: ${t.line.agencies.map((a: any) => a.name).join(', ')}`;
          }
        } else if (mode === 'driving') {
          instruction = `Paso ${idx + 1}: ${step.html_instructions?.replace(/<[^>]*>/g, '')}`;
        }
        if (step.crosswalk || step.intersection) {
          instruction += `. Prepárate para cruzar en ${step.crosswalk?.name || step.intersection?.name || 'la próxima intersección'}`;
        }
        if (instruction) {
          speak(instruction);
          setSpokenSteps(prev => new Set(prev).add(idx));
          setCurrentStepIndex(idx);
        }
      }
    });
  }, [state.currentLocation, state.currentRoute, spokenSteps, allStepsSpoken]);

  // Aviso de distancia solo si el usuario NO ha llegado
  useEffect(() => {
    if (
      !state.isNavigating ||
      !state.currentRoute ||
      !state.currentRoute.steps ||
      !state.currentLocation
    ) return;

    const steps = state.currentRoute.steps;
    let interval: NodeJS.Timeout | null = null;

    // Guardar la última distancia anunciada
    let lastAnnouncedDistance = -1;
    const announceDistance = () => {
      const nextIdx = steps.findIndex((step, idx) => !spokenSteps.has(idx));
      if (nextIdx === -1) return;
      const target = steps[nextIdx].start_location || steps[nextIdx].end_location;
      if (!target) return;

      const dist = getDistanceMeters(
        state.currentLocation.latitude,
        state.currentLocation.longitude,
        target.lat,
        target.lng
      );
      if (dist <= 30) {
        setSpokenSteps(prev => new Set(prev).add(nextIdx));
        lastAnnouncedDistance = -1;
        return;
      }
      // Solo anunciar si la distancia cambia al menos 5 metros
      if (lastAnnouncedDistance === -1 || Math.abs(dist - lastAnnouncedDistance) >= 5) {
        let text = `Faltan ${Math.max(0, Math.round(dist))} metros para el próximo paso.`;
        // ...eliminar referencias a crosswalk/intersection si no existen en el modelo...
        speak(text);
        lastAnnouncedDistance = dist;
      }
    };

    interval = setInterval(announceDistance, 8000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    state.isNavigating,
    state.currentRoute,
    state.currentLocation,
    spokenSteps,
  ]);

  useEffect(() => {
    if (allStepsSpoken) {
      stopNavigation();
    }
  }, [allStepsSpoken, stopNavigation]);

  useEffect(() => {
    const voiceDestination = route.params?.voiceDestination;
    if (voiceDestination) {
      setIsSearchVisible(true);
      speak('Ya estás en el explorador. Procesando tu destino: ' + voiceDestination);
      Alert.alert('Explorador', 'Procesando destino: ' + voiceDestination);
      searchPlaces(voiceDestination);
    }
  }, [route.params?.voiceDestination, searchPlaces]);

  useEffect(() => {
    if (state.currentLocation) {
      const newRegion = {
        latitude: state.currentLocation.latitude,
        longitude: state.currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(newRegion);

      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    }
  }, [state.currentLocation]);

  const getRouteCoordinates = () => {
    if (!state.currentRoute || !state.currentRoute.steps) return [];
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
    return coordinates.length > 1 ? coordinates : [];
  };

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

  const getSegmentedPolylines = () => {
    if (!state.currentRoute || !state.currentRoute.steps) return [];
    const segments = [];
    let currentSegment = [];
    let currentMode = null;
    state.currentRoute.steps.forEach((step, idx) => {
      const mode = String(step.travel_mode).toUpperCase();
      if (currentMode !== mode) {
        if (currentSegment.length > 1) {
          segments.push({ coordinates: [...currentSegment], mode: currentMode });
        }
        currentSegment = [];
        currentMode = mode;
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

  useEffect(() => {
    if (state.isLoading && state.isNavigating) {
      speak('Procesando búsqueda o navegación, por favor espera.');
    }
  }, [state.isLoading, state.isNavigating]);

  return (
    <SafeAreaView style={styles.container}>
      {isMapAvailable ? (
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
        >
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
      ) : (
        <View style={styles.fallbackContainer}>
          <MaterialIcons name="map" size={120} color="#CCC" />
          <ThemedText style={styles.fallbackTitle}>
            Mapa no disponible
          </ThemedText>
          <ThemedText style={styles.fallbackText}>
            No se pudo cargar el componente de mapa en este dispositivo.
          </ThemedText>
        </View>
      )}
      <View style={styles.floatingButtons}>
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

      {state.isNavigating && (
        <TouchableOpacity
          style={styles.cancelNavButton}
          onPress={() => {
            stopNavigation();
            resetNavigationState();
            speak('Navegación detenida');
          }}
          accessible={true}
          accessibilityLabel="Detener navegación"
        >
          <MaterialIcons name="cancel" size={24} color="#c00" />
          <ThemedText style={styles.cancelNavText}>Detener Navegación</ThemedText>
        </TouchableOpacity>
      )}

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

      {state.isNavigating && (
        <ThemedView style={styles.navigationInfo}>
          <ThemedText style={styles.navigationTitle}>
            🚶 Navegando...
          </ThemedText>
          {state.currentRoute && state.currentRoute.steps && (
            <ThemedText style={styles.navigationStep}>
              Paso {currentStepIndex + 1} de {state.currentRoute.steps.length}: {state.currentRoute.steps[currentStepIndex]?.distance?.text ?? ''}
            </ThemedText>
          )}
        </ThemedView>
      )}
      {state.isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={themeColors.tint} />
          <ThemedText style={styles.loadingText}>Procesando...</ThemedText>
        </View>
      )}
    </SafeAreaView>
  );
}

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
