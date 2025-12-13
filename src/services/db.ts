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
});

export async function loadAll(userId: string): Promise<LoadedData> {
  // Load groups
  const { data: groupRows, error: gErr } = await supabase
    .from("task_groups")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (gErr) throw gErr;

  // Load tasks
  const { data: taskRows, error: tErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (tErr) throw tErr;

  // Load time logs
  const { data: logRows, error: lErr } = await supabase
    .from("task_time_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (lErr) throw lErr;

  // Load comments
  const { data: commentRows, error: cErr } = await supabase
    .from("task_comments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (cErr) throw cErr;

  // Load files (images + non-images)
  const { data: fileRows, error: fErr } = await supabase
    .from("files")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (fErr) throw fErr;

  // Load external links
  const { data: linkRows, error: eErr } = await supabase
    .from("external_links")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (eErr) throw eErr;

  // Load statuses
  const { data: statusRows, error: sErr } = await supabase
    .from("statuses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (sErr) throw sErr;

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
  if (error) throw error;
  return data;
}

export async function updateGroup(groupId: string, fields: Partial<{ name: string; color: string }>) {
  const { error } = await supabase.from("task_groups").update(fields).eq("id", groupId);
  if (error) throw error;
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase.from("task_groups").delete().eq("id", groupId);
  if (error) throw error;
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
    }])
    .select()
    .single();
  if (error) throw error;
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
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
  if (error) throw error;
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function insertTimeLog(userId: string, taskId: string, date: string, durationSeconds: number) {
  const { error } = await supabase
    .from("task_time_logs")
    .insert([{ user_id: userId, task_id: taskId, date, duration_seconds: durationSeconds }]);
  if (error) throw error;
}

export async function replaceAllTimeLogs(userId: string, taskId: string, logs: { date: string; durationSeconds: number }[]) {
  // Simple implementation: delete then insert
  const { error: delErr } = await supabase.from("task_time_logs").delete().eq("task_id", taskId);
  if (delErr) throw delErr;
  if (logs.length === 0) return;
  const rows = logs.map((l) => ({
    user_id: userId, task_id: taskId, date: l.date, duration_seconds: l.durationSeconds
  }));
  const { error: insErr } = await supabase.from("task_time_logs").insert(rows);
  if (insErr) throw insErr;
}

export async function insertComment(userId: string, taskId: string, text: string, author?: string) {
  const { data, error } = await supabase
    .from("task_comments")
    .insert([{ user_id: userId, task_id: taskId, text, author }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addStatus(userId: string, status: StatusOption) {
  const { error } = await supabase
    .from("statuses")
    .insert([{ user_id: userId, name: status.name, color: status.color }]);
  if (error) throw error;
}

export async function updateStatus(userId: string, name: string, color: string) {
  const { error } = await supabase
    .from("statuses")
    .update({ color })
    .eq("user_id", userId)
    .eq("name", name);
  if (error) throw error;
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
  if (error) throw error;
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
  if (error) throw error;
}

export async function addExternalLink(userId: string, link: LinkMeta) {
  const { error } = await supabase.from("external_links").insert([{
    user_id: userId,
    url: link.url,
    label: link.label ?? null,
  }]);
  if (error) throw error;
}