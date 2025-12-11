import React, { createContext, ReactNode, useCallback, useContext, useReducer } from 'react';
import NavigationService, { NavigationRoute, NavigationStep, PlaceAutocomplete } from '../services/NavigationService';

export interface NavigationState {
  isNavigating: boolean;
  travel_mode?: 'walking' | 'transit' | 'driving';
  currentRoute: NavigationRoute | null;
  currentStep: NavigationStep | null;
  currentStepIndex: number;
  totalSteps: number;
  searchResults: PlaceAutocomplete[];
  isSearching: boolean;
  selectedDestination: any;
  currentLocation: {
    latitude: number;
    longitude: number;
  } | null;
  error: string | null;
  isLoading: boolean;
}

type NavigationAction =
  | { type: 'SET_NAVIGATION_STATE'; payload: { isNavigating: boolean; route?: NavigationRoute | null } }
  | { type: 'UPDATE_CURRENT_STEP'; payload: { step: NavigationStep | null; stepIndex: number; totalSteps: number } }
  | { type: 'SET_SEARCH_RESULTS'; payload: PlaceAutocomplete[] }
  | { type: 'SET_SEARCHING'; payload: boolean }
  | { type: 'SET_SELECTED_DESTINATION'; payload: any }
  | { type: 'SET_CURRENT_LOCATION'; payload: { latitude: number; longitude: number } | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' };

const initialState: NavigationState = {
  isNavigating: false,
  currentRoute: null,
  currentStep: null,
  currentStepIndex: 0,
  totalSteps: 0,
  searchResults: [],
  isSearching: false,
  selectedDestination: null,
  currentLocation: null,
  error: null,
  isLoading: false,
};

function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'SET_NAVIGATION_STATE':
      return {
        ...state,
        isNavigating: action.payload.isNavigating,
        currentRoute: action.payload.route || null,
      };
    case 'UPDATE_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload.step,
        currentStepIndex: action.payload.stepIndex,
        totalSteps: action.payload.totalSteps,
      };
    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        searchResults: action.payload,
      };
    case 'SET_SEARCHING':
      return {
        ...state,
        isSearching: action.payload,
      };
    case 'SET_SELECTED_DESTINATION':
      return {
        ...state,
        selectedDestination: action.payload,
      };
    case 'SET_CURRENT_LOCATION':
      return {
        ...state,
        currentLocation: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

interface NavigationContextType {
  state: NavigationState;
  searchPlaces: (query: string) => Promise<void>;
  selectDestination: (place: PlaceAutocomplete) => Promise<void>;
  startNavigation: (mode?: 'walking' | 'transit' | 'driving') => Promise<void>;
  stopNavigation: () => void;
  repeatInstruction: () => void;
  getCurrentLocation: () => Promise<void>;
  clearError: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(navigationReducer, initialState);

  const searchPlaces = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
      return;
    }

    dispatch({ type: 'SET_SEARCHING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const results = await NavigationService.searchPlaces(query);
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error buscando lugares' });
      console.error('Error en búsqueda:', error);
    } finally {
      dispatch({ type: 'SET_SEARCHING', payload: false });
    }
  }, []);

  const selectDestination = useCallback(async (place: PlaceAutocomplete) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      // Obtener detalles completos del lugar
      const placeDetails = await NavigationService.getPlaceDetails(place.place_id, place.reference);
      
      const destination = {
        name: place.description,
        location: {
          lat: placeDetails.geometry.location.lat,
          lng: placeDetails.geometry.location.lng,
        },
        place_id: place.place_id,
        formatted_address: placeDetails.formatted_address,
      };

      dispatch({ type: 'SET_SELECTED_DESTINATION', payload: destination });
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });

      // Anunciar selección
      NavigationService.speak(`Destino seleccionado: ${place.structured_formatting.main_text}`);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error obteniendo detalles del lugar' });
      console.error('Error seleccionando destino:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      console.log('[NAVCTX] Solicitando permisos de ubicación...');
      const hasPermissions = await NavigationService.requestLocationPermissions();
      console.log(hasPermissions, 'PERMISOS');
      if (!hasPermissions) {
        dispatch({ type: 'SET_ERROR', payload: 'Permisos de ubicación denegados' });
        return;
      }

      console.log('[NAVCTX] Solicitando ubicación actual...');
      const location = await NavigationService.getCurrentLocation();
      if (location) {
        console.log('[NAVCTX] Ubicación obtenida:', location);
        dispatch({ 
          type: 'SET_CURRENT_LOCATION', 
          payload: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
        });
        NavigationService.speak('Ubicación actual obtenida');
      } else {
        console.log('[NAVCTX] No se pudo obtener la ubicación');
        dispatch({ type: 'SET_ERROR', payload: 'No se pudo obtener la ubicación' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error obteniendo ubicación' });
      console.error('[NAVCTX] Error obteniendo ubicación:', error);
    } finally {
      // Aseguramos que el estado de carga se limpie siempre
      setTimeout(() => {
        dispatch({ type: 'SET_LOADING', payload: false });
      }, 100);
    }
  }, []);

  const startNavigation = useCallback(async (mode: 'walking' | 'transit' | 'driving' = 'walking') => {
    if (!state.currentLocation) {
      dispatch({ type: 'SET_ERROR', payload: 'Primero debe obtener su ubicación actual' });
      return;
    }

    if (!state.selectedDestination) {
      dispatch({ type: 'SET_ERROR', payload: 'Debe seleccionar un destino' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const route = await NavigationService.calculateRoute(
        {
          lat: state.currentLocation.latitude,
          lng: state.currentLocation.longitude,
        },
        {
          lat: state.selectedDestination.location.lat,
          lng: state.selectedDestination.location.lng,
        },
        mode
      );

      if (route) {
        dispatch({ type: 'SET_NAVIGATION_STATE', payload: { isNavigating: true, route } });
        
        // Actualizar información del paso actual
        const stepInfo = NavigationService.getCurrentStepInfo();
        dispatch({ 
          type: 'UPDATE_CURRENT_STEP', 
          payload: stepInfo 
        });

        await NavigationService.startNavigation(route);
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'No se pudo calcular la ruta' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error iniciando navegación' });
      console.error('Error iniciando navegación:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentLocation, state.selectedDestination]);

  const stopNavigation = useCallback(() => {
    NavigationService.stopNavigation();
    dispatch({ type: 'SET_NAVIGATION_STATE', payload: { isNavigating: false, route: null } });
    dispatch({ 
      type: 'UPDATE_CURRENT_STEP', 
      payload: { step: null, stepIndex: 0, totalSteps: 0 } 
    });
    dispatch({ type: 'SET_SELECTED_DESTINATION', payload: null });
  }, []);

  const repeatInstruction = useCallback(() => {
    NavigationService.repeatLastInstruction();
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value: NavigationContextType = {
    state,
    searchPlaces,
    selectDestination,
    startNavigation,
    stopNavigation,
    repeatInstruction,
    getCurrentLocation,
    clearError,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}