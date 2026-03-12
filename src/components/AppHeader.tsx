"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { useUserProfile } from "@/context/user-profile-context";
import { supabase } from "@/integrations/supabase/client";

const initialsFromName = (name?: string) => {
  if (!name) return "ME";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "ME";
};

const AppHeader: React.FC = () => {
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const canManageDrafts = !!profile && profile.role !== "Viewer";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="w-full flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
            >
              Menu
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Task Manager</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem asChild>
                  <Link to="/">Tasks</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/time-tracking">Time Tracking</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/archived-groups">Archived Groups</Link>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to="/files">Files</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/images">Images</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/tags">Tags</Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Wiki</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem asChild>
                  <Link to="/wiki">Wiki</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/wiki#guides">Guides</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href="https://github.com/MosleyGraphics/bonum-maleficus"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Github
                  </a>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Admin</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem asChild disabled={!canManageDrafts}>
                  <Link to="/wiki/admin/drafts">Drafts</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild disabled={!canManageDrafts}>
                  <Link to="/wiki/admin/importing">Importing</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild disabled={!canManageDrafts}>
                  <Link to="/wiki/admin/bulk-delete">Bulk Delete</Link>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to="/profile">Profile</Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={profile?.name || "Profile photo"} />
          ) : (
            <AvatarFallback className="text-xs">{initialsFromName(profile?.name ?? undefined)}</AvatarFallback>
          )}
        </Avatar>
      </div>
    </div>
  );
};

export default AppHeader;