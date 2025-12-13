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

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useSession();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchProfile = React.useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .limit(1);
    if (error) {
      setProfile(null);
      setLoading(false);
      throw new Error(error.message);
    }
    const row = (data && Array.isArray(data) ? data[0] : null) as UserProfile | null;
    setProfile(row);
    setLoading(false);
  }, [session?.user]);

  React.useEffect(() => {
    fetchProfile().catch(() => {});
  }, [fetchProfile]);

  const updateProfile = async (fields: Partial<UserProfile>) => {
    if (!session?.user) return;
    const payload: Record<string, any> = { ...fields, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("profiles").update(payload).eq("id", session.user.id);
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