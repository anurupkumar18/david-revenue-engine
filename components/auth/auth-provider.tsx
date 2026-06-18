"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { AuthUser } from "@/lib/icp-api";
import {
  ApiAuthError,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  registerAuthGate,
  signup as apiSignup,
} from "@/lib/icp-api";
import { AuthModal } from "@/components/auth/auth-modal";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  needsSignIn: boolean;
  refresh: () => Promise<void>;
  promptSignIn: (reason?: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | undefined>();
  const waiters = useRef<Array<(ok: boolean) => void>>([]);

  const settleAuthModal = useCallback((signedIn: boolean) => {
    setAuthOpen(false);
    setAuthReason(undefined);
    waiters.current.splice(0).forEach((resolve) => resolve(signedIn));
  }, []);

  const promptSignIn = useCallback((reason?: string) => {
    setAuthReason(reason);
    setAuthOpen(true);
    return new Promise<boolean>((resolve) => {
      waiters.current.push(resolve);
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      setNeedsSignIn(false);
    } catch (e) {
      setUser(null);
      if (e instanceof ApiAuthError) setNeedsSignIn(true);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    registerAuthGate(() =>
      promptSignIn("Sign in to save campaigns, connect your mailbox, and send email."),
    );
    return () => registerAuthGate(null);
  }, [promptSignIn]);

  const login = async (email: string, password: string) => {
    const me = await apiLogin(email, password);
    setUser(me);
    setNeedsSignIn(false);
  };

  const signup = async (email: string, password: string, name = "") => {
    const me = await apiSignup(email, password, name);
    setUser(me);
    setNeedsSignIn(false);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setNeedsSignIn(true);
  };

  const handleAuthModalClose = async (signedIn: boolean) => {
    if (signedIn) await refresh();
    settleAuthModal(signedIn);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, needsSignIn, refresh, promptSignIn, login, signup, logout }}
    >
      {children}
      <AuthModal
        open={authOpen}
        reason={authReason}
        onClose={handleAuthModalClose}
        login={login}
        signup={signup}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
