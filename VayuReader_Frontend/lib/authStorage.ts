import * as SecureStore from 'expo-secure-store';

export type AuthUser = {
  name: string;
  phone_number: string;
};

const TOKEN_KEY = 'auth_token_v2';
const USER_KEY = 'auth_user';
const EXPIRY_KEY = 'auth_expiry';

export const setToken = async (token: string) => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(TOKEN_KEY);
};

export const clearToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(EXPIRY_KEY);
};

export const setUser = async (user: AuthUser) => {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
};

export const getUser = async (): Promise<AuthUser | null> => {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const setExpiry = async (expiresAtMs: number) => {
  await SecureStore.setItemAsync(EXPIRY_KEY, String(expiresAtMs));
};

export const getExpiry = async (): Promise<number | null> => {
  const raw = await SecureStore.getItemAsync(EXPIRY_KEY);
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};
