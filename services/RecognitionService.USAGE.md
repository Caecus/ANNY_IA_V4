# 📱 Guía de uso: RecognitionService

## 🎯 Configuración inicial

### 1. Configurar URL del servidor

```typescript
import RecognitionService from '@/services/RecognitionService';

// En desarrollo (mismo WiFi)
RecognitionService.setServerUrl('http://192.168.1.100:4000');

// O usar localhost si estás en emulador
RecognitionService.setServerUrl('http://10.0.2.2:4000'); // Android emulator
RecognitionService.setServerUrl('http://localhost:4000'); // iOS simulator
```

### 2. Verificar conexión

```typescript
const isHealthy = await RecognitionService.checkHealth();
if (isHealthy) {
  console.log('Servidor disponible');
} else {
  console.log('Servidor no responde');
}
```

---

## 📸 Uso con REST API (recomendado para empezar)

### OCR - Reconocimiento de texto

```typescript
// Capturar foto
const photo = await cameraRef.current.takePictureAsync({ 
  base64: true,
  quality: 0.8 
});

// Reconocer texto
const result = await RecognitionService.recognizeText(
  photo.uri,
  'es',  // idioma
  false  // preservar layout
);

if (result) {
  console.log('Texto detectado:', result.readingOrder);
  console.log('Confianza:', result.confidence);
  // El TTS se reproduce automáticamente
}
```

### Descripción de escena

```typescript
// Capturar foto
const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

// Describir escena
const result = await RecognitionService.describeScene(
  photo.uri,
  'es',
  'general' // o 'seguridad', 'interior', 'exterior'
);

if (result) {
  console.log('Descripción:', result.description);
  console.log('Objetos:', result.objects);
  // El TTS se reproduce automáticamente
}
```

### Identificación de billetes

```typescript
// Capturar foto
const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

// Identificar billete
const result = await RecognitionService.identifyCurrency(
  photo.uri,
  'LATAM' // o 'US', 'EU'
);

if (result) {
  console.log('Billete:', result.denomination);
  console.log('Confianza:', result.confidence);
  // El TTS se reproduce automáticamente
}
```

---

## 🔌 Uso con WebSocket (streaming en tiempo real)

### Conectar al servidor

```typescript
// Conectar al WebSocket
const connected = await RecognitionService.connectWebSocket('phone', 'es');

if (connected) {
  console.log('WebSocket conectado');
}
```

### Enviar frames continuos

```typescript
// Intervalo para enviar frames cada 2 segundos
const streamInterval = setInterval(async () => {
  const photo = await cameraRef.current.takePictureAsync({ 
    base64: true,
    quality: 0.5 
  });

  if (photo.base64) {
    await RecognitionService.sendFrame(
      photo.base64,
      'describe_scene', // o 'read_text', 'identify_currency'
      'es',
      'seguridad'
    );
  }
}, 2000);

// Detener streaming
clearInterval(streamInterval);
RecognitionService.disconnectWebSocket();
```

### Handlers personalizados

```typescript
// Registrar handler para resultados personalizados
RecognitionService.onWebSocketMessage('result', (data) => {
  console.log('Resultado personalizado:', data);
  
  if (data.kind === 'ocr') {
    // Hacer algo con el OCR
  } else if (data.kind === 'scene') {
    // Hacer algo con la descripción
  }
});

// Registrar handler para TTS
RecognitionService.onWebSocketMessage('tts', (data) => {
  console.log('TTS recibido:', data.text);
  // El TTS se reproduce automáticamente por defecto
});
```

---

## 🔧 Integración actual (ya implementada)

### Reconocimiento desde cámara móvil

```typescript
// Función actual en index.tsx
async function handleCaptureAndRecognize() {
  const photo = await cameraRef.current.takePictureAsync({ 
    base64: true,
    quality: 0.8 
  });
  
  // Esto ya funciona con el nuevo servicio
  await RecognitionService.sendImageForRecognition(
    photo.base64,
    'text' // o 'description', 'money', 'landmarks'
  );
}
```

### Reconocimiento desde anteojos

```typescript
// Función actual en index.tsx
async function processRecognition(type: string) {
  if (glassesConnected) {
    // Esto ya funciona con el nuevo servicio
    await RecognitionService.analyzeFromGlasses(type);
  } else {
    // Usar cámara móvil
    setCameraVisible(true);
  }
}
```

---

## 🎯 Ejemplos completos

### Ejemplo 1: OCR básico

```typescript
import { Camera } from 'expo-camera';
import RecognitionService from '@/services/RecognitionService';

async function scanText() {
  // Configurar servidor
  RecognitionService.setServerUrl('http://192.168.1.100:4000');
  
  // Verificar conexión
  const healthy = await RecognitionService.checkHealth();
  if (!healthy) {
    alert('Servidor no disponible');
    return;
  }
  
  // Tomar foto
  const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
  
  // Reconocer texto
  const result = await RecognitionService.recognizeText(photo.uri, 'es');
  
  // El TTS se reproduce automáticamente
  // Pero puedes acceder al resultado manualmente
  if (result) {
    console.log('Texto:', result.readingOrder);
  }
}
```

### Ejemplo 2: Streaming continuo

```typescript
import RecognitionService from '@/services/RecognitionService';

let streamInterval: NodeJS.Timeout | null = null;

async function startStreaming() {
  // Configurar servidor
  RecognitionService.setServerUrl('http://192.168.1.100:4000');
  
  // Conectar WebSocket
  const connected = await RecognitionService.connectWebSocket('phone', 'es');
  if (!connected) {
    alert('No se pudo conectar');
    return;
  }
  
  // Registrar handler personalizado
  RecognitionService.onWebSocketMessage('result', (data) => {
    console.log('Resultado:', data);
  });
  
  // Iniciar streaming
  streamInterval = setInterval(async () => {
    const photo = await cameraRef.current.takePictureAsync({ 
      base64: true,
      quality: 0.5 
    });
    
    if (photo.base64) {
      await RecognitionService.sendFrame(
        photo.base64,
        'describe_scene',
        'es',
        'seguridad'
      );
    }
  }, 2000);
}

function stopStreaming() {
  if (streamInterval) {
    clearInterval(streamInterval);
    streamInterval = null;
  }
  RecognitionService.disconnectWebSocket();
}
```

---

## ⚙️ Configuración avanzada

### Desactivar TTS automático

Si quieres manejar el TTS manualmente:

```typescript
// En el código actual, el TTS se reproduce automáticamente
// Si quieres desactivarlo, comenta las líneas Speech.speak()
// en RecognitionService.ts

// Ejemplo: solo logs sin TTS
const result = await RecognitionService.recognizeText(photo.uri, 'es');
console.log('Texto detectado:', result?.readingOrder);
// No se reproduce TTS, solo logs
```

### Timeout personalizado

```typescript
// Agregar timeout a las peticiones REST
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000); // 30s

try {
  const response = await fetch(`${baseUrl}/v1/images/ocr`, {
    method: 'POST',
    body: formData,
    signal: controller.signal
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Timeout');
  }
} finally {
  clearTimeout(timeout);
}
```

---

## 🐛 Troubleshooting

### Error: "No se pudo conectar"

1. Verifica que el servidor esté corriendo: `http://localhost:4000/health`
2. Usa la IP correcta de tu computadora (no localhost desde dispositivo físico)
3. Verifica que estés en la misma red WiFi

### Error: "FormData no soportado"

Si usas base64 en lugar de URI, convierte primero:

```typescript
// Guardar base64 como archivo temporal
import * as FileSystem from 'expo-file-system';

const tempUri = FileSystem.documentDirectory + 'temp.jpg';
await FileSystem.writeAsStringAsync(tempUri, base64, {
  encoding: FileSystem.EncodingType.Base64,
});

// Ahora usar tempUri
await RecognitionService.recognizeText(tempUri, 'es');
```

### WebSocket no conecta

1. Verifica la URL: `ws://IP:4000/v1/stream` (no `http://`)
2. Revisa los logs del servidor backend
3. Asegúrate de llamar `connectWebSocket()` antes de `sendFrame()`

---

## 📊 Comparación: REST vs WebSocket

| Característica | REST API | WebSocket |
|---------------|----------|-----------|
| Latencia | Media (2-5s) | Baja (1-2s) |
| Uso de datos | Bajo | Medio |
| Complejidad | Simple | Moderada |
| Ideal para | Análisis puntuales | Streaming continuo |
| Conexión | Por petición | Persistente |

**Recomendación**: Empieza con REST API para casos de uso simples (botones de reconocimiento). Usa WebSocket para experiencias en tiempo real (anteojos).

---

## ✅ Checklist de integración

- [x] RecognitionService actualizado con nueva API
- [ ] Configurar URL del servidor en la app
- [ ] Probar health check
- [ ] Probar OCR con foto
- [ ] Probar descripción de escena
- [ ] (Opcional) Implementar WebSocket para streaming
- [ ] (Opcional) Integrar con servicio de anteojos

---

## 🚀 Próximos pasos

1. **Configurar servidor**: Asegúrate de que el backend esté corriendo
2. **Probar REST API**: Empieza con `recognizeText()`
3. **Integrar en UI**: Agrega botones para cada tipo de análisis
4. **WebSocket**: Implementa streaming para experiencias en tiempo real
5. **Producción**: Configura HTTPS/WSS y autenticación JWT

---

**¡El servicio está listo para usar! 🎉**
