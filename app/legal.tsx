import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';

export default function LegalScreen() {
  const router = useRouter();
  React.useEffect(() => {
    console.log('ENTRANDO LEGAL SCREEN');
  }, []);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color="#333" onPress={() => router.back()} />
        <ThemedText type="title">Legal</ThemedText>
      </View>
      <View style={styles.body}>
        <ThemedText>Contenido de la pantalla legal.</ThemedText>
      </View>
    </View>
  );
}

export const options = {
  headerShown: false,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', zIndex: 10000000 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
