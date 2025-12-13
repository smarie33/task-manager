"use client";

import { supabase } from "@/integrations/supabase/client";

export async function invokeEdge<T = any>(
  name: string,
  body: Record<string, any>
): Promise<{ data: T | null; error: any | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? null;

  const first = await supabase.functions.invoke<T>(name, {
    body,
    headers: token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" },
  });

  if (!first.error) {
    return { data: (first.data as T) ?? null, error: null };
  }

  const msg = String(first.error?.message || "").toLowerCase();
  const shouldFallback =
    msg.includes("failed to send a request") ||
    msg.includes("request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("network");

  if (!shouldFallback) {
    return { data: null, error: first.error };
  }

  const BASE_URL = "https://pvrqcuinoerspbdflxiw.supabase.co/functions/v1";
  const ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cnFjdWlub2Vyc3BiZGZseGl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNjMwNzksImV4cCI6MjA4MDYzOTA3OX0.2Nf3nXm1KpXEUVmH4XfWT7N90-CTGTZPtbqfSh0ZcBw";

  try {
    const response = await fetch(`${BASE_URL}/${name}`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get("Content-Type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        (isJson && payload && (payload.error || payload.message)) ||
        `HTTP ${response.status}`;
      return { data: null, error: { message } };
    }

    return { data: (payload as T) ?? null, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e?.message || "Network error" } };
  }
}