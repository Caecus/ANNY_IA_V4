
import colors from '@/assets/colors';
import Button from '@/components/common/Button';
import Text from '@/components/common/Text';
import { useAuth } from '@/hooks/useAuth';
import { getInitials, humanizeDate } from '@/utils/profile';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
    const { logout, user } = useAuth();
    const router = useRouter();
    const navigation = useNavigation();
    if (!user) return null;

    const initials = getInitials(user.name, user.lastName);
    const lastLogin = humanizeDate(user.lastLogin);

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text text={initials} type="h1" color={colors.buttonPrimaryText} style={{ letterSpacing: 1 }} />
                    </View>
                </View>
                <Text text={`${user.name} ${user.lastName}`} type="h2" weight="bold" color={colors.primary} style={styles.name} />
            </View>
            <View style={styles.infoContainer}>
                <Text text={user.email} type="h4" color={colors.textSecondary} style={styles.email} />
                <View style={styles.infoRows}>
                    <View style={styles.infoRow}>
                        <Text text="Lenguaje:" type="label" color={colors.label} style={styles.label} />
                        <Text text={user.language?.toUpperCase() || 'ES'} type="p2" color={colors.primary} />
                    </View>
                    <View style={styles.infoRow}>
                        <Text text="Último acceso:" type="label" color={colors.label} style={styles.label} />
                        <Text text={lastLogin} type="p2" color={colors.primary} />
                    </View>
                    <View style={styles.infoRow}>
                        <Text text="Estado:" type="label" color={colors.label} style={styles.label} />
                        <Text text={user.status === 'active' ? 'Activo' : 'Inactivo'} type="p2" color={user.status === 'active' ? colors.success : colors.error} />
                    </View>
                </View>
            </View>

            {/* Links a otras pantallas */}
            <View style={styles.linksContainer}>
                <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Devices')}>
                    <MaterialIcons name="bluetooth" size={22} color={colors.primary} style={styles.linkIcon} />
                    <Text text="Conexión a dispositivos" type="p2" color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.buttonSubcontainer} onPress={logout}>
                    <Button 
                        text="Cerrar sesión" 
                        // style={styles.logoutBtn} 
                        type='outlined'
                    />
                    <MaterialIcons name="logout" size={24} color={colors.primary}/>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const AVATAR_SIZE = 96;
const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: colors.background,
        paddingTop: 32,
        paddingBottom: 100,
        minHeight: '100%',
    },
    headerContainer: {
        width: '100%',
        flex: 1.2,
        rowGap: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarContainer: {},
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    name: {
        textAlign: 'center',
    },
    email: {
        marginBottom: 16,
        textAlign: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 10,
        gap: 8,
    },
    label: {
        minWidth: 110,
    },
    infoContainer: {
        flex: 2,
        width: '100%',
        paddingHorizontal: 24,
        maxWidth: 500,
        alignSelf: 'center',
    },
    infoRows: {
        width: '100%',
        justifyContent: 'center',
        paddingTop: 40,
    },
    linksContainer: {
        width: '100%',
        paddingHorizontal: 16,
        marginTop: 10,
        marginBottom: 0,
        gap: 12,
        flex: 1,
        justifyContent: 'center',
        maxWidth: 500,
        alignSelf: 'center',
    },
    link: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.backgroundAlt,
        borderRadius: 16,
        marginBottom: 2,
    },
    linkIcon: {
        marginRight: 12,
    },
    buttonSubcontainer: {
        // alignSelf: 'center',
        // backgroundColor: '#f00',
        justifyContent: 'flex-start',
        alignItems: 'center',
        flexDirection: 'row',
        width: '30%',
        // columnGap: 4
    },
    buttonContainer: {
        width: '100%',
        // backgroundColor: '#F00',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        marginTop: 24,
    }
});
