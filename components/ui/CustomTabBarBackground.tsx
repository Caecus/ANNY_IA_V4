import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import colors from '../../assets/colors';

export default function CustomTabBarBackground() {
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            >
                <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
            </LinearGradient>
        </View>
    );
}
