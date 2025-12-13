"use client";

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/context/session-context";
import PendingApproval from "@/pages/PendingApproval";
import { useUserProfile } from "@/context/user-profile-context";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useSession();
  const { profile, loading: profileLoading } = useUserProfile();
  const location = useLocation();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading...
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