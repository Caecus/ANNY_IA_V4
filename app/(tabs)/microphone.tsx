import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '../../components/common/Text';

export default function MicrophoneScreen() {
    return (
        <View style={styles.container}>
            <Text type="h1" textAlign="center" text="Micrófono" />
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
