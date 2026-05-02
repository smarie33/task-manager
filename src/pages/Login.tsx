"use client";

import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/session-context";
import { useNavigate, useLocation } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LOGIN_TIMEOUT_MS = 12000;

const Login: React.FC = () => {
  const { session, loading, error } = useSession();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && session) {
      const target = location.state?.from || "/";
      navigate(target, { replace: true });
    }
  }, [session, loading, navigate, location.state]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setLoginError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    setLoginError(null);

    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("timeout")), LOGIN_TIMEOUT_MS);
        }),
      ]);

      const { error: signInError } = result as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
      if (signInError) {
        throw signInError;
      }
    } catch (err) {
      const message = String((err as { message?: string })?.message ?? "");
      if (message === "timeout" || /failed to fetch/i.test(message)) {
        setLoginError("Login timed out while contacting Supabase. Please try again.");
      } else if (message) {
        setLoginError(message);
      } else {
        setLoginError("Login failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Access your Task Manager</p>
        </div>

        {error && (
          <Alert>
            <AlertTitle>Supabase unreachable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loginError && (
          <Alert variant="destructive">
            <AlertTitle>Login failed</AlertTitle>
            <AlertDescription>{loginError}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                disabled={submitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
