import Text from '@/components/common/Text';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ProfileScreen() {
    return (
        <View style={styles.container}>
            <Text type="h1" textAlign="center" text="Perfil" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5fa',
    },
});
