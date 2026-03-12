"use client";

import React from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type SessionState = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

const SessionContext = React.createContext<SessionState | undefined>(undefined);

const SESSION_BOOT_TIMEOUT_MS = 8000;

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const retry = React.useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  React.useEffect(() => {
    let mounted = true;

    async function boot() {
      setLoading(true);
      setError(null);

      try {
        const { data } = (await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error("timeout")), SESSION_BOOT_TIMEOUT_MS);
          }),
        ])) as Awaited<ReturnType<typeof supabase.auth.getSession>>;

        if (!mounted) return;
        setSession(data.session ?? null);
      } catch {
        if (!mounted) return;
        setSession(null);
        setError("Can't reach Supabase right now (request timed out).");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [reloadKey]);

  const value = React.useMemo(
    () => ({ session, loading, error, retry }),
    [session, loading, error, retry]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
};