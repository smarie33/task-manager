import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

serve(async (req) => {
  const requestedHeaders = req.headers.get("Access-Control-Request-Headers") || "authorization, x-client-info, apikey, content-type"
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": requestedHeaders,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const url = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const authSupabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })
  const supabase = createClient(url, serviceRoleKey)

  const { data: userData, error: userErr } = await authSupabase.auth.getUser()
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  const callerId = userData.user.id

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", callerId)
    .single()
  if (profErr || !profile || (profile.role !== "Admin" && profile.role !== "Editor") || profile.status !== "active") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const body = await req.json().catch(() => null) as {
    action?: string;
    payload?: {
      userId?: string;
      taskId?: string;
      date?: string;
      durationSeconds?: number;
      logId?: string;
    };
  } | null

  if (!body?.action) {
    return new Response(JSON.stringify({ error: "Missing action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    if (body.action === "insert") {
      const p = body.payload
      if (!p?.userId || !p?.taskId || !p?.date || typeof p.durationSeconds !== "number") {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { data, error } = await supabase
        .from("task_time_logs")
        .insert([{
          user_id: p.userId,
          task_id: p.taskId,
          date: p.date,
          duration_seconds: p.durationSeconds,
          created_by_user_id: callerId,
          admin_edit: true,
        }])
        .select("id, task_id, date, duration_seconds, admin_edit")
        .single()
      if (error) throw error

      return new Response(JSON.stringify({ log: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (body.action === "delete") {
      if (profile.role !== "Admin") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const logId = body.payload?.logId
      if (!logId) {
        return new Response(JSON.stringify({ error: "Missing logId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { error } = await supabase.from("task_time_logs").delete().eq("id", logId)
      if (error) throw error

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
