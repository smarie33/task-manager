"use client";

import TaskManager from "@/components/TaskManager";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { SynchronizedScrollProvider } from "@/components/SynchronizedScrollProvider";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { loadProfile } from "@/utils/profile-storage";

const initialsFromName = (name?: string) => {
  if (!name) return "ME";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "ME";
};

const Index = () => {
  const stored = typeof window !== "undefined" ? loadProfile() : null;

  return (
    <div className="min-h-screen flex flex-col">
      <SynchronizedScrollProvider>
        <div className="w-full flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/time-tracking">Time Tracking</Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {stored?.avatarDataUrl ? (
                <AvatarImage src={stored.avatarDataUrl} alt={stored?.name || "Profile photo"} />
              ) : (
                <AvatarFallback className="text-xs">
                  {initialsFromName(stored?.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <Button asChild variant="secondary">
              <Link to="/profile">Profile</Link>
            </Button>
          </div>
        </div>
        <TaskManager />
      </SynchronizedScrollProvider>
      <MadeWithDyad />
    </div>
  );
};

export default Index;