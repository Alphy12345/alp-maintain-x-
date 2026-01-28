import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import LoginScreen from './screens/LoginScreen';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { getCurrentUser, getToken, logout } from './services/auth';
import RootStack from './navigation/RootStack';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AppReloadProvider, useAppReload } from './context/AppReloadContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppReloadProvider>
          <AppRoot />
        </AppReloadProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRoot() {
  const [isBooting, setIsBooting] = useState(true);
  const { user, setUser } = useAuth();
  const { mode, colors, hydrated } = useTheme();
  const { reloadKey } = useAppReload();

  useEffect(() => {
    const boot = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const me = await getCurrentUser();
        setUser(me);
      } catch (e) {
        await logout();
        setUser(null);
      } finally {
        setIsBooting(false);
      }
    };

    boot();
  }, []);

  if (isBooting || !hydrated) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
            <ActivityIndicator color={mode === 'dark' ? '#ffffff' : '#111827'} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <LoginScreen onLoggedIn={setUser} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <NavigationContainer key={String(reloadKey)}>
          <RootStack />
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
