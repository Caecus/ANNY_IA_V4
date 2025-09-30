import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import colors from '../../assets/colors';
import { ThemedText } from '../../components/ThemedText';
import { logEvent } from '../../services/log';

export default function LegalScreen() {
    const router = useRouter();
    React.useEffect(() => {
        logEvent('screen_view', { screen: 'Legal' });
    }, []);
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ width: '10%' }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} onPress={() => router.back()} />
                </View>
                <View style={{ width: '90%', alignItems: 'center' }}>
                    <ThemedText type="title" style={{ color: colors.primary }}>Legal</ThemedText>
                </View>
            </View>
            <View style={styles.body}>
                <ThemedText>Contenido de la pantalla legal.</ThemedText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        paddingVertical: '10%',
        backgroundColor: '#fff' 
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%', 
        padding: 16, 
        borderBottomWidth: 1, 
        borderColor: '#eee' 
    },
    body: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
});
