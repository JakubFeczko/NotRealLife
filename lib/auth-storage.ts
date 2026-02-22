// lib/auth-storage.ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const IDENTITY_KEY = 'auth_identity';

export type AuthIdentity = {
  login?: string;
  email?: string;
};

export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function saveIdentity(identity: AuthIdentity) {
  const normalizedLogin = identity.login?.trim();
  const normalizedEmail = identity.email?.trim();

  if (!normalizedLogin && !normalizedEmail) {
    await clearIdentity();
    return;
  }

  const normalizedIdentity: AuthIdentity = {};
  if (normalizedLogin) {
    normalizedIdentity.login = normalizedLogin;
  }
  if (normalizedEmail) {
    normalizedIdentity.email = normalizedEmail;
  }

  await SecureStore.setItemAsync(IDENTITY_KEY, JSON.stringify(normalizedIdentity));
}

export async function getIdentity(): Promise<AuthIdentity | null> {
  const raw = await SecureStore.getItemAsync(IDENTITY_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const login =
      typeof parsed.login === "string" && parsed.login.trim().length > 0
        ? parsed.login.trim()
        : undefined;
    const email =
      typeof parsed.email === "string" && parsed.email.trim().length > 0
        ? parsed.email.trim()
        : undefined;

    if (!login && !email) return null;
    return { login, email };
  } catch {
    return null;
  }
}

export async function clearIdentity() {
  await SecureStore.deleteItemAsync(IDENTITY_KEY);
}
