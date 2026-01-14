"use client";

import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSession } from "@/context/session-context";
import { useUserProfile } from "@/context/user-profile-context";

const WikiMenu: React.FC = () => {
  const { session } = useSession();
  const { profile } = useUserProfile();
  const loggedIn = !!session;
  const canManageDrafts = !!profile && profile.role !== "Viewer";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
          size="sm"
        >
          Wiki Menu
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
        {loggedIn && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/wiki/admin">Admin</Link>
            </DropdownMenuItem>
            {canManageDrafts && (
              <DropdownMenuItem asChild className="pl-6 text-muted-foreground">
                <Link to="/wiki/admin/drafts">↳ Drafts</Link>
              </DropdownMenuItem>
            )}
            {canManageDrafts && (
              <DropdownMenuItem asChild className="pl-6 text-muted-foreground">
                <Link to="/wiki/admin/importing">↳ Importing</Link>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WikiMenu;