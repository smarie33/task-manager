"use client";

import { supabase } from "@/integrations/supabase/client";

export async function invokeEdge<T = any>(
  name: string,
  body: Record<string, any>
): Promise<{ data: T | null; error: any | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? null;

  // Include Authorization (JWT) and apikey (anon key) to satisfy CORS and auth checks
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      apikey: (supabase as any).supabaseKey ?? "",
      "Content-Type": "application/json",
    },
  });

  return { data: (data as T) ?? null, error: error ?? null };
}