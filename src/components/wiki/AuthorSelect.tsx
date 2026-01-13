"use client";

import React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useUserProfile } from "@/context/user-profile-context";

type AuthorSelectProps = {
  value: string;
  onChange: (val: string) => void;
};

const AuthorSelect: React.FC<AuthorSelectProps> = ({ value, onChange }) => {
  const { users } = useAdminUsers();
  const { profile } = useUserProfile();

  const options = React.useMemo(() => {
    const nonViewer = (users || []).filter((u) => u.role !== "Viewer" && u.status === "active");
    const list = nonViewer.map((u) => ({ id: u.id, name: u.name || u.email || "Unknown" }));
    const currentName = profile?.name || profile?.email || "Unknown";
    const exists = list.find((o) => o.name === currentName);
    const combined = exists ? list : [{ id: profile?.id || "me", name: currentName }, ...list];
    const seen = new Set<string>();
    return combined.filter((o) => {
      if (seen.has(o.name)) return false;
      seen.add(o.name);
      return true;
    });
  }, [users, profile?.name, profile?.email, profile?.id]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id="author">
        <SelectValue placeholder="Select author" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.name}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default AuthorSelect;