import { useColorScheme } from '@/hooks/useColorScheme';
import { RootState, store } from '@/store/store';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Provider, useSelector } from 'react-redux';

function AuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const segments = useSegments();
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    useEffect(() => {
        const currentRoute = segments.join('/');
        if (!isAuthenticated && !currentRoute.includes('screens/auth')) {
            router.replace('/screens/auth/Login');
        } else if (isAuthenticated && !currentRoute.includes('(tabs)')) {
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

    if (!loaded) {
        return null;
    }

    return (
        <Provider store={store}>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <AuthGate>
                    <Stack>
                        <Stack.Screen name="screens/auth/Login" options={{ headerShown: false }} />
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="+not-found" />
                    </Stack>
                </AuthGate>
                <StatusBar style="auto" />
            </ThemeProvider>
        </Provider>
    );
}
