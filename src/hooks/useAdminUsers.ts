"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";

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
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "list" },
    });
    if (error) {
      setUsers([]);
      setLoading(false);
      throw error;
    }
    setUsers((data as any)?.users ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const addUser = async (name: string, email: string, password: string, role: Role) => {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "create", payload: { name, email, password, role } },
    });
    if (error) throw error;
    await load();
    return data;
  };

  const approveUser = async (id: string) => {
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "approve", payload: { id } },
    });
    if (error) throw error;
    await load();
  };

  const changeRole = async (id: string, role: Role) => {
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "changeRole", payload: { id, role } },
    });
    if (error) throw error;
    await load();
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "delete", payload: { id } },
    });
    if (error) throw error;
    await load();
  };

  return { users, loading, addUser, approveUser, changeRole, deleteUser };
}