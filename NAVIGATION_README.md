# 🧭 Sistema de Navegación Accesible - ANNY V4

## 📋 Descripción

Sistema completo de navegación diseñado específicamente para personas con discapacidad visual, integrado en Expo con funcionalidades avanzadas de accesibilidad y Text-to-Speech.

## ✨ Características Principales

### 🔊 **Navegación por Voz**
- Instrucciones de navegación en español
- Text-to-Speech optimizado para personas con discapacidad visual
- Repetición de instrucciones con un toque
- Anuncios automáticos de intersecciones

### 🗺️ **Integración Completa con Google Maps**
- Búsqueda de lugares con autocompletado
- Cálculo de rutas optimizado para caminar
- Navegación paso a paso en tiempo real
- Detección automática de llegada a destino

### ♿ **Accesibilidad Avanzada**
- Compatible con lectores de pantalla (TalkBack/VoiceOver)
- Botones grandes y etiquetas descriptivas
- Soporte completo para navegación por gestos
- Modo oscuro para mejor contraste

### 📱 **APIs Integradas**
- **Google Places API**: Búsqueda de lugares
- **Google Directions API**: Cálculo de rutas
- **API de Intersecciones**: Anuncios de cruces de calles
- **Geolocalización de alta precisión**

## 🚀 Instalación y Configuración

### 1. **Dependencias Requeridas**
```bash
npx expo install react-native-maps expo-location expo-speech expo-keep-awake
```

**Nota**: Ahora incluye `react-native-maps` para mostrar el mapa visual en el tab "Explore", manteniendo todas las funciones de accesibilidad.

### 2. **Variables de Entorno**
Copia `.env.example` a `.env` y configura:

```env
# REQUERIDO: Google Maps API Key
EXPO_PUBLIC_GOOGLE_MAP_KEY=tu_clave_de_google_maps

# URLs de tu backend (opcional si tienes APIs custom)
EXPO_PUBLIC_APP_API_URL=http://tu-backend.com
EXPO_PUBLIC_APP_API_URL_INTERSECTIONS=http://intersections-api.com
```

### 3. **Permisos Android**
Ya incluidos en `AndroidManifest.xml`:
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `BLUETOOTH_CONNECT` (para dispositivos conectados)

## 📱 Como Usar la App

### **Interfaz de Usuario:**

#### 📱 **Tab "Explore" - Mapa Interactivo**
- **Mapa visual** con ubicación actual y destinos
- **Botones flotantes** en la parte superior derecha:
  - 📍 Mi ubicación (centrar mapa)
  - 🔍 Búsqueda (mostrar panel de búsqueda)
  - 🧭 Navegación (mostrar controles)

#### **Para Usuarios con Discapacidad Visual:**

#### 1. **🌍 Obtener Ubicación**
- Toca el botón flotante "Mi ubicación" (📍)
- O usa el panel de controles → "Obtener ubicación"
- Escucharás "Ubicación actual obtenida"

#### 2. **🔍 Buscar Destino**
- Toca el botón flotante de búsqueda (🔍)
- Se abrirá el panel de búsqueda
- Escribe el nombre del lugar
- Selecciona de las sugerencias
- El destino aparecerá en el mapa

#### 3. **🧭 Iniciar Navegación**
- Toca el botón flotante de navegación (🧭)
- Se abrirá el panel de controles
- Toca "Iniciar Navegación"
- Verás la ruta en el mapa Y escucharás instrucciones

#### 4. **👂 Durante la Navegación**
- **Mapa**: Muestra tu progreso en tiempo real
- **Voz**: Instrucciones automáticas paso a paso
- **Paneles**: Acceso a repetir instrucciones y controles

### **Controles de Accesibilidad:**
- **Doble toque**: Activar botones
- **Deslizar**: Navegar entre elementos
- **Compatible** con TalkBack (Android) y VoiceOver (iOS)

## 🔧 Arquitectura Técnica

### **Servicios Principales:**

1. **`NavigationService.ts`**
   - Gestión de APIs de Google Maps
   - Control de Text-to-Speech
   - Seguimiento GPS en tiempo real
   - Cálculo de rutas y distancias

2. **`NavigationContext.tsx`**
   - Estado global de navegación
   - Manejo de errores y carga
   - Integración con React Native

3. **Componentes Accesibles:**
   - `AccessibleSearch`: Búsqueda con autocompletado
   - `NavigationControls`: Botones de control
   - `NavigationScreen`: Pantalla principal

### **Flujo de Navegación:**
```
Usuario busca → API Places → Selecciona lugar → 
API Directions → Calcula ruta → Inicia TTS → 
GPS tracking → API Intersections → Llegada
```

## 🌐 APIs Utilizadas

### **Google Maps APIs:**
- **Places Autocomplete**: `https://maps.googleapis.com/maps/api/place/autocomplete`
- **Place Details**: `https://maps.googleapis.com/maps/api/place/details`
- **Directions**: `https://maps.googleapis.com/maps/api/directions`

### **APIs Custom (Opcionales):**
- **Intersecciones**: `POST /api/v1/intersection/nearest`
- **Destinos**: `GET/POST /destination/*`

## 🛠️ Personalización

### **Cambiar Idioma TTS:**
```typescript
// En NavigationService.ts línea 373
language: 'es-ES', // Cambiar a 'en-US', 'fr-FR', etc.
```

### **Ajustar Distancias:**
```typescript
// Distancia para cambio de paso (línea 238)
if (distanceToStepEnd < 20) // Cambiar 20 metros

// Distancia para intersecciones (línea 298) 
if (nearest.distance <= 15) // Cambiar 15 metros
```

### **Velocidad de Voz:**
```typescript
// En NavigationService.ts línea 374
rate: 0.8, // 0.5 = lento, 1.0 = normal, 1.5 = rápido
```

## 🔄 Migración desde React Native Nativo

Si tienes una app anterior en React Native, estos componentes reemplazan:

- ❌ `@react-native-community/geolocation` → ✅ `expo-location`
- ❌ `react-native-tts` → ✅ `expo-speech`
- ❌ `react-native-permissions` → ✅ `expo-location.requestPermissions`
- ✅ `react-native-maps` → ✅ **Integrado en tab Explore** (mapa visual + navegación por voz)
- ✅ APIs de Google Maps (sin cambios)

## 📝 Próximas Características

- [ ] 🗣️ Comando de voz para búsqueda
- [ ] 🏢 Detección automática de POIs cercanos
- [ ] 🚌 Integración con transporte público
- [ ] 🔄 Sincronización offline de rutas frecuentes
- [ ] 👥 Compartir ubicación con cuidadores
- [ ] 🎯 Navegación interior (shopping centers)

## 🐛 Resolución de Problemas

### **No se obtiene ubicación:**
- Verificar permisos en Configuración del dispositivo
- Asegurar GPS activado
- Probar en exterior (mejor señal GPS)

### **TTS no funciona:**
- Verificar idioma del dispositivo
- Reinstalar voces de TTS en Configuración
- Aumentar volumen del sistema

### **API no responde:**
- Verificar conexión a internet
- Validar Google Maps API Key
- Revisar URLs del backend en `.env`

## 📞 Soporte

Para soporte técnico o reportar bugs:
- **Email**: soporte@anny-app.com
- **Documentación**: Ver código fuente comentado
- **Logs**: Revisar console para errores detallados

---

## 🏆 Desarrollado con ❤️ para Accesibilidad

Este sistema fue diseñado con personas con discapacidad visual como prioridad, siguiendo las mejores prácticas de accesibilidad y usabilidad inclusiva.