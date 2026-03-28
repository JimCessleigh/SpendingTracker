import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../context/ThemeContext';
import { AppTheme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import CameraScreen from '../screens/CameraScreen';
import CardsScreen from '../screens/CardsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    cameraTabButton: {
      top: -24,
      justifyContent: 'center',
      alignItems: 'center',
      width: 64,
    },
    cameraTabInner: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
  });
}

export default function BottomTabNavigator() {
  const t = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  function CameraTabButton({ onPress }: { onPress?: (...args: any[]) => void }) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.cameraTabButton} activeOpacity={0.8}>
        <LinearGradient
          colors={theme.gradients.primary}
          style={styles.cameraTabInner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="camera" size={30} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textFaint,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.glass.border,
        },
        tabBarBackground: () => (
          <View style={{
            ...StyleSheet.absoluteFillObject,
            bottom: -50,
            backgroundColor: theme.colors.background,
            borderTopWidth: 1,
            borderTopColor: theme.glass.border,
          }} />
        ),
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" size={size + 2} color={color} />,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarLabel: t('spending'),
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size + 2} color={color} />,
        }}
      />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => <CameraTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Cards"
        component={CardsScreen}
        options={{
          tabBarLabel: t('cards'),
          tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" size={size + 2} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings'),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size + 2} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
