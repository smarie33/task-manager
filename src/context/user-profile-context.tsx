"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/session-context";

export type Role = "Admin" | "Editor" | "Viewer";
export type UserStatus = "pending" | "active";

export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  role: Role;
  status: UserStatus;
  updated_at: string | null;
};

type Ctx = {
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  updateProfile: (fields: Partial<UserProfile>) => Promise<void>;
};

const UserProfileContext = React.createContext<Ctx | undefined>(undefined);

const normalizeRole = (raw: unknown): Role => {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "admin") return "Admin";
  if (v === "editor") return "Editor";
  return "Viewer";
};

const normalizeStatus = (raw: unknown): UserStatus => {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "active") return "active";
  return "pending";
};

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useSession();
  const userId = session?.user?.id ?? null;
  const userEmail = session?.user?.email ?? null;
  const userName = (session?.user?.user_metadata as { name?: string } | undefined)?.name ?? null;
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchProfile = React.useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .limit(1);

    if (error) {
      setProfile(null);
      setLoading(false);
      throw new Error(error.message);
    }
    const row = (data && Array.isArray(data) ? data[0] : null) as UserProfile | null;

    if (!row) {
      const initial = {
        id: userId,
        name: userName,
        email: userEmail,
        phone: null,
        address: null,
        avatar_url: null,
        role: "Viewer" as Role,
        status: "pending" as UserStatus,
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error: insErr } = await supabase
        .from("profiles")
        .upsert(initial, { onConflict: "id" })
        .select()
        .single();
      if (!insErr && inserted) {
        setProfile({
          ...(inserted as UserProfile),
          role: normalizeRole((inserted as any).role),
          status: normalizeStatus((inserted as any).status),
        });
        setLoading(false);
        return;
      }
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile({
      ...row,
      role: normalizeRole((row as any).role),
      status: normalizeStatus((row as any).status),
    });
    setLoading(false);
  }, [userEmail, userId, userName]);

  React.useEffect(() => {
    fetchProfile().catch(() => {});
  }, [fetchProfile]);

  const updateProfile = async (fields: Partial<UserProfile>) => {
    if (!userId) return;
    const payload: Record<string, any> = {
      id: userId,
      ...fields,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });
    if (error) throw new Error(error.message);
    await fetchProfile();
  };

  const value: Ctx = React.useMemo(
    () => ({ profile, loading, refresh: fetchProfile, updateProfile }),
    [profile, loading, fetchProfile]
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
};

export const useUserProfile = () => {
  const ctx = React.useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfile must be used within UserProfileProvider");
  return ctx;
};