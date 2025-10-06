# 🔧 Guía para Resolver Error de react-native-maps

## ❌ Problema
Error de CMake relacionado con `react-native-maps` que no está instalado pero sigue en el autolinking de Expo.

## ✅ Solución Paso a Paso

### 1. **Ejecutar prebuild limpio**
```bash
npx expo prebuild --clean
```

### 2. **Si el paso 1 no funciona, eliminar archivos manualmente:**
```bash
# En Windows (PowerShell)
rm -rf android/app/.cxx
rm -rf android/app/build
rm -rf android/.gradle

# Luego ejecutar
npx expo prebuild --clean
```

### 3. **Si persiste, limpiar completamente:**
```bash
# Eliminar node_modules y reinstalar
rm -rf node_modules
npm install

# Ejecutar prebuild
npx expo prebuild --clean
```

### 4. **Como último recurso:**
```bash
# Eliminar directorios nativos completamente
rm -rf android/
rm -rf ios/

# Regenerar desde cero
npx expo prebuild
```

## 🎯 Verificación

Una vez resuelto, deberías poder ejecutar:
```bash
npx expo run:android
```

## 📝 Nota Importante

El sistema de navegación **NO necesita react-native-maps**. Funciona 100% por voz sin interfaz visual de mapa, optimizado para personas con discapacidad visual.

## 🔍 Dependencias Correctas

Las únicas dependencias necesarias son:
- ✅ `expo-location` (GPS)
- ✅ `expo-speech` (Text-to-Speech)  
- ✅ `expo-keep-awake` (mantener pantalla activa)
- ✅ `axios` (peticiones API)

## 🚀 Después de Resolver

Una vez que compile correctamente, podrás:

1. **Navegar a la pantalla**: `/(stack)/navigation`
2. **Usar el sistema completo de navegación**:
   - Búsqueda de lugares
   - Cálculo de rutas
   - Navegación por voz
   - Anuncios de intersecciones

La app funcionará perfectamente sin mapas visuales, solo con instrucciones de voz.