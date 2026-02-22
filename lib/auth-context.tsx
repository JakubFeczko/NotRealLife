import React, { createContext, useContext, useEffect, useState } from "react";
import {
  loginRequest,
  logOutRequest,
  refreshTokensFromStorage,
  signUpRequest,
  verifyCodeRequest,
} from "./auth-api";
import {
  AuthIdentity,
  clearIdentity,
  clearTokens,
  getIdentity,
  getRefreshToken,
  saveIdentity,
  saveTokens,
} from "./auth-storage";

type AuthContextType = {
  isLoggedIn: boolean;
  hasCompletedOnboarding: boolean;

  signIn: (loginOrEmail: string, password: string) => Promise<string | null>;
  signUp: (
    email: string,
    login: string,
    password: string,
  ) => Promise<string | null>;
  verifyEmail: (email: string, code: string) => Promise<string | null>;

  completeOnboarding: () => void;
  signOut: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  /** Sprawdzamy przy starcie czy mamy refresh token */
  useEffect(() => {
    (async () => {
      const refresh = await getRefreshToken();
      const storedIdentity = await getIdentity();
      setIdentity(storedIdentity);

      if (!refresh) {
        setIsLoggedIn(false);
        setHasCompletedOnboarding(false);
        setLoading(false);
        return;
      }

      try {
        const refreshedAccess = await refreshTokensFromStorage();
        if (!refreshedAccess) {
          throw new Error("Brak danych do odświeżenia sesji.");
        }
        setIsLoggedIn(true);
      } catch {
        await clearTokens();
        await clearIdentity();
        setIdentity(null);
        setIsLoggedIn(false);
      }

      setHasCompletedOnboarding(false);
      setLoading(false);
    })();
  }, []);

  const signIn = async (loginOrEmail: string, password: string) => {
    try {
      const normalizedIdentifier = loginOrEmail.trim();
      const { access_token, refresh_token } = await loginRequest(
        normalizedIdentifier,
        password,
      );

      await saveTokens(access_token, refresh_token);

      const previousIdentity = await getIdentity();
      const isEmail = normalizedIdentifier.includes("@");
      const nextIdentity: AuthIdentity = {};
      if (previousIdentity?.login) {
        nextIdentity.login = previousIdentity.login;
      }
      if (previousIdentity?.email) {
        nextIdentity.email = previousIdentity.email;
      }
      if (isEmail) {
        nextIdentity.email = normalizedIdentifier;
      } else {
        nextIdentity.login = normalizedIdentifier;
      }

      await saveIdentity(nextIdentity);
      setIsLoggedIn(true);
      setIdentity(nextIdentity);

      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Błąd logowania";
    }
  };

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
  };

  const signUp = async (email: string, login: string, password: string) => {
    try {
      await signUpRequest(email, login, password);
      await saveIdentity({ login, email });
      setIdentity({ login, email });
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Błąd rejestracji";
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    try {
      await verifyCodeRequest(email, code);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Błąd weryfikacji emaila";
    }
  };

  const signOut = async () => {
    let serverError: string | null = null;

    try {
      const activeIdentity = identity ?? (await getIdentity());
      if (activeIdentity) {
        if (activeIdentity.email) {
          await logOutRequest({ email: activeIdentity.email });
        } else if (activeIdentity.login) {
          await logOutRequest({ login: activeIdentity.login });
        } else {
          await logOutRequest();
        }
      } else {
        await logOutRequest();
      }
    } catch (e) {
      serverError = e instanceof Error ? e.message : "Błąd wylogowania";
    }

    await clearTokens();
    await clearIdentity();
    setIsLoggedIn(false);
    setHasCompletedOnboarding(false);
    setIdentity(null);
    return serverError;
  };

  if (loading) return null; // splash / loader

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        hasCompletedOnboarding,
        signIn,
        signUp,
        verifyEmail,
        completeOnboarding,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
