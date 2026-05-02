import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

type Role = "Admin" | "Editor" | "Viewer"

type StatusOption = {
  name: string
  color: string
}

type FileMeta = {
  id: string
  name: string
  url: string
  mimeType?: string
  size?: number
  createdAt?: string
  sourceTaskId?: string
  sourceTaskContent?: string
  sourceTasks?: { id: string; content?: string }[]
  userId?: string
}

type LinkMeta = {
  id: string
  url: string
  label?: string
  userId?: string
}

type Task = {
  id: string
  content: string
  owner: string
  status: string
  timeline: string
  timeTracking: number
  tags: string[]
  hasFiles: boolean
  timeLogs: { durationSeconds: number; date: string; adminEdit?: boolean }[]
  comments: { id: string; text: string; createdAt: string; author?: string }[]
  files: FileMeta[]
  notes: string
  position?: number
  userId?: string
}

type TaskGroupData = {
  id: string
  name: string
  color: string
  tasks: Task[]
  position?: number
  userId?: string
}

type LoadedData = {
  groups: TaskGroupData[]
  statuses: StatusOption[]
  files: FileMeta[]
  images: FileMeta[]
  links: LinkMeta[]
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const toTask = (row: any): Task => ({
  id: row.id,
  content: row.content ?? "",
  owner: row.owner ?? "",
  status: row.status ?? "To Do",
  timeline: row.timeline ?? "",
  timeTracking: Number(row.time_tracking ?? 0),
  tags: Array.isArray(row.tags) ? row.tags : [],
  hasFiles: !!row.has_files,
  timeLogs: [],
  comments: [],
  files: [],
  notes: row.notes ?? "",
  position: typeof row.position === "number" ? row.position : undefined,
  userId: row.user_id ?? undefined,
})

const buildSharedTaskData = async (
  supabase: ReturnType<typeof createClient>,
  callerId: string,
  callerRole: Role,
): Promise<LoadedData> => {
  const ownTimeOnly = callerRole !== "Admin"

  const { data: groupRows, error: groupError } = await supabase
    .from("task_groups")
    .select("*")
    .eq("archived", false)
    .order("position", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
  if (groupError) throw groupError

  const groupsMap = new Map<string, TaskGroupData>()
  for (const g of groupRows || []) {
    groupsMap.set(g.id, {
      id: g.id,
      name: g.name,
      color: g.color,
      tasks: [],
      position: typeof g.position === "number" ? g.position : undefined,
      userId: g.user_id ?? undefined,
    })
  }

  const groupIds = (groupRows || []).map((g) => g.id)
  const tasksMap = new Map<string, Task>()

  if (groupIds.length > 0) {
    const { data: taskRows, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .in("group_id", groupIds)
      .order("group_id", { ascending: true })
      .order("position", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true })
    if (taskError) throw taskError

    for (const tr of taskRows || []) {
      const task = toTask(tr)
      tasksMap.set(task.id, task)
      const group = groupsMap.get(tr.group_id)
      if (group) group.tasks.push(task)
    }
  }

  for (const group of groupsMap.values()) {
    group.tasks.sort((a, b) => {
      const ap = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER
      const bp = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER
      if (ap !== bp) return ap - bp
      return 0
    })
  }

  const taskIds = Array.from(tasksMap.keys())

  if (taskIds.length > 0) {
    let logsQuery = supabase
      .from("task_time_logs")
      .select("*")
      .in("task_id", taskIds)
      .order("created_at", { ascending: true })

    if (ownTimeOnly) {
      logsQuery = logsQuery.eq("user_id", callerId)
    }

    const { data: logRows, error: logError } = await logsQuery
    if (logError) throw logError

    for (const lr of logRows || []) {
      const task = tasksMap.get(lr.task_id)
      if (!task) continue
      task.timeLogs.push({
        durationSeconds: lr.duration_seconds,
        date: lr.date,
        adminEdit: !!lr.admin_edit,
      })
    }

    if (ownTimeOnly) {
      for (const task of tasksMap.values()) {
        const totalSeconds = task.timeLogs.reduce((sum, log) => sum + log.durationSeconds, 0)
        task.timeTracking = totalSeconds / 3600
      }
    }

    const { data: commentRows, error: commentError } = await supabase
      .from("task_comments")
      .select("*")
      .in("task_id", taskIds)
      .order("created_at", { ascending: true })
    if (commentError) throw commentError

    for (const cr of commentRows || []) {
      const task = tasksMap.get(cr.task_id)
      if (!task) continue
      task.comments.push({
        id: cr.id,
        text: cr.text,
        createdAt: cr.created_at,
        author: cr.author ?? undefined,
      })
    }
  }

  const { data: fileRows, error: fileError } = await supabase
    .from("files")
    .select("id, user_id, name, url, mime_type, size, created_at, source_task_id, source_task_content")
    .order("created_at", { ascending: false })
    .limit(200)
  if (fileError) throw fileError

  const { data: fileTaskRows, error: fileTaskError } = await supabase
    .from("file_task_links")
    .select("file_id, task_id")
    .order("created_at", { ascending: true })
  if (fileTaskError) throw fileTaskError

  const fileIdToTaskIds = new Map<string, string[]>()
  for (const row of fileTaskRows || []) {
    const fileId = row.file_id as string
    const taskId = row.task_id as string
    if (!fileId || !taskId) continue
    const arr = fileIdToTaskIds.get(fileId) ?? []
    if (!arr.includes(taskId)) arr.push(taskId)
    fileIdToTaskIds.set(fileId, arr)
  }

  const files: FileMeta[] = []
  const images: FileMeta[] = []

  for (const fr of fileRows || []) {
    const legacyTaskId = fr.source_task_id ?? undefined
    const legacyTaskContent = fr.source_task_content ?? undefined
    const linkedTaskIds = fileIdToTaskIds.get(fr.id) ?? []
    const allTaskIds = Array.from(new Set([...(legacyTaskId ? [legacyTaskId] : []), ...linkedTaskIds]))

    const sourceTasks = allTaskIds.map((taskId) => ({
      id: taskId,
      content: tasksMap.get(taskId)?.content ?? (taskId === legacyTaskId ? legacyTaskContent : undefined),
    }))

    const fileMeta: FileMeta = {
      id: fr.id,
      name: fr.name,
      url: fr.url,
      mimeType: fr.mime_type ?? undefined,
      size: typeof fr.size === "number" ? fr.size : fr.size ? Number(fr.size) : undefined,
      createdAt: fr.created_at ?? undefined,
      sourceTaskId: sourceTasks[0]?.id,
      sourceTaskContent: sourceTasks[0]?.content,
      sourceTasks: sourceTasks.length > 0 ? sourceTasks : undefined,
      userId: fr.user_id ?? undefined,
    }

    if ((fileMeta.mimeType ?? "").startsWith("image/")) images.push(fileMeta)
    else files.push(fileMeta)
  }

  const { data: linkRows, error: linkError } = await supabase
    .from("external_links")
    .select("*")
    .order("created_at", { ascending: true })
  if (linkError) throw linkError

  const { data: statusRows, error: statusError } = await supabase
    .from("statuses")
    .select("*")
    .order("created_at", { ascending: true })
  if (statusError) throw statusError

  const groups = Array.from(groupsMap.values()).sort((a, b) => {
    const ap = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER
    const bp = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER
    if (ap !== bp) return ap - bp
    return a.name.localeCompare(b.name)
  })

  return {
    groups,
    statuses: (statusRows || []).map((s) => ({ name: s.name, color: s.color })),
    files,
    images,
    links: (linkRows || []).map((l) => ({
      id: l.id,
      url: l.url,
      label: l.label ?? undefined,
      userId: l.user_id ?? undefined,
    })),
  }
}

const buildArchivedGroups = async (
  supabase: ReturnType<typeof createClient>,
): Promise<{ groups: TaskGroupData[] }> => {
  const { data: groupRows, error: groupError } = await supabase
    .from("task_groups")
    .select("*")
    .eq("archived", true)
    .order("position", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
  if (groupError) throw groupError

  const groupsMap = new Map<string, TaskGroupData>()
  for (const g of groupRows || []) {
    groupsMap.set(g.id, {
      id: g.id,
      name: g.name,
      color: g.color,
      tasks: [],
      position: typeof g.position === "number" ? g.position : undefined,
      userId: g.user_id ?? undefined,
    })
  }

  const groupIds = (groupRows || []).map((g) => g.id)
  if (groupIds.length > 0) {
    const { data: taskRows, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .in("group_id", groupIds)
      .order("group_id", { ascending: true })
      .order("position", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true })
    if (taskError) throw taskError

    for (const tr of taskRows || []) {
      const group = groupsMap.get(tr.group_id)
      if (!group) continue
      group.tasks.push(toTask(tr))
    }
  }

  const groups = Array.from(groupsMap.values()).sort((a, b) => {
    const ap = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER
    const bp = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER
    if (ap !== bp) return ap - bp
    return a.name.localeCompare(b.name)
  })

  return { groups }
}

serve(async (req) => {
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

  const token = authHeader.replace("Bearer ", "")
  const url = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabase = createClient(url, serviceRoleKey)

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const callerId = userData.user.id
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", callerId)
    .single()

  if (profileError || !profile || profile.status !== "active") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const role = profile.role as Role
  if (!["Admin", "Editor", "Viewer"].includes(role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const body = await req.json().catch(() => ({ action: "load" })) as { action?: string }
  const action = body.action ?? "load"

  try {
    if (action === "load") {
      const data = await buildSharedTaskData(supabase, callerId, role)
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "loadArchived") {
      const data = await buildArchivedGroups(supabase)
      return new Response(JSON.stringify(data), {
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
