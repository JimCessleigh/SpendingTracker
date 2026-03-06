import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider } from './src/context/AppContext';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import AIScreen from './src/screens/AIScreen';
import { theme } from './src/constants/theme';

function AppInner() {
  const [aiVisible, setAiVisible] = useState(false);

  return (
    <View style={styles.container}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <BottomTabNavigator />
      </NavigationContainer>

      <TouchableOpacity style={styles.fab} onPress={() => setAiVisible(true)}>
        <Ionicons name="sparkles" size={24} color="#fff" />
      </TouchableOpacity>

      <AIScreen visible={aiVisible} onClose={() => setAiVisible(false)} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },
});
