"use client";

import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/session-context";
import { useNavigate, useLocation } from "react-router-dom";

const Login: React.FC = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  React.useEffect(() => {
    if (!loading && session) {
      const target = location.state?.from || "/";
      navigate(target, { replace: true });
    }
  }, [session, loading, navigate, location.state]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Access your Task Manager</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{ theme: ThemeSupa }}
            theme="light"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;