import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { AppTheme } from '../constants/theme';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import CameraScreen from '../screens/CameraScreen';
import CardsScreen from '../screens/CardsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    tabBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: Platform.OS === 'ios' ? 88 : 72,
      backgroundColor: theme.glass.background,
      elevation: 0,
      borderTopWidth: 1,
      borderTopColor: theme.glass.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    },
    tabBarBackgroundContainer: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: -4,
      marginBottom: Platform.OS === 'ios' ? -12 : 4,
    },
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
  const { state } = useApp();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Correctly read dark mode from app state
  const isDark = state.darkMode;

  function CameraTabButton({ onPress }: any) {
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
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <View style={styles.tabBarBackgroundContainer}>
            <BlurView 
              intensity={Platform.OS === 'ios' ? 60 : 100} 
              tint={isDark ? 'dark' : 'light'} 
              style={StyleSheet.absoluteFill} 
            />
          </View>
        ),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textFaint,
        tabBarLabelStyle: styles.tabLabel,
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
