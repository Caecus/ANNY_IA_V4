import { dispatch, navigate } from '../services/Navigation';
import reporting from '../services/reporting';
import { getEnvVar } from '../utils/env';
// import Voice from '@react-native-community/voice';
import { CommonActions } from '@react-navigation/native';
import axios from 'axios';
import * as Location from 'expo-location';
import React, { createContext, useEffect, useRef, useState } from 'react';
import { Linking, NativeModules } from 'react-native';
// import Config from 'react-native-config';
// import Tts from 'react-native-tts';

const { AudioManagerModule } = NativeModules;


type currentDirection = {
  latitude: number,
  longitude: number,
  geocoding: {
    route: string,
    locality: string,
    administrative_area_level_1: string,
    administrative_area_level_2: string,
    country: string
  }
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface VoiceCommand {
  name: string;
  roles: string[];
  description: string;
  action: (voiceCommand: any) => void;
}


export interface AccessibilityContextProps {
  voiceInit: (auth: any) => void | undefined;
  voiceStart: () => void;
  voiceGetCommands: () => any;
  pauseTravelAssistant: () => any;
  resumeTravelAssistant: () => any;
  travelAssistantVoice: boolean;
  isCancelTravel: boolean;
  currentLocation: { formattedAddress: string, coords: { latitude: number, longitude: number } };
  repeatStep: boolean;
  getLocationGoogle: (latitude: number, longitude: number) => Promise<any>
  postIntersectionAPI: (getApi: currentDirection) => Promise<any>;
  repeatText: boolean;
  repeatBanknote: boolean;
  setRepeatText: (val: any) => void;
  setRepeatBanknote: (val: any) => void;
  setGlassesCommands: (val: any) => void;
}

export const AccessibilityContext = createContext({} as AccessibilityContextProps);

export const AccessibilityProvider = ({ children }: any) => {
  // Commands
  let commandsList: VoiceCommand[] = [
    {
      name: "inicio",
      roles: ["all"],
      description: "Va a la pantalla de Inicio e intenta reconectar lentes Anny",
      action: () => { navigateResetActions('Home') }
    },
    {
      name: "mapa",
      roles: ["all"],
      description: "Va a la pantalla de Mapa",
      action: () => {
        navigate('SimpleMapScreen');
        // Tts.speak('Mapa');
      },
    },
    {
      name: "viaje",
      roles: ["all"],
      description: "Va a la pantalla de planifica tu viaje",
      action: () => {
        navigate('TravelPlanning');
        // Tts.speak('Viaje');
      },
    },
    {
      name: "capacitaciones",
      roles: ["all"],
      description: "Va a la pantalla de Capacitaciones",
      action: () => {
        navigate('Training');
        // Tts.speak('Capacitaciones');
      },
    },
    {
      name: "contactos",
      roles: ["all"],
      description: "Va a la pantalla de Contactos",
      action: () => {
        navigate('ContactsList');
        // Tts.speak('Tus Contactos');
      },
    },
    {
      name: "perfil",
      roles: ["all"],
      description: "Va a la pantalla de Perfil",
      action: () => {
        navigate('Profile');
        // Tts.speak('Perfil');
      },
    },
    {
      name: "texto",
      roles: ["PDV"],
      description: "Escanea texto con la cámara del celular",
      action: () => { navigate('TextImage', {optionSelect: "text"}); },
    },
    {
      name: "imagen",
      roles: ["PDV"],
      description: "Escanea una imagen con la cámara del celular",
      action: () => { navigate('TextImage', {optionSelect: "image"}); },
    },
    {
      name: "billete",
      roles: ["PDV"],
      description: "Escanea un billete con la cámara del celular",
      action: () => { navigate('TextImage', {optionSelect: "bank"}); },
    },
    {
      name: "ayuda",
      roles: ["PDV", "TUTOR"],
      description: "Envía una notificación de ayuda a uno de los tutores asociados a la cuenta",
      action: () => { navigate('Home', { help: true }); },
    },
    {
      name: "cercano",
      roles: ["PDV"],
      description: "Indica lugares interesantes cercanos a la ubicación actual",
      action: () => { navigate('Home', { nearby: true }); },
    },
    {
      name: "mis ubicaciones",
      roles: ["all"],
      description: "Va a la pantalla de Mis Ubicaciones",
      action: () => {
        navigate('PointOfInterest');
        // Tts.speak('Mis Ubicaciones');
      },
    },
    {
      name: "código",
      roles: ["all"],
      description: "Escanea códigos de barra con la cámara del celular",
      action: () => {
        navigate('QrScanner');
        // Tts.speak('Códigos Anny');
      },
    },
    {
      name: "tutores",
      roles: ["all"],
      description: "Va a la pantalla de Mis Tutores",
      action: () => {
        navigate('Users');
        // Tts.speak('Mis Tutores');
      },
    },
    {
      name: "radio",
      roles: ["all"],
      description: "Abre la página de Radio Gamba",
      action: () => {
        // Tts.speak('Abriendo Radio GAMBA');
        Linking.openURL('https://es.streema.com/radios/LRK1063_Gamba_FM_106.3_FM');
      },
    },
    {
      name: "audiolibro",
      roles: ["all"],
      description: "Abre una página de audiolibros",
      action: () => {
        // Tts.speak('Audiolibros');
        Linking.openURL('https://www.audible.com/');
      },
    },
    {
      name: "dónde estoy",
      roles: ["all"],
      description: "Indica la ubicación actual del usuario",
      action: () => { getCurrentLocation(authRef.current); },
    },
    {
      name: "notificaciones",
      roles: ["TUTOR", "Comunidad Accesible"],
      description: "Va a la pantalla de Notificaciones",
      action: () => {
        navigate('Notifications');
        // Tts.speak('Notificaciones');
      },
    },
    {
      name: "más opciones",
      roles: ["all"],
      description: "Va a la pantalla de Mas",
      action: () => {
        navigate('More');
        // Tts.speak('Más opciones');
      },
    },
    {
      name: "configuración",
      roles: ["all"],
      description: "Va a la pantalla de Configuración",
      action: () => {
        navigate('Settings');
        // Tts.speak('Configuración');
      },
    },
    {
      name: "personal",
      roles: ["all"],
      description: "Va a la pantalla de Información Personal",
      action: () => { 
        navigate('Personal'); 
        // Tts.speak('Personal');


      },
    },
    {
      name: "dispositivos",
      roles: ["all"],
      description: "Va a la pantalla de Dispositivos",
      action: () => { 
        navigate('BluetoothDevices');
        // Tts.speak('Dispositivos Bluetooth');

      
      },
    },
    {
      name: "comandos",
      roles: ["all"],
      description: "Va a la pantalla de Comandos",
      action: () => { 
        navigate('CommandsList'); 
        // Tts.speak('Comandos');

      },
    },
    {
      name: "tutorial",
      roles: ["all"],
      description: "Va a la pantalla de Tutorial",
      action: () => { navigate('Intro'); },
    },
    {
      name: "navegar hacia",
      roles: ["all"],
      description: "Va a la pantalla de Mapa e inicia el trayecto indicado",
      action: (voiceCommand: any) => {
        const destination = voiceCommand.toLowerCase().split('navegar hacia ')[1]
        navigate('TravelPlanning', { destino: destination, triggerSearch: true });
      },
    },
		{
			name: "cancelar viaje",
			roles: ["PDV", "TUTOR"],
			description: "Cancela el viaje en curso",
			action: () => { setIsCancelTravel(true) },
		},
		{
			name: "pausar asistente",
			roles: ["PDV", "TUTOR"],
			description: "Pausa la asistencia de voz durante el viaje",
			action: () => { pauseTravelAssistant(); },
		},
		{
			name: "reanudar asistente",
			roles: ["PDV", "TUTOR"],
			description: "Reanuda la asistencia de voz durante el viaje",
			action: () => { resumeTravelAssistant(); },
		},
		{
			name: "repetir",
			roles: ["PDV", "TUTOR"],
			description: "Dependiendo del uso actual, repite el último paso en la navegación guiada, repite la captura de imagen para detectar texto o repite la captura de imagen para detectar billetes",
			action: () => { 
        setRepeatStep(true); 
        setRepeatStep(false); 
        if (repeatText){
          // can repeat text capture
          navigate('TextImage', {optionSelect: "text", repeat: true});
        } else if (repeatBanknote){
          // can repeat banknote capture
          navigate('TextImage', {optionSelect: "bank", repeat: true});
        }
      },
		},
  ];

  // Voice
  const navigationRef = useRef<any>({});
  const authRef = useRef<any>({});
  // travel
  const [travelAssistantVoice, setTravelAssistantVoice] = useState(true)
	const [isCancelTravel, setIsCancelTravel] = useState(false)
	const [repeatStep, setRepeatStep] = useState(false)
  const [repeatText, setRepeatText] = useState(false)
  const [repeatBanknote, setRepeatBanknote] = useState(false)
  const [glassesCommands, setGlassesCommands] = useState<VoiceCommand[]>([])

  const [currentLocation, setCurrentLocation] = useState<{ formattedAddress: string, coords: { latitude: number, longitude: number } }>({
    formattedAddress: '',
    coords: {
      latitude: 0,
      longitude: 0
    }
  })

  useEffect(() => {
    // Voice.destroy().then(Voice.removeAllListeners);
  }, [])



  // ======================
  // ======== Misc ========
  // ======================

  const navigateResetActions = (screen: string) => {
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [{ name: screen }],
    });
  
    dispatch(resetAction);
  };


  const getCurrentLocation = async (auth: any) => {
    try {
      // Solicitar permisos de ubicación
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Tts.speak('Permiso de ubicación denegado');
        return;
      }
      // Obtener ubicación actual
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation(state => ({
        ...state,
        coords: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }
      }));
      getCurrentPlace(auth, { coords: location.coords });
    } catch (error) {
      console.warn('Error obteniendo ubicación:', error);
      // Tts.speak('No se pudo obtener la ubicación');
    }
  };

  const getCurrentPlace = async (auth: any, location: any) => {
    try {
      const data = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${location.coords.latitude
        },${location.coords.longitude
  }&key=${getEnvVar('GOOGLE_MAP_KEY')}`,
      );
      setCurrentLocation(state => ({
        ...state, formattedAddress: data.data.results[0].formatted_address
      }));
      // Tts.speak(data.data.results[0].formatted_address);

      auth.user._id && reporting.insertReport({
        functionality: 'Solicitud de Ubicacion actual',
        userId: auth.user._id,
        email: auth.user.email,
        role: auth.user.roles[0].name,
        name: auth.user.name,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  // ==================================
  // ======== getLocationGoogle ========
  // ==================================


  const getLocationGoogle = async (latitude: number, longitude: number) => {
    try {
      const response = await axios.get(
  `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${getEnvVar('GOOGLE_MAP_KEY')}`
      );
  
      const addressComponents: AddressComponent[] = response.data.results[0].address_components;
  
      const locationData = {
        route: '',
        locality: '',
        administrative_area_level_1: '',
        administrative_area_level_2: '',
        country: '',
      };
  
      addressComponents.forEach((component: AddressComponent) => {
        if (component.types.includes('route')) {
          locationData.route = component.long_name;
        }
        if (component.types.includes('locality')) {
          locationData.locality = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          locationData.administrative_area_level_1 = component.long_name;
        }
        if (component.types.includes('administrative_area_level_2')) {
          locationData.administrative_area_level_2 = component.long_name;
        }
        if (component.types.includes('country')) {
          locationData.country = component.long_name;
        }
      });
  
      return locationData;
    } catch (error) {
      console.error(error);
    }
  };
  
  const postIntersectionAPI = async (postApi: currentDirection): Promise<any> => {
    try {
        const response = await axios.post(
            `${getEnvVar('APP_API_URL_INTERSECTIONS')}/api/v1/intersection/nearest`,
            {
                latitude: postApi.latitude,
                longitude: postApi.longitude,
                geocoding: {
                    route: postApi.geocoding.route,
                    locality: postApi.geocoding.locality,
                    administrative_area_level_1: postApi.geocoding.administrative_area_level_1,
                    administrative_area_level_2: postApi.geocoding.administrative_area_level_2,
                    country: postApi.geocoding.country,
                }
            }
        );
        return response.data;
    } catch (error) {
        console.log('Error en postIntersectionAPI:', error);
        return null; 
    }
  };

  // =======================
  // ======== Voice ========
  // =======================

  const voiceInit = ( auth: any) => {
    authRef.current = auth;
  }

  const voiceStart = async () => {
    // Voice.destroy().then(Voice.removeAllListeners);
    // Voice.onSpeechStart = () => { console.warn('onSpeechStart') };
    // Voice.onSpeechEnd = () => AudioManagerModule?.stopBluetoothSco();
    // Voice.onSpeechError = () => AudioManagerModule?.stopBluetoothSco();
    // Voice.onSpeechResults = onSpeechResults;

    // try {
    //   await Voice.start('es-MX');
    // } catch (err) {
    //   console.error(err); // eslint-disable-next-line
    // }
  };

  const onSpeechResults = async (element: any) => {
    console.warn('onSpeechResults: ', element.value[0]);
    voiceRedirection(element.value[0]);
    // Voice.destroy().then(Voice.removeAllListeners);
  };

  const voiceRedirection = async (voiceCommand: string) => {
    if (!voiceCommand || !navigationRef.current || !authRef.current) {
      console.warn('voiceRedirection: Mandatory variables are not defined');
      // await Tts.speak('Error al reconocer voz');
      return;
    }

    voiceCommand = voiceCommand.toLowerCase();
    let commands = commandsList.concat(glassesCommands)

    for (let command of commands) {
      if (voiceCommand.includes(command.name)) {
        if (
          command.roles.includes("all") ||
          command.roles.includes(authRef.current.user.roles[0].name)) {
          command.action(voiceCommand);
        } else {
          // await Tts.speak('Usted no tiene acceso a esta funcionalidad');
        }
        return;
      }
    }

    // await Tts.speak('No se ha reconocido el comando');

  };

  const voiceGetCommands = () => {
    return commandsList;
  };

  // TRAVEL
  const pauseTravelAssistant = () => {
    setTravelAssistantVoice(false)
    return false
  }
  const resumeTravelAssistant = () => {
    setTravelAssistantVoice(true)
    return true
  }


  return (
    <AccessibilityContext.Provider
      value={{
        voiceInit,
        voiceStart,
        voiceGetCommands,
        pauseTravelAssistant,
        resumeTravelAssistant,
        travelAssistantVoice,
        currentLocation,
        isCancelTravel,
        repeatStep,
        getLocationGoogle,
        postIntersectionAPI,
        repeatBanknote,
        repeatText,
        setRepeatBanknote,
        setRepeatText,
        setGlassesCommands
      }}>
      {children}
    </AccessibilityContext.Provider>
  );

};

