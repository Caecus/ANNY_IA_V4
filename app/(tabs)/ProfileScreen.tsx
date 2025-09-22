import colors from '@/assets/colors';
import Button from '@/components/common/Button';
import Text from '@/components/common/Text';
import { useAuth } from '@/hooks/useAuth';
import { getInitials, humanizeDate } from '@/utils/profile';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ProfileScreen() {
    const { logout, user } = useAuth();
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
            <View style={styles.buttonContainer}>
                <Button text="Cerrar sesión" onPress={logout} style={styles.logoutBtn} />
            </View>
        </View>
    );
}

const AVATAR_SIZE = 96;
const styles = StyleSheet.create({
    container: {
        // flex: 1,
        height: '90%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: colors.background,
        paddingTop: 48,
    },
    headerContainer: {
        width: '100%',
        height: '30%',
        rowGap: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarContainer: {
        
    },
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
        // marginTop: 8,
        // marginBottom: 2,
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
        height: '50%',
        width: '100%',
        paddingHorizontal: '15%'
    },
    infoRows: {
        width: '100%',
        justifyContent: 'center',
        paddingTop: 40
    },
    buttonContainer: {
        height: '20%',
        width: '50%'
    },
    logoutBtn: {
        marginTop: 32,
        width: 200,
    },
});
