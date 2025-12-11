import colors from '@/assets/colors';
import Button from '@/components/common/Button';
import Text from '@/components/common/Text';
import { GlassesContext } from '@/context/GlassesContext';
import RecognitionService from '@/services/RecognitionService';
import { speak } from '@/services/speaker';
import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from '@jamsch/expo-speech-recognition';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from 'expo-router';
import { useContext, useRef, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, Vibration, View } from 'react-native';

export default function index() {

  const navigation = useNavigation();
  const [isListening, setIsListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState('');
  // Manejar eventos de reconocimiento de voz
  useSpeechRecognitionEvent('start', () => setIsListening(true));
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript || '';
    setVoiceResult(transcript);
    handleVoiceCommand(transcript);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    speak('No se entendió el comando, intenta de nuevo');
  });
  // Procesar comando hablado
  function handleVoiceCommand(text: string) {
    const lower = text.toLowerCase();
    if (lower.includes('imagen')) {
      speak('Escaneando imagen');
      processRecognition('imagen');
    } else if (lower.includes('objeto')) {
      speak('Escaneando objetos');
      processRecognition('objetos');
    } else if (lower.includes('entorno') || lower.includes('descripción')) {
      speak('Escaneando entorno');
      processRecognition('entorno');
    } else if (lower.includes('billete') || lower.includes('dinero')) {
      speak('Escaneando billetes');
      processRecognition('billetes');
    } else if (lower.includes('navegación') || lower.includes('mapa') || lower.includes('ruta')) {
      speak('Abriendo mapa');
      //@ts-ignore
      navigation.navigate('Explore');
    } else if (lower.includes('perfil')) {
      speak('Abriendo perfil');
      //@ts-ignore
      navigation.navigate('ProfileScreen');
    } else {
      speak('Comando no reconocido, intenta de nuevo');
    }
  }
  // Mapeo frontend → backend
  function mapRecognitionType(type: string): 'ocr' | 'describe' | 'currency' {
    switch (type) {
      case 'texto':
      case 'text':
      case 'imagen':
        return 'ocr';
      case 'billetes':
      case 'dinero':
      case 'money':
        return 'currency';
      case 'objetos':
      case 'objects':
      case 'descripcion':
      case 'description':
      case 'entorno':
      default:
        return 'describe';
    }
  }

  const glasses = useContext(GlassesContext);
  const glassesConnected = glasses.getGlassesActive();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [recognitionType, setRecognitionType] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const onRequestPermission = async () => {
    speak('Solicitando permiso para usar la cámara');
    const result = await requestPermission();
    // Forzar re-render si el hook no actualiza automáticamente
    if (result?.granted) {
      speak('Permiso concedido');
    } else {
      speak('Permiso denegado');
    }
  };

  // Reconocimiento condicional
  async function processRecognition(type: string) {
    console.log('[RECOGNITION] Solicitud de reconocimiento:', type);
    const apiType = mapRecognitionType(type);
    if (glassesConnected) {
      speak(`Procesando reconocimiento de ${type} con anteojos.`);
      console.log('[RECOGNITION] Usando anteojos para reconocimiento:', apiType);
      const result = await RecognitionService.analyzeFromGlasses(apiType, glasses);
      if (result && result.tts) {
        speak(result.tts);
      } else {
        speak('No se pudo obtener resultado de los anteojos');
      }
    } else {
      console.log('[RECOGNITION] Usando cámara móvil para reconocimiento:', apiType);
      setRecognitionType(type);
      setCameraVisible(true);
    }
  }

  // Captura imagen y envía a RecognitionService
  const handleCaptureAndRecognize = async () => {
    console.log('[RECOGNITION] Captura iniciada desde cámara móvil');
    if (!cameraRef.current) {
      console.log('[RECOGNITION] Cámara no disponible');
      speak('Error: Cámara no disponible');
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      console.log('[RECOGNITION] Imagen capturada:', photo?.uri);
      setCameraVisible(false);
      const apiType = mapRecognitionType(recognitionType ?? '');
      speak(`Procesando reconocimiento de ${recognitionType} con cámara móvil.`);
      if (!photo.base64) {
        console.log('[RECOGNITION] Error: Imagen en base64 no disponible');
        speak('Error: No se pudo obtener la imagen');
        return;
      }
      
      const result = await RecognitionService.sendImageForRecognition(photo.base64, apiType, {
        lang: 'es',
        mode: 'general'
      });
      
      if (result) {
        console.log('[RECOGNITION] 🚀 Enviando imagen a RecognitionService:', apiType);
        console.log('[RECOGNITION] ✅ Resultado recibido:', result);
        
        // Interpretar y reproducir el resultado según el tipo
        if (apiType === 'ocr' && result.tts) {
          // OCR: Reproducir texto detectado
          speak(`Texto detectado: ${result.tts}`);
        } else if (apiType === 'describe' && result.tts) {
          // Descripción de escena: Reproducir descripción
          speak(result.tts);
        } else if (apiType === 'currency' && result.tts) {
          // Billetes: Reproducir denominación
          speak(result.tts);
        } else {
          speak('Reconocimiento completado');
        }
      } else {
        console.log('[RECOGNITION] ❌ No se recibió resultado');
        speak('No se pudo completar el reconocimiento. Por favor intenta nuevamente.');
      }
      
      setRecognitionType(null);
    } catch (err) {
      console.log('[RECOGNITION] Error al capturar o enviar imagen:', err);
      speak('Error al capturar o enviar imagen');
      setCameraVisible(false);
      setRecognitionType(null);
    }
  };

  function toggleCameraFacing() {
    console.log('[CAMERA] Cambiando cámara:', facing === 'back' ? 'front' : 'back');
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.diceButton}>Necesitamos permiso para usar la cámara</Text>
        <Button
          text="Conceder permisos de cámara"
          onPress={onRequestPermission}
          style={styles.mainButton}
          otherProps={{ accessibilityLabel: 'Conceder permiso', accessibilityRole: 'button' }}
        />
      </View>
    );
  }

  const handleAccessiblePress = (text: string, action?: () => void) => {
    Vibration.vibrate(50);
    speak(text);
    if (action) action();
  };

  // Iniciar escucha de voz
  const startVoiceRecognition = async () => {
    try {
      setVoiceResult('');
      const permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permissions.granted) {
        speak('Permiso de micrófono denegado');
        return;
      }
      speak('Escuchando comando, por favor habla ahora');
      ExpoSpeechRecognitionModule.start({
        lang: 'es-MX',
        interimResults: false,
        maxAlternatives: 1,
        continuous: false,
        addsPunctuation: true,
      });
    } catch (e) {
      setIsListening(false);
      speak('No se pudo iniciar el reconocimiento de voz');
    }
  };

  return (
    <View style={styles.container}>
      <Text type="h1" textAlign="center" style={styles.title} text="Bienvenido a Anny" />
      <View style={styles.buttonBox}>
        <View style={styles.diceFiveContainer}>
          <View style={styles.diceRow}>
            <TouchableOpacity
              style={[styles.diceButton, styles.beautifulButton]}
              accessibilityLabel="Escuchar comando"
              accessibilityRole="button"
              onPress={startVoiceRecognition}
              disabled={isListening}
            >
              <View style={styles.circleButton}>
                <Ionicons name="mic" size={64} color={colors.white} style={styles.beautifulIcon} />
              </View>
              <Text type="h2" style={styles.gridText} text={isListening ? 'Escuchando...' : 'Escuchar'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.diceButton, styles.beautifulButton]}
              accessibilityLabel="Reconocer texto"
              accessibilityRole="button"
              onPress={() => handleAccessiblePress('Reconocer texto', () => processRecognition('imagen'))}
            >
              <View style={styles.circleButton}>
                <Ionicons name="text" size={64} color={colors.white} style={styles.beautifulIcon} />
              </View>
              <Text type="h2" style={styles.gridText} text="Texto" />
            </TouchableOpacity>
          </View>
          <View style={styles.diceRow}>
            <TouchableOpacity
              style={[styles.diceButton, styles.beautifulButton]}
              accessibilityLabel="Reconocer objetos"
              accessibilityRole="button"
              onPress={() => handleAccessiblePress('Reconocer objetos', () => processRecognition('objetos'))}
            >
              <View style={styles.circleButton}>
                <Ionicons name="cube" size={64} color={colors.white} style={styles.beautifulIcon} />
              </View>
              <Text type="h2" style={styles.gridText} text="Objetos" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.diceButton, styles.beautifulButton]}
              accessibilityLabel="Reconocer entorno"
              accessibilityRole="button"
              onPress={() => handleAccessiblePress('Reconocer entorno', () => processRecognition('entorno'))}
            >
              <View style={styles.circleButton}>
                <Ionicons name="scan" size={64} color={colors.white} style={styles.beautifulIcon} />
              </View>
              <Text type="h2" style={styles.gridText} text="Entorno" />
            </TouchableOpacity>
          </View>
          <View style={styles.diceRow}>
            <TouchableOpacity
              style={[styles.diceButton, styles.beautifulButton]}
              accessibilityLabel="Reconocer billetes"
              accessibilityRole="button"
              onPress={() => handleAccessiblePress('Reconocer billetes', () => processRecognition('billetes'))}
            >
              <View style={styles.circleButton}>
                <Ionicons name="cash" size={64} color={colors.white} style={styles.beautifulIcon} />
              </View>
              <Text type="h2" style={styles.gridText} text="Billetes" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.diceButton, styles.beautifulButton]}
              accessibilityLabel="Solicitar ruta"
              accessibilityRole="button"
              //@ts-ignore
              onPress={() => handleAccessiblePress('Solicitar ruta', () => navigation.navigate('Explore'))}
            >
              <View style={styles.circleButton}>
                <Ionicons name="navigate" size={64} color={colors.white} style={styles.beautifulIcon} />
              </View>
              <Text type="h2" style={styles.gridText} text="Ruta" />
            </TouchableOpacity>
          </View>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            // backgroundColor: '#f00',
            width: '100%',
            // marginBottom: 8,
            gap: 24,
          }}>
            <TouchableOpacity
              style={[styles.diceButton, styles.beautifulButton]}
              accessibilityLabel="Ir a perfil"
              accessibilityRole="button"
              //@ts-ignore
              onPress={() => handleAccessiblePress('Ir a perfil', () => navigation.navigate('ProfileScreen'))}
            >
              <View style={styles.circleButton}>
                <Ionicons name="person" size={64} color={colors.white} style={styles.beautifulIcon} />
              </View>
              <Text type="h2" style={styles.gridText} text="Perfil" />
            </TouchableOpacity>
          {/* <View style={styles.diceButton} /> */}
          </View>
        </View>
        {/* Modal de cámara para reconocimiento móvil */}
        <Modal visible={cameraVisible} animationType="slide" onRequestClose={() => setCameraVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center' }}>
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing={facing}
            />
            <Button
              text="Capturar y reconocer"
              style={{ position: 'absolute', bottom: 32, left: 32, right: 32 }}
              onPress={handleCaptureAndRecognize}
              otherProps={{ accessibilityLabel: 'Capturar y reconocer', accessibilityRole: 'button' }}
            />
            <Button
              text="Cancelar"
              style={{ position: 'absolute', bottom: 90, left: 32, right: 32, backgroundColor: colors.secondary }}
              onPress={() => { setCameraVisible(false); setRecognitionType(null); speak('Reconocimiento cancelado'); }}
              otherProps={{ accessibilityLabel: 'Cancelar', accessibilityRole: 'button' }}
            />
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  diceFiveContainer: {
    width: '100%',
    alignItems: 'center',
    // marginTop: 16,
    // gap: 24,
  },
  diceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    // marginBottom: 8,
    gap: 24,
  },
  diceRowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    // marginBottom: 8,
    gap: 24,
  },
  diceButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    maxWidth: 180,
  },
  beautifulButton: {
    margin: 10,
    borderRadius: 32,
    backgroundColor: colors.primary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: colors.secondary,
    transform: [{ scale: 1 }],
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 24,
    rowGap: 24,
  },
  title: {
    color: colors.secondary,
    fontSize: 44,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.text,
    fontSize: 28,
    marginBottom: 40,
  },
  connectedBox: {
    backgroundColor: colors.primary,
    borderRadius: 32,
    padding: 48,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.secondary,
    marginTop: 24,
  },
  connectedText: {
    color: colors.white,
    marginBottom: 16,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonBox: {
    width: '100%',
    alignItems: 'center',
  },
  mainButton: {
    backgroundColor: colors.primary,
    borderRadius: 32,
    paddingVertical: 24,
    paddingHorizontal: 32,
    marginBottom: 32,
    width: '100%',
    elevation: 4,
  },
  pentagonContainer: {
    width: 340,
    height: 400,
    alignSelf: 'center',
    position: 'relative',
    marginTop: 16,
  },
  pentagonButton: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  pentagonTop: {
    left: 100,
    top: 0,
  },
  pentagonRightTop: {
    left: 240,
    top: 80,
  },
  pentagonRightBottom: {
    left: 210,
    top: 260,
  },
  pentagonLeftBottom: {
    left: 30,
    top: 260,
  },
  circleButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.primary,
    marginBottom: 16,
    elevation: 8,
  },
  beautifulIcon: {
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  gridText: {
    color: colors.white,
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1.2,
  },
});