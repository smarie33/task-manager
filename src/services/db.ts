"use client";

import { supabase } from "@/integrations/supabase/client";
import { Task, TaskGroupData, StatusOption, FileMeta, LinkMeta } from "@/types/task";

export type LoadedData = {
  groups: TaskGroupData[];
  statuses: StatusOption[];
  files: FileMeta[];
  images: FileMeta[];
  links: LinkMeta[];
};

const toTask = (row: any): Task => ({
  id: row.id,
  content: row.content ?? "",
  owner: row.owner ?? "",
  status: row.status ?? "To Do",
  timeline: row.timeline ?? "",
  timeTracking: Number(row.time_tracking ?? 0),
  tags: Array.isArray(row.tags) ? row.tags : [],
  hasFiles: !!row.has_files,
  timeLogs: [], // will be filled later
  comments: [], // will be filled later
  files: [], // used for task-specific images (metadata stored in files table)
  notes: row.notes ?? "",
  position: typeof row.position === "number" ? row.position : undefined,
});

export async function loadAll(userId: string): Promise<LoadedData> {
  // Load groups (only non-archived)
  const { data: groupRows, error: gErr } = await supabase
    .from("task_groups")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("created_at", { ascending: true });
  if (gErr) throw new Error(gErr.message);

  // Load tasks ordered by position then created_at
  const { data: taskRows, error: tErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("group_id", { ascending: true })
    .order("position", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });
  if (tErr) throw new Error(tErr.message);

  // Load time logs
  const { data: logRows, error: lErr } = await supabase
    .from("task_time_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (lErr) throw new Error(lErr.message);

  // Load comments
  const { data: commentRows, error: cErr } = await supabase
    .from("task_comments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (cErr) throw new Error(cErr.message);

  // Load files (images + non-images)
  const { data: fileRows, error: fErr } = await supabase
    .from("files")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (fErr) throw new Error(fErr.message);

  // Load external links
  const { data: linkRows, error: eErr } = await supabase
    .from("external_links")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (eErr) throw new Error(eErr.message);

  // Load statuses
  const { data: statusRows, error: sErr } = await supabase
    .from("statuses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (sErr) throw new Error(sErr.message);

  // Map groups
  const groupsMap = new Map<string, TaskGroupData>();
  for (const g of groupRows || []) {
    groupsMap.set(g.id, { id: g.id, name: g.name, color: g.color, tasks: [] });
  }

  // Map tasks into groups
  const tasksMap = new Map<string, Task>();
  for (const tr of taskRows || []) {
    const t = toTask(tr);
    tasksMap.set(t.id, t);
    const group = groupsMap.get(tr.group_id);
    if (group) {
      group.tasks.push(t);
    }
  }

  // Ensure tasks within each group are sorted by position if present
  for (const g of groupsMap.values()) {
    g.tasks.sort((a, b) => {
      const ap = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER;
      const bp = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER;
      if (ap !== bp) return ap - bp;
      return 0;
    });
  }

  // Attach logs (include admin flag)
  for (const lr of logRows || []) {
    const task = tasksMap.get(lr.task_id);
    if (!task) continue;
    const arr = task.timeLogs ?? [];
    arr.push({ durationSeconds: lr.duration_seconds, date: lr.date, adminEdit: !!lr.admin_edit });
    task.timeLogs = arr;
  }

  // Attach comments
  for (const cr of commentRows || []) {
    const task = tasksMap.get(cr.task_id);
    if (!task) continue;
    const arr = task.comments ?? [];
    arr.push({ id: cr.id, text: cr.text, createdAt: cr.created_at, author: cr.author ?? undefined });
    task.comments = arr;
  }

  // Files: split into images and non-images for libraries
  const files: FileMeta[] = [];
  const images: FileMeta[] = [];
  for (const fr of fileRows || []) {
    const fm: FileMeta = {
      id: fr.id,
      name: fr.name,
      url: fr.url,
      mimeType: fr.mime_type ?? undefined,
      size: typeof fr.size === "number" ? fr.size : fr.size ? Number(fr.size) : undefined,
      createdAt: fr.created_at,
      sourceTaskId: fr.source_task_id ?? undefined,
      sourceTaskContent: fr.source_task_content ?? undefined,
    };
    if ((fm.mimeType ?? "").startsWith("image/")) images.push(fm);
    else files.push(fm);
  }

  const groups = Array.from(groupsMap.values());

  const statuses: StatusOption[] = (statusRows || []).map((s) => ({
    name: s.name,
    color: s.color,
  }));

  const links: LinkMeta[] = (linkRows || []).map((l) => ({
    id: l.id,
    url: l.url,
    label: l.label ?? undefined,
  }));

  return { groups, statuses, files, images, links };
}

// Persist helpers

export async function createGroup(userId: string, name: string, color: string) {
  const { data, error } = await supabase
    .from("task_groups")
    .insert([{ user_id: userId, name, color }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// UPDATED: allow updating archived flag too
export async function updateGroup(groupId: string, fields: Partial<{ name: string; color: string; archived: boolean }>) {
  const payload: any = {};
  if (fields.name !== undefined) payload.name = fields.name;
  if (fields.color !== undefined) payload.color = fields.color;
  if (fields.archived !== undefined) payload.archived = fields.archived;
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase.from("task_groups").update(payload).eq("id", groupId);
  if (error) throw new Error(error.message);
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase.from("task_groups").delete().eq("id", groupId);
  if (error) throw new Error(error.message);
}

export async function createTask(userId: string, groupId: string, task: Omit<Task, "id">) {
  const { data, error } = await supabase
    .from("tasks")
    .insert([{
      user_id: userId,
      group_id: groupId,
      content: task.content,
      owner: task.owner,
      status: task.status,
      timeline: task.timeline,
      time_tracking: task.timeTracking,
      tags: task.tags,
      has_files: task.hasFiles,
      notes: task.notes ?? "",
      position: (task as any).position ?? null,
    }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTaskRow(taskId: string, fields: Partial<Task>) {
  const payload: any = {};
  if (fields.content !== undefined) payload.content = fields.content;
  if (fields.owner !== undefined) payload.owner = fields.owner;
  if (fields.status !== undefined) payload.status = fields.status;
  if (fields.timeline !== undefined) payload.timeline = fields.timeline;
  if (fields.timeTracking !== undefined) payload.time_tracking = fields.timeTracking;
  if (fields.tags !== undefined) payload.tags = fields.tags;
  if (fields.hasFiles !== undefined) payload.has_files = fields.hasFiles;
  if (fields.notes !== undefined) payload.notes = fields.notes;
  if ((fields as any).position !== undefined) payload.position = (fields as any).position;
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
  if (error) throw new Error(error.message);
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
}

export async function insertTimeLog(userId: string, taskId: string, date: string, durationSeconds: number) {
  const { error } = await supabase
    .from("task_time_logs")
    .insert([{ user_id: userId, task_id: taskId, date, duration_seconds: durationSeconds }]);
  if (error) throw new Error(error.message);
}

export async function replaceAllTimeLogs(userId: string, taskId: string, logs: { date: string; durationSeconds: number }[]) {
  // Simple implementation: delete then insert
  const { error: delErr } = await supabase.from("task_time_logs").delete().eq("task_id", taskId);
  if (delErr) throw new Error(delErr.message);
  if (logs.length === 0) return;
  const rows = logs.map((l) => ({
    user_id: userId, task_id: taskId, date: l.date, duration_seconds: l.durationSeconds
  }));
  const { error: insErr } = await supabase.from("task_time_logs").insert(rows);
  if (insErr) throw new Error(insErr.message);
}

export async function insertComment(userId: string, taskId: string, text: string, author?: string) {
  const { data, error } = await supabase
    .from("task_comments")
    .insert([{ user_id: userId, task_id: taskId, text, author }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addStatus(userId: string, status: StatusOption) {
  const { error } = await supabase
    .from("statuses")
    .insert([{ user_id: userId, name: status.name, color: status.color }]);
  if (error) throw new Error(error.message);
}

export async function updateStatus(userId: string, name: string, color: string) {
  const { error } = await supabase
    .from("statuses")
    .update({ color })
    .eq("user_id", userId)
    .eq("name", name);
  if (error) throw new Error(error.message);
}

export async function addFileMeta(userId: string, meta: FileMeta) {
  const { error } = await supabase.from("files").insert([{
    user_id: userId,
    name: meta.name,
    url: meta.url,
    mime_type: meta.mimeType ?? null,
    size: meta.size ?? null,
    source_task_id: meta.sourceTaskId ?? null,
    source_task_content: meta.sourceTaskContent ?? null,
  }]);
  if (error) throw new Error(error.message);
}

export async function addManyFiles(userId: string, metas: FileMeta[]) {
  if (metas.length === 0) return;
  const rows = metas.map((m) => ({
    user_id: userId,
    name: m.name,
    url: m.url,
    mime_type: m.mimeType ?? null,
    size: m.size ?? null,
    source_task_id: m.sourceTaskId ?? null,
    source_task_content: m.sourceTaskContent ?? null,
  }));
  const { error } = await supabase.from("files").insert(rows);
  if (error) throw new Error(error.message);
}

export async function addExternalLink(userId: string, link: LinkMeta) {
  const { error } = await supabase.from("external_links").insert([{
    user_id: userId,
    url: link.url,
    label: link.label ?? null,
  }]);
  if (error) throw new Error(error.message);
}

export async function updateTaskGroup(taskId: string, groupId: string) {
  const { error } = await supabase.from("tasks").update({ group_id: groupId }).eq("id", taskId);
  if (error) throw new Error(error.message);
}

// ADDED: bulk update task positions (and optional group moves)
export async function updateTaskPositions(updates: { id: string; position: number; group_id?: string }[]) {
  if (updates.length === 0) return;
  await Promise.all(
    updates.map((u) =>
      supabase
        .from("tasks")
        .update({ position: u.position, ...(u.group_id ? { group_id: u.group_id } : {}) })
        .eq("id", u.id)
    )
  ).then((results) => {
    const err = results.find((r: any) => r.error);
    if (err && (err as any).error) throw new Error((err as any).error.message);
  });
}

// ADDED: delete all tasks in a group (for destructive group deletion)
export async function deleteTasksByGroup(groupId: string) {
  const { error } = await supabase.from("tasks").delete().eq("group_id", groupId);
  if (error) throw new Error(error.message);
}

// ADDED: bulk create tasks in a group (used by CSV import)
export async function bulkCreateTasks(userId: string, groupId: string, tasks: Omit<Task, "id">[]) {
  if (tasks.length === 0) return [] as Task[];

  // Determine starting position at end of group
  const { count, error: countErr } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("group_id", groupId);
  if (countErr) throw new Error(countErr.message);
  const basePos = count ?? 0;

  const rows = tasks.map((t, idx) => ({
    user_id: userId,
    group_id: groupId,
    content: t.content,
    owner: t.owner,
    status: t.status,
    timeline: t.timeline,
    time_tracking: t.timeTracking,
    tags: t.tags,
    has_files: t.hasFiles,
    notes: t.notes ?? "",
    position: basePos + idx,
  }));

  const { data, error } = await supabase.from("tasks").insert(rows).select();
  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
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
  })) as Task[];
}