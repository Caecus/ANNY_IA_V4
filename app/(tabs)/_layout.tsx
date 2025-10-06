
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../../assets/colors';
import CustomTabBarBackground from '../../components/ui/CustomTabBarBackground';

function MicTabButton({
  children,
  onPress,
  accessibilityState = {},
}: {
  children: React.ReactNode;
  onPress?: (e?: any) => void;
  accessibilityState?: { selected?: boolean };
}) {
  const focused = accessibilityState?.selected ?? false;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.micButton,
        focused && styles.micButtonActive,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,
        headerShown: false,
        tabBarBackground: () => <CustomTabBarBackground />,
        tabBarStyle: [
          {
            position: 'absolute',
            borderTopWidth: 0,
            backgroundColor: 'transparent',
            elevation: 0,
            height: 70,
            paddingBottom: Platform.OS === 'ios' ? 24 : 10,
            paddingTop: 8,
          },
        ],
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="home" size={28} color={focused ? colors.primary : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ContactsScreen"
        options={{
          title: 'Contactos',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="contacts" size={28} color={focused ? colors.primary : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="microphone"
        options={{
          title: 'Microfono',
          tabBarButton: (props) => (
            <MicTabButton
              {...props}
              onPress={props.onPress}
            >
              <MaterialIcons name="mic" size={36} color={colors.white} />
            </MicTabButton>
          ),
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="explore" size={28} color={focused ? colors.primary : color} />
          ),
        }}
      />

      <Tabs.Screen
        name="ProfileScreen"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name="person" size={28} color={focused ? colors.primary : color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  micButton: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 4,
    borderColor: colors.backgroundAlt,
  },
  micButtonActive: {
    backgroundColor: colors.primaryLight,
  },
});
