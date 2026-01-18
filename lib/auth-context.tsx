import React, { createContext, useContext, useEffect, useState } from "react";
import { saveTokens, clearTokens, getRefreshToken } from "./auth-storage";
import { loginRequest, refreshRequest } from "./auth-api";

type AuthContextType = {
  isLoggedIn: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  /** Sprawdzamy przy starcie czy mamy refresh token */
  useEffect(() => {
    (async () => {
      const refresh = await getRefreshToken();
      console.log(refresh);
      setIsLoggedIn(!!refresh);
      setLoading(false);
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
  try {
    const { access_token } = await loginRequest(email, password);

    await saveTokens(access_token);
    setIsLoggedIn(true);

    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Błąd logowania";
  }
};

  const signUp = async (email: string, password: string) => {
    // jeżeli backend ma osobny /register → analogicznie
    return signIn(email, password);
  };

  const signOut = async () => {
    await clearTokens();
    setIsLoggedIn(false);
  };

  if (loading) return null; // splash / loader

  return (
    <AuthContext.Provider value={{ isLoggedIn, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}