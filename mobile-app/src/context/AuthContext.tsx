import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TOKEN_KEY, USER_KEY, setCachedToken } from "../api/client";
import * as api from "../api/endpoints";
import { Establishment, User } from "../types";

const ESTABLISHMENT_KEY = "auth.establishment";

import { SplashMode } from "../components/ThematicSplash";

interface AuthContextValue {
  user: User | null;
  establishment: Establishment | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  isLoggingOut: boolean;
  authMessage: string;
  authMode: SplashMode;
  isAuthenticated: boolean;
  login: (nameOrUsername: string, password?: string, shift?: "apertura" | "cierre", isAdminHint?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchAndCacheEstablishment(establishmentId: string): Promise<Establishment | null> {
  try {
    const establishment = await api.getEstablishment(establishmentId);
    await AsyncStorage.setItem(ESTABLISHMENT_KEY, JSON.stringify(establishment));
    return establishment;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authMessage, setAuthMessage] = useState("Iniciando sesión...");
  const [authMode, setAuthMode] = useState<SplashMode>("general");

  useEffect(() => {
    (async () => {
      const startTime = Date.now();
      try {
        const [token, storedUser, storedEstablishment] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(ESTABLISHMENT_KEY),
        ]);
        if (token && storedUser) {
          setCachedToken(token);
          const parsedUser = JSON.parse(storedUser) as User;
          setUser(parsedUser);
          if (storedEstablishment) {
            setEstablishment(JSON.parse(storedEstablishment) as Establishment);
          }
          fetchAndCacheEstablishment(parsedUser.establishmentId).then((fresh) => {
            if (fresh) setEstablishment(fresh);
          });
        }
      } finally {
        // Garantizar al menos 5 segundos de ventana de carga en el inicio
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 5000 - elapsed);
        setTimeout(() => {
          setIsLoading(false);
        }, remaining);
      }
    })();
  }, []);

  const login = useCallback(async (nameOrUsername: string, password?: string, shift?: "apertura" | "cierre", isAdminHint?: boolean) => {
    setIsAuthenticating(true);
    // Modo tentativo inicial
    const initialMode: SplashMode = isAdminHint
      ? "admin"
      : shift === "cierre"
      ? "cierre"
      : shift === "apertura"
      ? "apertura"
      : "general";
    setAuthMode(initialMode);
    setAuthMessage("Iniciando sesión...");

    try {
      const minDelayPromise = new Promise((res) => setTimeout(res, 4500));
      const responsePromise = api.login(nameOrUsername, password, shift);

      const [response] = await Promise.all([responsePromise, minDelayPromise]);

      const isAdmin = response.user.role === "admin";
      if (isAdmin) {
        setAuthMode("admin");
        setAuthMessage("Iniciando Panel de Administración...");
      } else {
        const userShift = shift || response.user.shift || "apertura";
        setAuthMode(userShift === "cierre" ? "cierre" : "apertura");
        setAuthMessage(`Iniciando turno de ${userShift === "cierre" ? "Cierre" : "Apertura"}...`);
      }

      const userWithShift = {
        ...response.user,
        shift: isAdmin ? undefined : (shift || response.user.shift),
      };

      setCachedToken(response.token);
      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userWithShift));
      setUser(userWithShift);
      const fresh = await fetchAndCacheEstablishment(response.user.establishmentId);
      setEstablishment(fresh);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await new Promise((res) => setTimeout(res, 2500));
      setCachedToken(null);
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, ESTABLISHMENT_KEY]);
      setUser(null);
      setEstablishment(null);
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      establishment,
      isLoading,
      isAuthenticating,
      isLoggingOut,
      authMessage,
      authMode,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user, establishment, isLoading, isAuthenticating, isLoggingOut, authMessage, authMode, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
