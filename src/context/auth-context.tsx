"use client";

import React from "react";
import type { Role } from "@/hooks/useAdminUsers";

type AuthState = {
  role: Role;
  setRole: (r: Role) => void;
};

const AUTH_ROLE_KEY = "auth:role";

const AuthContext = React.createContext<AuthState | undefined>(undefined);

const loadRole = (): Role => {
  if (typeof window === "undefined") return "Admin";
  const raw = window.localStorage.getItem(AUTH_ROLE_KEY);
  if (raw === "Admin" || raw === "Editor" || raw === "Viewer") return raw;
  return "Admin";
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = React.useState<Role>(loadRole);

  const setRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTH_ROLE_KEY, r);
    }
  };

  const value = React.useMemo(() => ({ role, setRole }), [role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};