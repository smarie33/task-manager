"use client";

import React from "react";
import { invokeEdge } from "@/utils/invokeEdge";
import { useSession } from "@/context/session-context";
import { useUserProfile } from "@/context/user-profile-context";

export type Role = "Admin" | "Editor" | "Viewer";
export type UserStatus = "pending" | "active";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
};

const normalizeUsers = (users: Partial<AdminUser>[] | undefined): AdminUser[] => {
  return (users ?? []).map((user) => ({
    id: String(user.id ?? ""),
    name: String(user.name ?? ""),
    email: String(user.email ?? ""),
    role: (["Admin", "Editor", "Viewer"].includes(String(user.role)) ? user.role : "Viewer") as Role,
    status: (String(user.status).toLowerCase() === "active" ? "active" : "pending") as UserStatus,
    createdAt: String(user.createdAt ?? new Date().toISOString()),
  }));
};

export function useAdminUsers() {
  const { session, loading: sessionLoading } = useSession();
  const { profile, loading: profileLoading } = useUserProfile();
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);

  const canLoadUsers =
    !!session?.user?.id &&
    !!profile &&
    profile.status === "active" &&
    (profile.role === "Admin" || profile.role === "Editor");

  const load = React.useCallback(async () => {
    setLoading(true);

    const primary = await invokeEdge<{ users: AdminUser[] }>("admin-users", { action: "list" });
    if (!primary.error && primary.data) {
      setUsers(normalizeUsers((primary.data as any)?.users));
      setLoading(false);
      return;
    }

    const fallback = await invokeEdge<{ users: AdminUser[] }>("task-data", { action: "listAssignableUsers" });
    if (!fallback.error && fallback.data) {
      setUsers(normalizeUsers((fallback.data as any)?.users));
      setLoading(false);
      return;
    }

    setUsers([]);
    setLoading(false);
    throw new Error(
      fallback.error?.message ??
        primary.error?.message ??
        "Edge function request failed (list). Are you signed in and approved?"
    );
  }, []);

  React.useEffect(() => {
    if (sessionLoading || profileLoading) return;

    if (!session?.user?.id || !canLoadUsers) {
      setUsers([]);
      setLoading(false);
      return;
    }

    load().catch(() => {});
  }, [canLoadUsers, load, profileLoading, session?.user?.id, sessionLoading]);

  const addUser = async (name: string, email: string, password: string, role: Role) => {
    const { data, error } = await invokeEdge("admin-users", {
      action: "create",
      payload: { name, email, password, role },
    });
    if (error) {
      throw new Error(error.message ?? "Edge function request failed (create). If you see Forbidden, your account might not be Admin or Editor and active.");
    }
    await load();
    return data;
  };

  const approveUser = async (id: string) => {
    const { error } = await invokeEdge("admin-users", {
      action: "approve",
      payload: { id },
    });
    if (error) throw new Error(error.message ?? "Edge function request failed (approve).");
    await load();
  };

  const changeRole = async (id: string, role: Role) => {
    const { error } = await invokeEdge("admin-users", {
      action: "changeRole",
      payload: { id, role },
    });
    if (error) throw new Error(error.message ?? "Edge function request failed (changeRole).");
    await load();
  };

  const deleteUser = async (id: string) => {
    const { error } = await invokeEdge("admin-users", {
      action: "delete",
      payload: { id },
    });
    if (error) throw new Error(error.message ?? "Edge function request failed (delete).");
    await load();
  };

  return { users, loading, addUser, approveUser, changeRole, deleteUser };
}