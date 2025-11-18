

import colors from '@/assets/colors';
import Button from '@/components/common/Button';
import Text from '@/components/common/Text';
import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Dimensions, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleLogin = async () => {
        setLoading(true);
        try {
            const payload = { email, password };
            const result = await login(payload);

            if (result?.access_token && result?.user) {
                router.replace('/index');
            } else {
                Alert.alert('Error', result?.message || 'Credenciales incorrectas');
            }
        } catch (e) {
            Alert.alert('Error', 'Ocurrió un error inesperado');
        } finally {
            setLoading(false);
        }
    };

        return (
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.gradientBg}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.cardGlass}>
                            <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
                            <Text type="h1" textAlign="center" style={styles.title} text="Iniciar sesión" />
                            <Text type="h3" textAlign="center" style={styles.subtitle} text="¡Bienvenido de nuevo!" />
                            <TextInput
                                style={styles.input}
                                placeholder="Correo electrónico"
                                placeholderTextColor={colors.textDisabled}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                value={email}
                                onChangeText={setEmail}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Contraseña"
                                placeholderTextColor={colors.textDisabled}
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                            <Button
                                text="Iniciar sesión"
                                textType='h4'
                                onPress={handleLogin}
                                loading={loading}
                                disabled={loading || !email || !password}
                                style={styles.button}
                            />
                        </View>
                        <View style={styles.footerDecor} />
                    </ScrollView>
                </LinearGradient>
            </KeyboardAvoidingView>
        );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    gradientBg: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
        // width: '50%',
        paddingVertical: 24,
    },
    cardGlass: {
        width: '90%',
        maxWidth: 720,
        minWidth: 260,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 32,
        paddingVertical: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
        borderColor: 'transparent',
    },
    logo: {
        width: '40%',
        maxWidth: 140,
        aspectRatio: 1,
        marginBottom: 12,
        marginTop: -16,
    },
    title: {
        marginBottom: 8,
        color: colors.white,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        fontSize: 22,
    },
    subtitle: {
        marginBottom: 28,
        color: colors.white,
        fontWeight: '600',
        fontSize: 16,
    },
    input: {
        width: '100%',
        minWidth: 180,
        height: 48,
        borderRadius: 16,
        borderWidth: 0,
        backgroundColor: 'rgba(255,255,255,0.85)',
        paddingHorizontal: 14,
        marginBottom: 16,
        fontSize: 16,
        color: colors.text,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    button: {
        marginTop: 10,
        width: '100%',
        borderRadius: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 4,
    },
    footerDecor: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
        backgroundColor: colors.primary,
        borderTopLeftRadius: 48,
        borderTopRightRadius: 48,
        opacity: 0.12,
        zIndex: -1,
    },
});

export default Login;
