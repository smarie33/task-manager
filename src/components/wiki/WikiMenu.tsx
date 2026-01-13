"use client";

import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSession } from "@/context/session-context";

const WikiMenu: React.FC = () => {
  const { session } = useSession();
  const loggedIn = !!session;

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
          <Link to="/wiki#overview">Overview</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/wiki#getting-started">Getting Started</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/wiki#guides">Guides</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/wiki#faq">FAQ</Link>
        </DropdownMenuItem>
        {loggedIn && (
          <DropdownMenuItem asChild>
            <Link to="/wiki/admin">Admin</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WikiMenu;