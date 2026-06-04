import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { HomeScreen }           from './src/screens/HomeScreen';
import { EnrollmentScreen }     from './src/screens/EnrollmentScreen';
import { AuthenticationScreen } from './src/screens/AuthenticationScreen';
import { SyncStatusScreen }     from './src/screens/SyncStatusScreen';
import { COLORS }               from './src/config/DesignTokens';
import StorageService           from './src/services/StorageService';
import SyncService              from './src/services/SyncService';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    const initServices = async () => {
      try {
        // Initialize encrypted DB / fallback memory store
        await StorageService.initialize();
        // Start offline synchronization queue watcher
        await SyncService.startAutoSync();
      } catch (err) {
        console.error('[App] Failed to initialize core services:', err);
      }
    };

    initServices();

    return () => {
      // Clean up sync queue watchers on unmount
      SyncService.stop();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />
      
      <NavigationContainer theme={{
        dark: true,
        colors: {
          primary:       COLORS.accent,
          background:    COLORS.bgPrimary,
          card:          COLORS.bgCard,
          text:          COLORS.textPrimary,
          border:        COLORS.bgSurface,
          notification:  COLORS.accent,
        },
      }}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle:           { backgroundColor: COLORS.bgCard },
            headerTintColor:       COLORS.textPrimary,
            headerTitleStyle:      { fontWeight: '600' },
            cardStyle:             { backgroundColor: COLORS.bgPrimary },
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Enrollment" 
            component={EnrollmentScreen} 
            options={{ title: 'Face Enrollment' }} 
          />
          <Stack.Screen 
            name="Authentication" 
            component={AuthenticationScreen} 
            options={{ title: 'Face Authentication' }} 
          />
          <Stack.Screen 
            name="SyncStatus" 
            component={SyncStatusScreen} 
            options={{ title: 'Cloud Sync Status' }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
