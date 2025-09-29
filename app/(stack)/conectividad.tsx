import colors from '@/assets/colors';
import DevicesConectionCard from '@/components/devices/DevicesConectionCard';
import { ThemedText } from '@/components/ThemedText';
import { GlassesContext } from '@/context/GlassesContext';
import { logEvent } from '@/services/log';
import { connectDevice, Device, disconnectDevice } from '@/store/devicesSlice';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// import WifiManager from "react-native-wifi-reborn";
import { useDispatch, useSelector } from 'react-redux';

const DEVICES_WIFI: Device[] = [
    { id: '1', SSID: 'WiFi - Casa', type: 'wifi', connected: false },
    { id: '2', SSID: 'WiFi - Oficina', type: 'wifi', connected: false },
];
const DEVICES_BT: Device[] = [
    { id: '3', name: 'Bluetooth - Audífonos', type: 'bluetooth', connected: false },
    { id: '4', name: 'Bluetooth - Teclado', type: 'bluetooth', connected: false },
    { id: '5', name: 'Bluetooth - Lentes', type: 'bluetooth', connected: false },
];

export default function ConectividadScreen() {
    const router = useRouter();
    const [devices, setDevices] = useState([]);
    const dispatch = useDispatch();
    const glasses = useContext(GlassesContext);
    const { connected } = useSelector((state: any) => state.devices);
    const [wifiNetworks, setWifiNetworks] = useState<Pick<Device, 'SSID'>[]>([]);
    const [btDevices, setBtDevices] = useState<Device[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<typeof DEVICES_BT[0] | null>(null);
    const [modalType, setModalType] = useState<'connect' | 'disconnect'>('connect');
    // Estado para el modal/input
    const [wifiCredentials, setWifiCredentials] = useState({ ssid: '', pass: '' });
    const [showWifiModal, setShowWifiModal] = useState(false);

    const handleDevicePress = async (device: any) => {
        if (device.type === 'wifi') {
            setWifiCredentials({ ssid: device.SSID, pass: '' });
            setShowWifiModal(true);
        } else {
            setSelectedDevice(device);
            setModalType(device.connected ? 'disconnect' : 'connect');
            setModalVisible(true);
        }
    };

    const handleModalAction = async () => {
        if (!selectedDevice) return;
        let success = false;
        try {
            if (modalType === 'connect') {
                if (selectedDevice.type === 'bluetooth') {
                    const result = await glasses.glassesConnect(selectedDevice.id);
                    success = !!result && result !== 'error';
                    if (success) {
                        dispatch(connectDevice({ ...selectedDevice, connected: true }));
                    } else {
                        Alert.alert('Error', 'No se pudo conectar al dispositivo.');
                    }
                }
                // Para WiFi, la conexión se realiza desde el modal específico, no aquí
            } else {
                await glasses.glassesDisconnect();
                dispatch(disconnectDevice(selectedDevice.type));
            }
        } catch (e) {
            Alert.alert('Error', 'Ocurrió un error en la conexión.');
        }
        setModalVisible(false);
    };

    // Obtener dispositivos conectados desde Redux
    const connectedDevices = [connected.wifi, connected.bluetooth].filter(Boolean);

    const renderDevice = ({ item }: { item: Device }) => <DevicesConectionCard item={item} handleDevicePress={handleDevicePress} />;

    useEffect(() => {
        logEvent('screen_view', { screen: 'Conectividad' });
        logEvent('connected_devices', { wifi: connected.wifi, bluetooth: connected.bluetooth });
        if (__DEV__) {
            setWifiNetworks(DEVICES_WIFI);
            setBtDevices(DEVICES_BT);
        } else {
            if (glasses.scanBluetoothDevices) {
                glasses.scanBluetoothDevices().then(() => {
                    setBtDevices(glasses.btDevices || []);
                });
            }
            // WifiManager.loadWifiList()
            //     .then((networks) => {
            //         setWifiNetworks(networks);
            //     })
            //     .catch(() => setWifiNetworks([]));
        }
    }, [connected]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ width: '10%' }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} onPress={() => router.back()} />
                </View>
                <View style={{ width: '90%', alignItems: 'center' }}>
                    <ThemedText type="title" style={{ color: colors.primary }}>Conectividad</ThemedText>
                </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
                <ThemedText type="subtitle" style={styles.title}>Dispositivos conectados</ThemedText>
                <FlatList
                    data={connectedDevices}
                    keyExtractor={(item) => item.id}
                    renderItem={renderDevice}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginBottom: 12 }}>No hay dispositivos conectados</Text>}
                    scrollEnabled={false}
                />
                <ThemedText type="subtitle" style={styles.title}>Dispositivos Wi-Fi</ThemedText>
                <FlatList
                    data={wifiNetworks}
                    keyExtractor={(item) => item.SSID || ''}
                    renderItem={({ item }) => (
                        <DevicesConectionCard
                            item={{
                                id: item.SSID || '',
                                name: item.SSID || '',
                                type: "wifi",
                                connected: false,
                            }}
                            handleDevicePress={handleDevicePress}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginBottom: 12 }}>No hay redes Wi-Fi disponibles</Text>}
                    scrollEnabled={false}
                />
                <ThemedText type="subtitle" style={styles.title}>Dispositivos Bluetooth</ThemedText>
                <FlatList
                    data={btDevices}
                    keyExtractor={(item) => item.id}
                    renderItem={renderDevice}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginBottom: 12 }}>No hay dispositivos Bluetooth disponibles</Text>}
                    scrollEnabled={false}
                />
            </ScrollView>
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.50)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 28, width: '80%', alignItems: 'center' }}>
                        <ThemedText type="title" style={{ marginBottom: 12, color: colors.human }}>
                            {modalType === 'connect' ? '¿Conectar a este dispositivo?' : '¿Desconectar este dispositivo?'}
                        </ThemedText>
                        <Text style={{ fontSize: 24, marginBottom: 24, color: colors.human }}>{selectedDevice?.name}</Text>
                        <View style={{ flexDirection: 'row', gap: 18 }}>
                            <TouchableOpacity
                                style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 }}
                                onPress={handleModalAction}
                            >
                                <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 16 }}>
                                    {modalType === 'connect' ? 'Conectar' : 'Desconectar'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ backgroundColor: colors.textDisabled, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 }}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* MODAL WIFI */}
            <Modal visible={showWifiModal} transparent animationType="fade">
                <View style={{ 
                    flex: 1, 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    backgroundColor: 'rgba(0,0,0,0.5)' 
                }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 28, width: '80%' }}>
                    <Text style={{ fontSize: 18, marginBottom: 12 }}>
                        Conectar a {wifiCredentials.ssid || selectedDevice?.name || selectedDevice?.SSID || 'WiFi'}
                    </Text>
                    <TextInput
                        placeholder="Contraseña"
                        secureTextEntry
                        value={wifiCredentials.pass}
                        onChangeText={(text) => setWifiCredentials((prev) => ({ ...prev, pass: text }))}
                        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 16 }}
                    />
                    <TouchableOpacity
                        style={{ backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' }}
                        onPress={async () => {
                            // Validar que glasses esté activo antes de intentar conectar WiFi
                            // Validar que glasses exista antes de intentar conectar WiFi
                            if (!glasses) {
                                Alert.alert('Error', 'No hay contexto de dispositivo activo. Conecta primero un dispositivo Bluetooth.');
                                return;
                            }
                            await glasses.glassesConnectWiFi(wifiCredentials.ssid, wifiCredentials.pass);
                            setShowWifiModal(false);
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Conectar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ marginTop: 8, alignItems: 'center' }}
                        onPress={() => setShowWifiModal(false)}
                    >
                        <Text style={{ color: '#333' }}>Cancelar</Text>
                    </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7fafd',
        paddingHorizontal: 16,
        paddingTop: '10%',
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%', 
        padding: 16, 
        marginBottom: 10,
        borderBottomWidth: 1, 
        borderColor: '#eee' 
    },
    listContent: {
        paddingBottom: 32,
    },
    title: {
        marginBottom: 18,
        textAlign: 'center',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1.5,
        borderColor: '#e3eaf2',
    },
    cardConnected: {
        borderColor: '#2196F3',
        backgroundColor: '#e3f2fd',
    },
    cardDisconnected: {
        borderColor: '#e3eaf2',
        backgroundColor: '#fff',
    },
    cardIconName: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    deviceName: {
        fontSize: 18,
        color: '#222',
        fontWeight: '600',
    },
    deviceNameConnected: {
        color: '#1976D2',
    },
    connectBtn: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#2196F3',
        backgroundColor: '#fff',
    },
    connectBtnActive: {
        backgroundColor: '#e3f2fd',
    },
    disconnectBtn: {
        backgroundColor: '#2196F3',
        borderColor: '#1976D2',
    },
});
