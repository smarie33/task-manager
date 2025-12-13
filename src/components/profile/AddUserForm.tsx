"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import type { Role } from "@/hooks/useAdminUsers";

type AddUserFormProps = {
  onCreate: (name: string, email: string, password: string, role: Role) => void;
  defaultRole?: Role;
};

const AddUserForm: React.FC<AddUserFormProps> = ({ onCreate, defaultRole = "Viewer" }) => {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<Role>(defaultRole);

  const handleAdd = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast({ title: "Missing info", description: "Please enter a name, email, and password." });
      return;
    }
    onCreate(name.trim(), email.trim(), password, role);
    setName("");
    setEmail("");
    setPassword("");
    setRole(defaultRole);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1">
        <Label htmlFor="newUserName">Name</Label>
        <Input
          id="newUserName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New user's name"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="newUserEmail">Email</Label>
        <Input
          id="newUserEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="newUserPassword">Password</Label>
        <Input
          id="newUserPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Temporary password"
        />
      </div>
      <div className="space-y-1">
        <Label>Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
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
        <Button type="button" className="w-full" onClick={handleAdd}>
          Add Pending User
        </Button>
      </div>
    </div>
  );
};

export default AddUserForm;