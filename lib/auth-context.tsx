import React, { createContext, useContext, useEffect, useState } from "react";
import { loginRequest, signUpRequest, verifyEmailResponse } from "./auth-api";
import { clearTokens, getRefreshToken, saveTokens } from "./auth-storage";

type AuthContextType = {
  isLoggedIn: boolean;
  hasCompletedOnboarding: boolean;

  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    email: string,
    login: string,
    password: string,
  ) => Promise<string | null>;
  verifyEmail: (email: string, code: string) => Promise<string | null>;
  
  completeOnboarding: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  /** Sprawdzamy przy starcie czy mamy refresh token */
  useEffect(() => {
    (async () => {
      const refresh = await getRefreshToken();
      //clearTokens();
      console.log(refresh);
      setIsLoggedIn(!!refresh);

      setHasCompletedOnboarding(false);
      setLoading(false);
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { access_token, refresh_token } = await loginRequest(
        email,
        password,
      );

      await saveTokens(access_token, refresh_token);
      setIsLoggedIn(true);

      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Błąd logowania";
    }
  };

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
  };

  const signUp = async (email: string, login: string, password: string) => {
    // jeżeli backend ma osobny /register → analogicznie
    try {
      const { accountCreated } = await signUpRequest(email, login, password);
      console.log("Rejestracja użytkownika:", accountCreated);

      //return signIn(email, password);
      return null;
    } catch (e) {
      return null;
      //return e instanceof Error ? e.message : "Błąd rejestracji";
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    try {
      const { codeVerified } = await verifyEmailResponse(email, code);
      console.log("Weryfikacja kodu:", codeVerified);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Błąd weryfikacji emaila";
    }
  };

  const signOut = async () => {
    await clearTokens();
    setIsLoggedIn(false);
    setHasCompletedOnboarding(false);
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
