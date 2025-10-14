# ANNY IA V4 - CAECUS Smart Glasses Assistant 👋

A powerful AI-powered assistant application designed to enhance accessibility and navigation using React Native and Expo. This application provides comprehensive voice control for CAECUS smart glasses with advanced AI features.

## Features

- 🎤 Voice command interface with speech recognition (Spanish language support)
- 🧭 Navigation assistance with real-time directions
- 🥽 Smart glasses integration (CAECUS) with Bluetooth protocol
- 👁️ Real-time object detection and scene analysis
- 🤖 Advanced AI features via WebSocket (text scanning, bill recognition, document reading)
- ♿ Accessibility features for visually impaired users
- 📱 Multi-device connectivity (Bluetooth and WiFi)

## Voice Commands

### Navigation Commands
- **"Navegar hacia [destino]"** - Navigate to a specific destination
- **"Ir hacia [destino]"** - Go to a specific location
- **"Necesito ir hacia [destino]"** - Alternative navigation command

### Basic CAECUS Glasses Commands
- **"Iniciar detección"** / **"Empezar detección"** - Start object detection
- **"Parar detección"** / **"Detener detección"** - Stop object detection
- **"Activar sensores"** - Start ranging sensors (2-meter range)
- **"Desactivar sensores"** - Stop ranging sensors
- **"Detectar objetos"** / **"Qué veo"** - Detect objects in view

### Advanced AI Commands (requires socket connection)
- **"Escanear texto"** / **"Leer texto"** - Scan and read text from image
- **"Reconocer billete"** / **"Cuánto dinero"** - Recognize money/bills
- **"Leer documento"** / **"Leer papel"** - Read document content
- **"Describir escena"** / **"Qué hay aquí"** - Describe the scene

### System Commands
- Voice commands for connecting/disconnecting glasses
- Streaming control commands
- Socket server connection management

## CAECUS Smart Glasses Protocol

The application uses a specific command format for CAECUS glasses:
- **Connection**: `<connect:SSID:PASSWORD>`
- **Streaming**: `<start_stream:IP:PORT>` / `<stop_stream>`
- **Detection**: `<start_detection>` / `<stop_detection>`
- **Ranging**: `<start_ranging:2000>` / `<stop_ranging>`
- **Object Detection**: `<detect_objects>`

## How Images are Obtained from Glasses

### 🔄 **Complete Flow:**
1. **CAECUS Glasses** capture video with integrated camera
2. **Bluetooth Command** `<start_stream:SERVER_IP:PORT>` initiates UDP streaming
3. **Glasses send video** directly to AI server via WiFi/UDP
4. **Mobile App** requests analysis from AI server via WebSocket
5. **AI Server** processes current frame and returns results

### 📡 **Stream Architecture:**
```
🥽 CAECUS Glasses → UDP Stream → 🖥️ AI Server (video_feed/PORT/CODE)
📱 Mobile App → WebSocket → 🖥️ AI Server (frame analysis requests)
🖥️ AI Server → WebSocket → 📱 Mobile App (analysis results)
```

### 🎯 **Key Points:**
- **Images come directly from glasses camera** - not from mobile device
- **Real-time streaming** via UDP to dedicated AI server
- **Mobile app acts as controller** - sends analysis requests
- **WebSocket integration** for advanced AI features (text scanning, money recognition, scene description)

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Usage Instructions

1. **Connect Glasses**: Use the connection button or voice commands to pair with CAECUS glasses
2. **Voice Commands**: Tap the microphone button and speak commands in Spanish
3. **AI Features**: Ensure socket connection is established for advanced AI analysis
4. **Navigation**: Use navigation commands for real-time directions

## Services Architecture

### Core Services
- **BTGlasses.ts** - Bluetooth communication with CAECUS glasses
- **WIFIGlasses.ts** - WiFi-based glasses connectivity
- **SocketGlasses.ts** - WebSocket service for AI-powered analysis
- **Navigation.ts** - Location and navigation services

### Context Providers
- **GlassesContext** - Centralized glasses management and voice commands
- **NavigationContext** - Location and routing management
- **AccessibilityContext** - Accessibility features and TTS

## Technical Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Expo Speech** for text-to-speech
- **Expo Speech Recognition** for voice commands
- **WebSocket** for AI service communication
- **Bluetooth** for glasses connectivity
- **Redux Toolkit** for state management

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.
