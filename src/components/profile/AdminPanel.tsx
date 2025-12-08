"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import UsersTable from "@/components/profile/UsersTable";
import { useAdminUsers, type Role } from "@/hooks/useAdminUsers";

const AdminPanel: React.FC = () => {
  const { toast } = useToast();
  const { users, addUser, approveUser, changeRole, deleteUser } = useAdminUsers();

  const [newUserName, setNewUserName] = React.useState("");
  const [newUserPassword, setNewUserPassword] = React.useState("");
  const [newUserRole, setNewUserRole] = React.useState<Role>("Viewer");

  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserPassword.trim()) {
      toast({ title: "Missing info", description: "Please enter a name and password." });
      return;
    }
    addUser(newUserName, newUserPassword, newUserRole);
    setNewUserName("");
    setNewUserPassword("");
    setNewUserRole("Viewer");
    toast({ title: "User created", description: "User added as pending. Approve to activate." });
  };

  const handleApprove = (id: string) => {
    approveUser(id);
    toast({ title: "User approved", description: "The user can now access the app." });
  };

  const handleChangeRole = (id: string, role: Role) => {
    changeRole(id, role);
    toast({ title: "Role updated", description: `Role changed to ${role}.` });
  };

  const handleDelete = (id: string) => {
    deleteUser(id);
    toast({ title: "User deleted", description: "The user was removed." });
  };

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="newUserName">Name</Label>
            <Input
              id="newUserName"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="New user's name"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="newUserPassword">Password</Label>
            <Input
              id="newUserPassword"
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Temporary password"
            />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as Role)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Editor">Editor</SelectItem>
                <SelectItem value="Viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={handleAddUser}>
              Add Pending User
            </Button>
          </div>
        </div>

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