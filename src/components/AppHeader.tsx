"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

  const topButtonClassName =
    "bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white";

  return (
    <div className="w-full flex items-center justify-between p-4 border-b bg-background">
      <div className="flex flex-wrap items-center gap-2">
        {/* Task Manager */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={topButtonClassName}>
              Task Manager
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild>
              <Link to="/">Tasks</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/time-tracking">Time Tracking</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/archived-groups">Archived Groups</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Simple top-level links */}
        <Button asChild variant="outline" size="sm" className={topButtonClassName}>
          <Link to="/files">Files</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className={topButtonClassName}>
          <Link to="/images">Images</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className={topButtonClassName}>
          <Link to="/tags">Tags</Link>
        </Button>

        {/* Wiki */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={topButtonClassName}>
              Wiki
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
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
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Admin */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={topButtonClassName}>
              Admin
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild disabled={!canManageDrafts}>
              <Link to="/wiki/admin/drafts">Drafts</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild disabled={!canManageDrafts}>
              <Link to="/wiki/admin/importing">Importing</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild disabled={!canManageDrafts}>
              <Link to="/wiki/admin/bulk-delete">Bulk Delete</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={topButtonClassName}>
              Profile
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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