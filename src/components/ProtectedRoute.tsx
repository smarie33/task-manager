"use client";

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/context/session-context";
import PendingApproval from "@/pages/PendingApproval";
import { useUserProfile } from "@/context/user-profile-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading, error, retry } = useSession();
  const { profile, loading: profileLoading } = useUserProfile();
  const location = useLocation();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-6">
          <div className="space-y-2">
            <h1 className="text-lg font-semibold">Connection problem</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground">
              Your Supabase API gateway is returning timeouts (e.g. 522), so the app can't load your session.
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={retry}>Retry</Button>
            <Button variant="outline" onClick={() => window.location.assign("/login")}>Go to login</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (profile && profile.status !== "active") {
    return <PendingApproval />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;