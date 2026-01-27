import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const TOKEN_KEY = 'auth_token';

export async function loginWithUsernamePassword({ username, password }) {
  // Backend note:
  // I didn't find an auth route in the current FastAPI routes.
  // By default, this calls POST /auth/login expecting a { token } response.
  // Update the path/response handling once your backend auth endpoint is finalized.

  const res = await api.post('/auth/login', {
    username,
    password,
  });

  const token = res?.data?.token;
  if (!token) {
    throw new Error('Login response did not include token');
  }

  await AsyncStorage.setItem(TOKEN_KEY, token);
  return token;
}

export async function logout() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getCurrentUser() {
  const res = await api.get('/auth/me');
  return res?.data;
}
