"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const PendingApproval: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center space-y-4">
        <h1 className="text-2xl font-semibold">Awaiting Approval</h1>
        <p className="text-sm text-muted-foreground">
          Your account is pending approval by an administrator. You’ll gain access once approved.
        </p>
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;