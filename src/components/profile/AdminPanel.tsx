"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import UsersTable from "@/components/profile/UsersTable";
import AddUserForm from "@/components/profile/AddUserForm";
import { useAdminUsers, type Role } from "@/hooks/useAdminUsers";

const AdminPanel: React.FC = () => {
  const { toast } = useToast();
  const { users, addUser, approveUser, changeRole, deleteUser } = useAdminUsers();

  const pending = users.filter((u) => u.status === "pending");
  const active = users.filter((u) => u.status === "active");

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Admin Panel</CardTitle>
        <CardDescription>Approve new users, set roles, and manage accounts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add user (creates a pending user) */}
        <AddUserForm
          onCreate={(name, password, role) => {
            addUser(name, password, role);
            toast({ title: "User created", description: "User added as pending. Approve to activate." });
          }}
          defaultRole="Viewer"
        />

        {/* Pending users */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Pending Users</h3>
          <UsersTable
            users={pending}
            onChangeRole={handleChangeRole}
            onDelete={handleDelete}
            onApprove={handleApprove}
            showApprove
            emptyText="No pending users."
            actionsColWidthClass="w-40"
          />
        </div>

        {/* Active users */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Active Users</h3>
          <UsersTable
            users={active}
            onChangeRole={handleChangeRole}
            onDelete={handleDelete}
            showApprove={false}
            emptyText="No active users yet."
            actionsColWidthClass="w-32"
          />
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Users are stored locally in your browser for this demo. For real auth, connect a backend.
      </CardFooter>
    </Card>
  );
};

export default AdminPanel;