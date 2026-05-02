"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AdminPanel from "@/components/profile/AdminPanel";
import ProfileFormCard from "@/components/profile/ProfileFormCard";
import PasswordUpdateCard from "@/components/profile/PasswordUpdateCard";
import { useAuth } from "@/context/auth-context";
import AppHeader from "@/components/AppHeader";

const Profile: React.FC = () => {
  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader />
      <div className="container mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-4">
          <Button asChild variant="secondary">
            <Link to="/">Back to Tasks</Link>
          </Button>
        </div>

        {role !== "Viewer" ? <AdminPanel /> : null}

        <ProfileFormCard />
        <PasswordUpdateCard />
      </div>
    </div>
  );
};

export default Profile;