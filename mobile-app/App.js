import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';

import LoginScreen from './screens/LoginScreen';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { getCurrentUser, getToken, logout } from './services/auth';
import RootStack from './navigation/RootStack';

export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}

function AppRoot() {
  const [isBooting, setIsBooting] = useState(true);
  const { user, setUser } = useAuth();

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

  if (isBooting) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b1220' }}>
        <StatusBar style="light" />
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onLoggedIn={setUser} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </>
  );
}
