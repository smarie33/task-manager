"use client";

import React from "react";
import type { Role } from "@/context/user-profile-context";
import { useUserProfile } from "@/context/user-profile-context";

type AuthState = {
  role: Role;
  setRole: (r: Role) => void;
};

const AuthContext = React.createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useUserProfile();
  const role: Role = profile?.role ?? "Viewer";

  // No-op setter for compatibility
  const setRole = (_r: Role) => {};

  const value = React.useMemo(() => ({ role, setRole }), [role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};