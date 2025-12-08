"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AdminPanel from "@/components/profile/AdminPanel";
import ProfileFormCard from "@/components/profile/ProfileFormCard";

const Profile: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-4">
          <Button asChild variant="secondary">
            <Link to="/">Back to Tasks</Link>
          </Button>
        </div>

        <AdminPanel />

        <ProfileFormCard />
      </div>
    </div>
  );
};

export default Profile;