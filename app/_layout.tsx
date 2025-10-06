import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import 'react-native-reanimated';
import { Provider, useSelector } from 'react-redux';
import { AccessibilityProvider } from '../context/AccessibilityContext';
import { CompassProvider } from '../context/CompassContext';
import { GlassesProvider } from '../context/GlassesContext';
import { NavigationProvider } from '../context/NavigationContext';
import { useColorScheme } from '../hooks/useColorScheme';
import { RootState, store } from '../store/store';
// Solicita permisos de Bluetooth solo en builds nativos (no en desarrollo ni Expo Go)
async function requestBluetoothPermissionsIfNeeded() {
    // Solo Android nativo, no en Expo Go ni web
    if (
        Platform.OS === 'android' &&
        Platform.Version >= 31 &&
        !Constants.appOwnership?.includes('expo') // 'expo' = Expo Go, 'standalone' = build nativo
    ) {
        try {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);
            const allGranted = Object.values(granted).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
            if (allGranted) {
                console.log('[Bluetooth] Todos los permisos concedidos');
            } else {
                console.log('[Bluetooth] Faltan permisos:', granted);
            }
        } catch (e) {
            console.log('[Bluetooth] Error solicitando permisos', e);
        }
    }
}

function AuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const segments = useSegments();
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    useEffect(() => {
        const currentRoute = segments.join('/');
        if (!isAuthenticated && !currentRoute.includes('screens/auth')) {
            router.replace('/screens/auth/Login');
        } else if (
            isAuthenticated &&
            !currentRoute.includes('(tabs)') &&
            segments[0] !== '(stack)'
        ) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, segments]);

    return <>{children}</>;
}

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });


    useEffect(() => {
      requestBluetoothPermissionsIfNeeded();
    }, []);

    if (!loaded) {
        return null;
    }

    return (
        <Provider store={store}>
            <AccessibilityProvider>
                <GlassesProvider>
                    <CompassProvider>
                        <NavigationProvider>
                            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                                <AuthGate>
                                    <Stack>
                                        <Stack.Screen name="screens/auth/Login" options={{ headerShown: false }} />
                                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                                        <Stack.Screen name='(stack)' options={{ headerShown: false }} />
                                        <Stack.Screen name="+not-found" />
                                    </Stack>
                                </AuthGate>
                                <StatusBar style="auto" />
                            </ThemeProvider>
                        </NavigationProvider>
                    </CompassProvider>
                </GlassesProvider>
            </AccessibilityProvider>
        </Provider>
    );
}
