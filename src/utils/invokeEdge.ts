"use client";

import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://pvrqcuinoerspbdflxiw.supabase.co/functions/v1";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cnFjdWlub2Vyc3BiZGZseGl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NTA2MzA3OSwiZXhwIjoyMDgwNjM5MDc5fQ.2Nf3nXm1KpXEUVmH4XfWT7N90-CTGTZPtbqfSh0ZcBw";

export async function invokeEdge<T = any>(
  name: string,
  body: Record<string, any>
): Promise<{ data: T | null; error: any | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? null;

  const url = `${BASE_URL}/${name}`;
  const { data, error } = await supabase.functions.invoke<T>(url, {
    body,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
  });

  return { data: (data as T) ?? null, error: error ?? null };
}