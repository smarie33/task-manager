"use client";

import React from "react";
import { v4 as uuidv4 } from "uuid";

export type Role = "Admin" | "Editor" | "Viewer";
export type UserStatus = "pending" | "active";

export type AdminUser = {
  id: string;
  name: string;
  password: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
};

export const USERS_STORAGE_KEY = "admin:users";

const loadUsers = (): AdminUser[] => {
  const raw = localStorage.getItem(USERS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AdminUser[]) : [];
  } catch {
    return [];
  }
};

const saveUsers = (users: AdminUser[]) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export function useAdminUsers() {
  const [users, setUsers] = React.useState<AdminUser[]>(
    () => (typeof window !== "undefined" ? loadUsers() : [])
  );

  const persist = (next: AdminUser[]) => {
    setUsers(next);
    saveUsers(next);
  };

  const addUser = (name: string, password: string, role: Role) => {
    const newUser: AdminUser = {
      id: uuidv4(),
      name: name.trim(),
      password,
      role,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    persist([newUser, ...users]);
  };

  const approveUser = (id: string) => {
    persist(users.map((u) => (u.id === id ? { ...u, status: "active" } : u)));
  };

  const changeRole = (id: string, role: Role) => {
    persist(users.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  const deleteUser = (id: string) => {
    persist(users.filter((u) => u.id !== id));
  };

  return { users, addUser, approveUser, changeRole, deleteUser };
}