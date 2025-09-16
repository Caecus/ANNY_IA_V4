import Button from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ProfileScreen() {
    const { logout } = useAuth();

    return (
        <View style={styles.container}>
            <Button text='Logout' onPress={logout} />
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
