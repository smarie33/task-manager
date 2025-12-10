"use client";

import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { loadProfile } from "@/utils/profile-storage";

const initialsFromName = (name?: string) => {
  if (!name) return "ME";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "ME";
};

const AppHeader: React.FC = () => {
  const stored = typeof window !== "undefined" ? loadProfile() : null;

  return (
    <div className="w-full flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild>
              <Link to="/">Task Manager</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/time-tracking">Time Tracking</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/files">Files</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/images">Images</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/tags">Tags</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          {stored?.avatarDataUrl ? (
            <AvatarImage src={stored.avatarDataUrl} alt={stored?.name || "Profile photo"} />
          ) : (
            <AvatarFallback className="text-xs">{initialsFromName(stored?.name)}</AvatarFallback>
          )}
        </Avatar>
        <Button asChild variant="secondary">
          <Link to="/profile">Profile</Link>
        </Button>
      </div>
    </div>
  );
};

export default AppHeader;