"use client";

import { supabase } from "@/integrations/supabase/client";

export async function invokeEdge<T = any>(
  name: string,
  body: Record<string, any>
): Promise<{ data: T | null; error: any | null }> {
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body,
  });
  return { data: (data as T) ?? null, error: error ?? null };
}