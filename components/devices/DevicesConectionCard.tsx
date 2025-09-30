import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import colors from "../../assets/colors";
import { Device } from "../../store/devicesSlice";

export default function DevicesConectionCard ({ item, handleDevicePress }: { item: Device; handleDevicePress: (device: any) => Promise<void> }) {
    return <TouchableOpacity onPress={() => handleDevicePress(item)} activeOpacity={0.85}>
        <View style={[styles.card, item.connected ? styles.cardConnected : styles.cardDisconnected]}>
            <View style={styles.cardIconName}>
                {item.type === 'wifi' ? (
                    <MaterialIcons name="wifi" size={32} color={item.connected ? colors.textSecondary : colors.secondary} />
                ) : (
                    <FontAwesome5 name="bluetooth-b" size={32} color={item.connected ? colors.textSecondary : colors.secondary} />
                )}
                {/* @ts-ignore */}
                <Text style={[styles.deviceName, ...(item.connected ? [styles.deviceNameConnected] : [])]}>{item.name ?? item.SSID}</Text>
            </View>
        </View>
    </TouchableOpacity>
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1.5,
        borderColor: '#e3eaf2',
    },
    cardConnected: {
        // borderColor: colors.primary,
        backgroundColor: colors.textDisabled,
        
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
        color: colors.human,
        fontWeight: '600',
    },
    deviceNameConnected: {
        color: colors.primary,
    },
    connectBtn: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    connectBtnActive: {
        backgroundColor: colors.warning,
    },
    disconnectBtn: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
});