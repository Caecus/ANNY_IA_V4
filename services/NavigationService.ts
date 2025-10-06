import axios from 'axios';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';

export interface NavigationStep {
  html_instructions: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
  maneuver?: string;
}

export interface NavigationRoute {
  steps: NavigationStep[];
  overview_polyline: { points: string };
  bounds: any;
  legs: any[];
}

export interface Intersection {
  distance: number;
  street1: string;
  street2: string;
  coordinates: { lat: number; lng: number };
}

export interface PlaceAutocomplete {
  description: string;
  place_id: string;
  reference?: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

class NavigationService {
  private googleMapsApiKey: string;
  private backendApiUrl: string;
  private intersectionsApiUrl: string;
  private currentRoute: NavigationRoute | null = null;
  private currentStepIndex: number = 0;
  private isNavigating: boolean = false;
  private locationSubscription: Location.LocationSubscription | null = null;
  private speechQueue: string[] = [];
  private isSpeaking: boolean = false;

  constructor() {
    // Estas variables las obtendrás de tu .env
    this.googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAP_KEY || '';
    this.backendApiUrl = process.env.EXPO_PUBLIC_APP_API_URL || '';
    this.intersectionsApiUrl = process.env.EXPO_PUBLIC_APP_API_URL_INTERSECTIONS || '';
  }

  /**
   * Solicitar permisos de ubicación
   */
  async requestLocationPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        this.speak('Permisos de ubicación denegados. La navegación no funcionará correctamente.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error solicitando permisos de ubicación:', error);
      return false;
    }
  }

  /**
   * Obtener ubicación actual del usuario
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location;
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      this.speak('No se pudo obtener su ubicación actual');
      return null;
    }
  }

  /**
   * Autocompletado de lugares usando Google Places API
   */
  async searchPlaces(query: string): Promise<PlaceAutocomplete[]> {
    if (query.length < 2) return [];

    try {
      // Usar tu backend como proxy si está configurado
      if (this.backendApiUrl) {
        const response = await axios.get(`${this.backendApiUrl}/destination/placesautocomplete/${query}`);
        return response.data;
      } else {
        // Llamada directa a Google Places API
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${this.googleMapsApiKey}&language=es`
        );
        return response.data.predictions;
      }
    } catch (error) {
      console.error('Error buscando lugares:', error);
      this.speak('Error buscando lugares');
      return [];
    }
  }

  /**
   * Obtener detalles de un lugar específico
   */
  async getPlaceDetails(placeId: string, reference?: string): Promise<any> {
    try {
      const url = reference 
        ? `https://maps.googleapis.com/maps/api/place/details/json?reference=${reference}&sensor=true&key=${this.googleMapsApiKey}`
        : `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${this.googleMapsApiKey}`;
      
      const response = await axios.get(url);
      return response.data.result;
    } catch (error) {
      console.error('Error obteniendo detalles del lugar:', error);
      throw error;
    }
  }

  /**
   * Calcular ruta usando Google Directions API
   */
  async calculateRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'walking' | 'driving' | 'transit' = 'walking'
  ): Promise<NavigationRoute | null> {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?mode=${mode}&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${this.googleMapsApiKey}&language=es`,
        { headers: { 'accept-language': 'es,en;q=0.9' } }
      );

      if (response.data.routes && response.data.routes.length > 0) {
        this.currentRoute = response.data.routes[0];
        this.currentStepIndex = 0;
        return this.currentRoute;
      } else {
        this.speak('No se encontró una ruta al destino');
        return null;
      }
    } catch (error) {
      console.error('Error calculando ruta:', error);
      this.speak('Error calculando la ruta');
      return null;
    }
  }

  /**
   * Iniciar navegación paso a paso
   */
  async startNavigation(route: NavigationRoute): Promise<void> {
    if (!route || !route.steps || route.steps.length === 0) {
      this.speak('No hay ruta para navegar');
      return;
    }

    this.currentRoute = route;
    this.currentStepIndex = 0;
    this.isNavigating = true;

    // Anunciar inicio de navegación
    const totalDistance = route.legs[0]?.distance?.text || 'distancia desconocida';
    const totalDuration = route.legs[0]?.duration?.text || 'tiempo desconocido';
    
    this.speak(`Iniciando navegación. Distancia total: ${totalDistance}. Tiempo estimado: ${totalDuration}`);
    
    // Dar primera instrucción
    this.announceCurrentStep();

    // Iniciar seguimiento de ubicación
    await this.startLocationTracking();
  }

  /**
   * Detener navegación
   */
  stopNavigation(): void {
    this.isNavigating = false;
    this.currentRoute = null;
    this.currentStepIndex = 0;
    
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    this.speak('Navegación detenida');
  }

  /**
   * Anunciar paso actual
   */
  private announceCurrentStep(): void {
    if (!this.currentRoute || !this.isNavigating) return;

    const step = this.currentRoute.steps[this.currentStepIndex];
    if (!step) return;

    // Limpiar instrucciones HTML
    const instruction = this.cleanHtmlInstructions(step.html_instructions);
    const distance = step.distance.text;

    this.speak(`En ${distance}, ${instruction}`);
  }

  /**
   * Limpiar instrucciones HTML
   */
  private cleanHtmlInstructions(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remover tags HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Iniciar seguimiento de ubicación en tiempo real
   */
  private async startLocationTracking(): Promise<void> {
    try {
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Cada 1 segundo
          distanceInterval: 5, // Cada 5 metros
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );
    } catch (error) {
      console.error('Error iniciando seguimiento de ubicación:', error);
    }
  }

  /**
   * Manejar actualizaciones de ubicación
   */
  private handleLocationUpdate(location: Location.LocationObject): void {
    if (!this.isNavigating || !this.currentRoute) return;

    const currentStep = this.currentRoute.steps[this.currentStepIndex];
    if (!currentStep) return;

    // Verificar si llegó al final del paso actual
    const distanceToStepEnd = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      currentStep.end_location.lat,
      currentStep.end_location.lng
    );

    // Si está a menos de 20 metros del final del paso, avanzar al siguiente
    if (distanceToStepEnd < 20) {
      this.moveToNextStep();
    }

    // Verificar intersecciones cercanas (cada 5 segundos para no saturar)
    this.checkNearbyIntersections(location.coords.latitude, location.coords.longitude);
  }

  /**
   * Avanzar al siguiente paso
   */
  private moveToNextStep(): void {
    if (!this.currentRoute) return;

    this.currentStepIndex++;

    if (this.currentStepIndex >= this.currentRoute.steps.length) {
      // Llegó al destino
      this.speak('Ha llegado a su destino');
      this.stopNavigation();
    } else {
      // Anunciar siguiente paso
      setTimeout(() => {
        this.announceCurrentStep();
      }, 1000);
    }
  }

  /**
   * Verificar intersecciones cercanas
   */
  private async checkNearbyIntersections(lat: number, lng: number): Promise<void> {
    try {
      if (!this.intersectionsApiUrl) return;

      const response = await axios.post(`${this.intersectionsApiUrl}/api/v1/intersection/nearest`, {
        latitude: lat,
        longitude: lng,
        geocoding: {
          route: '',
          locality: '',
          administrative_area_level_1: '',
          administrative_area_level_2: '',
          country: ''
        }
      });

      const intersections: Intersection[] = response.data;
      
      if (intersections && intersections.length > 0) {
        const nearest = intersections.reduce((prev, curr) => 
          prev.distance < curr.distance ? prev : curr
        );

        // Si está a 15 metros o menos de una intersección
        if (nearest.distance <= 15) {
          this.speak(`Intersección: ${nearest.street1} con ${nearest.street2}`);
        }
      }
    } catch (error) {
      console.error('Error verificando intersecciones:', error);
    }
  }

  /**
   * Calcular distancia entre dos puntos (fórmula de Haversine)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Sistema de Text-to-Speech con cola
   */
  async speak(text: string): Promise<void> {
    console.log('🔊 TTS:', text);
    
    this.speechQueue.push(text);
    
    if (!this.isSpeaking) {
      await this.processNextSpeech();
    }
  }

  private async processNextSpeech(): Promise<void> {
    if (this.speechQueue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;
    const text = this.speechQueue.shift()!;

    try {
      await Speech.speak(text, {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.8, // Velocidad más lenta para mejor comprensión
        onDone: () => {
          this.processNextSpeech();
        },
        onStopped: () => {
          this.processNextSpeech();
        },
        onError: () => {
          this.processNextSpeech();
        }
      });
    } catch (error) {
      console.error('Error en TTS:', error);
      this.processNextSpeech();
    }
  }

  /**
   * Detener TTS actual
   */
  stopSpeaking(): void {
    Speech.stop();
    this.speechQueue = [];
    this.isSpeaking = false;
  }

  /**
   * Repetir última instrucción
   */
  repeatLastInstruction(): void {
    if (this.currentRoute && this.isNavigating) {
      this.announceCurrentStep();
    } else {
      this.speak('No hay navegación activa');
    }
  }

  /**
   * Obtener información del paso actual
   */
  getCurrentStepInfo(): { step: NavigationStep | null; stepIndex: number; totalSteps: number } {
    if (!this.currentRoute) {
      return { step: null, stepIndex: 0, totalSteps: 0 };
    }

    return {
      step: this.currentRoute.steps[this.currentStepIndex] || null,
      stepIndex: this.currentStepIndex,
      totalSteps: this.currentRoute.steps.length
    };
  }

  /**
   * Verificar si está navegando
   */
  isCurrentlyNavigating(): boolean {
    return this.isNavigating;
  }
}

export default new NavigationService();