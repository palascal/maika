import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";
import { canAccessConfig, canAssignElevatedRoles, canManageLeague } from "../lib/accessRoles";
import { isSupabaseConfigured } from "../lib/supabaseConfig";
import type { AuthSession } from "./authCredentials";
import { authSessionFromSupabaseUser } from "./mapSupabaseSession";
import { readStoredSession, tryLogin, writeStoredSession } from "./authCredentials";

interface AuthContextValue {
  session: AuthSession | null;
  /** Prêt après restauration de session Supabase (`getSession`) ou immédiatement en mode JSON. */
  authReady: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  role: AuthSession["role"] | null;
  isAdmin: boolean;
  canManageLeague: boolean;
  canAccessConfig: boolean;
  canAssignElevatedRoles: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabaseMode = isSupabaseConfigured();
  const [session, setSession] = useState<AuthSession | null>(() => (supabaseMode ? null : readStoredSession()));
  const [authReady, setAuthReady] = useState(() => !supabaseMode);

  useEffect(() => {
    if (!supabaseMode) return;
    const sb = getSupabaseClient();

    void sb.auth.getSession().then(({ data }) => {
      setSession(authSessionFromSupabaseUser(data.session?.user ?? null));
      setAuthReady(true);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, nextSession) => {
      setSession(authSessionFromSupabaseUser(nextSession?.user ?? null));
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    if (supabaseMode) {
      const sb = getSupabaseClient();
      const email = username.trim();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return false;
      return true;
    }
    const s = tryLogin(username, password);
    if (!s) return false;
    writeStoredSession(s);
    setSession(s);
    return true;
  }, []);

  const logout = useCallback(async () => {
    if (supabaseMode) {
      await getSupabaseClient().auth.signOut();
      return;
    }
    writeStoredSession(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      authReady,
      login,
      logout,
      role: session?.role ?? null,
      isAdmin: session?.role === "admin",
      canManageLeague: session ? canManageLeague(session.role) : false,
      canAccessConfig: session ? canAccessConfig(session.role) : false,
      canAssignElevatedRoles: session ? canAssignElevatedRoles(session.role) : false,
    }),
    [session, authReady, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
