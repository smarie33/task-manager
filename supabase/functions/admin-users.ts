import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type Role = "Admin" | "Editor" | "Viewer"
type UserStatus = "pending" | "active"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
  const token = authHeader.replace("Bearer ", "")

  const url = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabase = createClient(url, serviceRoleKey)

  // Identify caller
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
  const callerId = userData.user.id

  // Admin check from profiles
  const { data: callerProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", callerId)
    .single()

  if (profileErr || !callerProfile || callerProfile.role !== "Admin" || callerProfile.status !== "active") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const { action, payload } = await req.json().catch(() => ({ action: null, payload: null }))

  if (!action) {
    return new Response(JSON.stringify({ error: "Missing action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // Utility to map auth users by id -> email, createdAt
  async function getAuthUsersMap() {
    const map = new Map<string, { email: string | null; createdAt: string }>()
    let page = 1
    const perPage = 1000
    // Single page fetch is typically enough for small apps
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (!error && data?.users) {
      for (const u of data.users) {
        map.set(u.id, { email: u.email ?? null, createdAt: u.created_at })
      }
    }
    return map
  }

  try {
    if (action === "list") {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id,name,role,status,updated_at")
        .order("updated_at", { ascending: false })
      if (error) throw error

      const authMap = await getAuthUsersMap()
      const users = (profiles ?? []).map((p) => ({
        id: p.id,
        name: p.name ?? "",
        email: authMap.get(p.id)?.email ?? "",
        role: p.role as Role,
        status: p.status as UserStatus,
        createdAt: authMap.get(p.id)?.createdAt ?? new Date().toISOString(),
      }))
      return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (action === "create") {
      const { email, password, name, role } = payload ?? {}
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      const { data: createRes, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      })
      if (createErr || !createRes?.user) {
        return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      const newUser = createRes.user

      // Ensure profile has desired name/role (trigger created default)
      await supabase
        .from("profiles")
        .update({
          name: name ?? null,
          role: (role as Role) ?? "Viewer",
        })
        .eq("id", newUser.id)

      return new Response(JSON.stringify({
        id: newUser.id,
        name: name ?? "",
        email: newUser.email ?? email,
        role: (role as Role) ?? "Viewer",
        status: "pending",
        createdAt: newUser.created_at,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (action === "approve") {
      const { id } = payload ?? {}
      if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      const { error } = await supabase.from("profiles").update({ status: "active" }).eq("id", id)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (action === "changeRole") {
      const { id, role } = payload ?? {}
      if (!id || !role) return new Response(JSON.stringify({ error: "Missing id or role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (action === "delete") {
      const { id } = payload ?? {}
      if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      const { error } = await supabase.auth.admin.deleteUser(id)
      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})