"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdge } from "@/utils/invokeEdge";

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

export function useAdminUsers() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await invokeEdge<{ users: AdminUser[] }>("admin-users", { action: "list" });
    if (error) {
      setUsers([]);
      setLoading(false);
      throw new Error(error.message ?? "Edge function request failed (list). Are you signed in and approved?");
    }
    setUsers((data as any)?.users ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load().catch(() => {});
  }, [load]);

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