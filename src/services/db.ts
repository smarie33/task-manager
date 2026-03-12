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
  userId: row.user_id ?? undefined,
});

export async function loadAll(
  userId: string,
  opts?: {
    /** When true, do not apply user_id filtering (requires RLS policy granting admin read access). */
    adminReadAll?: boolean;
  }
): Promise<LoadedData> {
  const adminReadAll = !!opts?.adminReadAll;

  // Load groups (only non-archived)
  let groupQuery = supabase
    .from("task_groups")
    .select("*")
    .eq("archived", false)
    .order("position", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });
  if (!adminReadAll) groupQuery = groupQuery.eq("user_id", userId);
  const { data: groupRows, error: gErr } = await groupQuery;
  if (gErr) throw new Error(gErr.message);

  // Load tasks ordered by position then created_at
  let taskQuery = supabase
    .from("tasks")
    .select("*")
    .order("group_id", { ascending: true })
    .order("position", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });
  if (!adminReadAll) taskQuery = taskQuery.eq("user_id", userId);
  const { data: taskRows, error: tErr } = await taskQuery;
  if (tErr) throw new Error(tErr.message);

  // Load time logs
  let logQuery = supabase
    .from("task_time_logs")
    .select("*")
    .order("created_at", { ascending: true });
  if (!adminReadAll) logQuery = logQuery.eq("user_id", userId);
  const { data: logRows, error: lErr } = await logQuery;
  if (lErr) throw new Error(lErr.message);

  // Load comments
  let commentQuery = supabase
    .from("task_comments")
    .select("*")
    .order("created_at", { ascending: true });
  if (!adminReadAll) commentQuery = commentQuery.eq("user_id", userId);
  const { data: commentRows, error: cErr } = await commentQuery;
  if (cErr) throw new Error(cErr.message);

  // Load files (images + non-images)
  let fileQuery = supabase
    .from("files")
    .select("*")
    .order("created_at", { ascending: true });
  if (!adminReadAll) fileQuery = fileQuery.eq("user_id", userId);
  const { data: fileRows, error: fErr } = await fileQuery;
  if (fErr) throw new Error(fErr.message);

  // Load file-task links (for images belonging to multiple tasks)
  let fileTaskQuery = supabase
    .from("file_task_links")
    .select("file_id, task_id")
    .order("created_at", { ascending: true });
  if (!adminReadAll) fileTaskQuery = fileTaskQuery.eq("user_id", userId);
  const { data: fileTaskRows, error: ftErr } = await fileTaskQuery;
  if (ftErr) throw new Error(ftErr.message);

  // Load external links
  let linkQuery = supabase
    .from("external_links")
    .select("*")
    .order("created_at", { ascending: true });
  if (!adminReadAll) linkQuery = linkQuery.eq("user_id", userId);
  const { data: linkRows, error: eErr } = await linkQuery;
  if (eErr) throw new Error(eErr.message);

  // Load statuses
  let statusQuery = supabase
    .from("statuses")
    .select("*")
    .order("created_at", { ascending: true });
  if (!adminReadAll) statusQuery = statusQuery.eq("user_id", userId);
  const { data: statusRows, error: sErr } = await statusQuery;
  if (sErr) throw new Error(sErr.message);

  // Map groups
  const groupsMap = new Map<string, TaskGroupData>();
  for (const g of groupRows || []) {
    groupsMap.set(g.id, {
      id: g.id,
      name: g.name,
      color: g.color,
      tasks: [],
      position: typeof g.position === "number" ? g.position : undefined,
      userId: g.user_id ?? undefined,
    });
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

  const fileIdToTaskIds = new Map<string, string[]>();
  for (const r of fileTaskRows || []) {
    const fileId = (r as any).file_id as string;
    const taskId = (r as any).task_id as string;
    if (!fileId || !taskId) continue;
    const arr = fileIdToTaskIds.get(fileId) ?? [];
    if (!arr.includes(taskId)) arr.push(taskId);
    fileIdToTaskIds.set(fileId, arr);
  }

  // Files: split into images and non-images for libraries
  const files: FileMeta[] = [];
  const images: FileMeta[] = [];
  for (const fr of fileRows || []) {
    const legacyTaskId = fr.source_task_id ?? undefined;
    const legacyTaskContent = fr.source_task_content ?? undefined;

    const linkedTaskIds = fileIdToTaskIds.get(fr.id) ?? [];
    const allTaskIds = Array.from(new Set([...(legacyTaskId ? [legacyTaskId] : []), ...linkedTaskIds]));

    const sourceTasks = allTaskIds.map((tid) => ({
      id: tid,
      content: tasksMap.get(tid)?.content ?? (tid === legacyTaskId ? legacyTaskContent : undefined),
    }));

    const fm: FileMeta = {
      id: fr.id,
      name: fr.name,
      url: fr.url,
      mimeType: fr.mime_type ?? undefined,
      size: typeof fr.size === "number" ? fr.size : fr.size ? Number(fr.size) : undefined,
      createdAt: fr.created_at,
      sourceTaskId: sourceTasks[0]?.id,
      sourceTaskContent: sourceTasks[0]?.content,
      sourceTasks: sourceTasks.length > 0 ? sourceTasks : undefined,
      userId: fr.user_id ?? undefined,
    };

    if ((fm.mimeType ?? "").startsWith("image/")) images.push(fm);
    else files.push(fm);
  }

  const groups = Array.from(groupsMap.values()).sort((a, b) => {
    const ap = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER;
    const bp = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER;
    if (ap !== bp) return ap - bp;
    return a.name.localeCompare(b.name);
  });

  const statuses: StatusOption[] = (statusRows || []).map((s) => ({
    name: s.name,
    color: s.color,
  }));

  const links: LinkMeta[] = (linkRows || []).map((l) => ({
    id: l.id,
    url: l.url,
    label: l.label ?? undefined,
    userId: l.user_id ?? undefined,
  }));

  return { groups, statuses, files, images, links };
}

export async function loadArchivedGroups(
  userId: string,
  opts?: {
    /** When true, do not apply user_id filtering (requires RLS policy granting admin read access). */
    adminReadAll?: boolean;
  }
): Promise<TaskGroupData[]> {
  const adminReadAll = !!opts?.adminReadAll;

  // Load archived groups
  let groupQuery = supabase
    .from("task_groups")
    .select("*")
    .eq("archived", true)
    .order("position", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });
  if (!adminReadAll) groupQuery = groupQuery.eq("user_id", userId);
  const { data: groupRows, error: gErr } = await groupQuery;
  if (gErr) throw new Error(gErr.message);

  const groupsMap = new Map<string, TaskGroupData>();
  for (const g of groupRows || []) {
    groupsMap.set(g.id, {
      id: g.id,
      name: g.name,
      color: g.color,
      tasks: [],
      position: typeof g.position === "number" ? g.position : undefined,
      userId: g.user_id ?? undefined,
    });
  }

  const groupIds = (groupRows || []).map((g) => g.id);
  if (groupIds.length > 0) {
    let taskQuery = supabase
      .from("tasks")
      .select("*")
      .in("group_id", groupIds)
      .order("group_id", { ascending: true })
      .order("position", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });
    if (!adminReadAll) taskQuery = taskQuery.eq("user_id", userId);
    const { data: taskRows, error: tErr } = await taskQuery;
    if (tErr) throw new Error(tErr.message);

    for (const tr of taskRows || []) {
      const group = groupsMap.get(tr.group_id);
      if (!group) continue;
      group.tasks.push(toTask(tr));
    }
  }

  return Array.from(groupsMap.values()).sort((a, b) => {
    const ap = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER;
    const bp = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER;
    if (ap !== bp) return ap - bp;
    return a.name.localeCompare(b.name);
  });
}

// Persist helpers

export async function createGroup(userId: string, name: string, color: string) {
  const { data: currentGroups, error: currentGroupsError } = await supabase
    .from("task_groups")
    .select("position")
    .eq("user_id", userId);
  if (currentGroupsError) throw new Error(currentGroupsError.message);

  const nextPosition = (currentGroups || []).reduce((max, row: any) => {
    const value = typeof row.position === "number" ? row.position : -1;
    return Math.max(max, value);
  }, -1) + 1;

  const { data, error } = await supabase
    .from("task_groups")
    .insert([{ user_id: userId, name, color, position: nextPosition }])
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

export async function updateGroupPositions(updates: { id: string; position: number }[]) {
  if (updates.length === 0) return;
  await Promise.all(
    updates.map((u) =>
      supabase
        .from("task_groups")
        .update({ position: u.position })
        .eq("id", u.id)
    )
  ).then((results) => {
    const err = results.find((r: any) => r.error);
    if (err && (err as any).error) throw new Error((err as any).error.message);
  });
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase.from("task_groups").delete().eq("id", groupId);
  if (error) throw new Error(error.message);
}

export async function createTask(userId: string, groupId: string, task: Omit<Task, "id">) {
  const targetUserId = (task as any).userId ?? userId;
  const { data, error } = await supabase
    .from("tasks")
    .insert([{
      user_id: targetUserId,
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
  if ((fields as any).userId !== undefined) payload.user_id = (fields as any).userId;
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
  if (error) throw new Error(error.message);
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
}

export async function deleteTasksByIds(taskIds: string[]) {
  if (taskIds.length === 0) return;
  const { error } = await supabase.from("tasks").delete().in("id", taskIds);
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

// UPDATED: update color if it exists; otherwise create it (so admins/editors can change colors reliably)
export async function updateStatus(userId: string, name: string, color: string) {
  const { data, error } = await supabase
    .from("statuses")
    .update({ color })
    .eq("user_id", userId)
    .eq("name", name)
    .select("id");
  if (error) throw new Error(error.message);

  // If nothing was updated (status was only local), create it.
  if (!data || data.length === 0) {
    const { error: insErr } = await supabase
      .from("statuses")
      .insert([{ user_id: userId, name, color }]);
    if (insErr) throw new Error(insErr.message);
  }
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

export async function addManyFilesWithIds(userId: string, metas: FileMeta[]) {
  if (metas.length === 0) return;
  const rows = metas.map((m) => ({
    id: m.id,
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

export async function deleteFileMeta(id: string) {
  const { error } = await supabase.from("files").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateFileMeta(
  id: string,
  fields: {
    sourceTaskId?: string | null;
    sourceTaskContent?: string | null;
  }
) {
  const payload: any = {};
  if (fields.sourceTaskId !== undefined) payload.source_task_id = fields.sourceTaskId;
  if (fields.sourceTaskContent !== undefined) payload.source_task_content = fields.sourceTaskContent;
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from("files").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addFileTaskLink(userId: string, fileId: string, taskId: string) {
  const { error } = await supabase
    .from("file_task_links")
    .upsert([{ user_id: userId, file_id: fileId, task_id: taskId }], {
      onConflict: "file_id,task_id",
      ignoreDuplicates: true,
    });
  if (error) throw new Error(error.message);
}

export async function addExternalLink(userId: string, link: LinkMeta): Promise<LinkMeta> {
  const { data, error } = await supabase
    .from("external_links")
    .insert([
      {
        user_id: userId,
        url: link.url,
        label: link.label ?? null,
      },
    ])
    .select("id, user_id, url, label")
    .single();
  if (error) throw new Error(error.message);

  return {
    id: data.id,
    url: data.url,
    label: data.label ?? undefined,
    userId: data.user_id ?? undefined,
  };
}

export async function deleteExternalLink(id: string) {
  const { error } = await supabase.from("external_links").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateTaskGroup(taskId: string, groupId: string) {
  const { error } = await supabase.from("tasks").update({ group_id: groupId }).eq("id", taskId);
  if (error) throw new Error(error.message);
}

// ADDED: bulk update task positions (and optional group moves)
export async function updateTaskPositions(updates: { id: string; position: number; group_id?: string; user_id?: string }[]) {
  if (updates.length === 0) return;
  await Promise.all(
    updates.map((u) =>
      supabase
        .from("tasks")
        .update({
          position: u.position,
          ...(u.group_id ? { group_id: u.group_id } : {}),
          ...(u.user_id ? { user_id: u.user_id } : {}),
        })
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

// ADDED: reassign a single task to a different user and group (admin only)
export async function reassignTask(taskId: string, toUserId: string, toGroupId: string, position: number) {
  // Move task and update ownership
  const { error: taskErr } = await supabase
    .from("tasks")
    .update({ user_id: toUserId, group_id: toGroupId, position })
    .eq("id", taskId);
  if (taskErr) throw new Error(taskErr.message);

  // Update related rows' ownership for consistent visibility
  const { error: logErr } = await supabase.from("task_time_logs").update({ user_id: toUserId }).eq("task_id", taskId);
  if (logErr) throw new Error(logErr.message);

  const { error: commentErr } = await supabase.from("task_comments").update({ user_id: toUserId }).eq("task_id", taskId);
  if (commentErr) throw new Error(commentErr.message);

  const { error: fileErr } = await supabase.from("files").update({ user_id: toUserId }).eq("source_task_id", taskId);
  if (fileErr) throw new Error(fileErr.message);
}

// ADDED: reassign a whole group (and its tasks + related rows) to a different user (admin only)
export async function reassignGroup(groupId: string, toUserId: string) {
  const { error: groupErr } = await supabase.from("task_groups").update({ user_id: toUserId }).eq("id", groupId);
  if (groupErr) throw new Error(groupErr.message);

  const { data: taskIds, error: tErr } = await supabase.from("tasks").select("id").eq("group_id", groupId);
  if (tErr) throw new Error(tErr.message);
  const ids = (taskIds || []).map((r: any) => r.id as string);

  // Update tasks in group
  const { error: tasksErr } = await supabase.from("tasks").update({ user_id: toUserId }).eq("group_id", groupId);
  if (tasksErr) throw new Error(tasksErr.message);

  if (ids.length === 0) return;

  const { error: logsErr } = await supabase.from("task_time_logs").update({ user_id: toUserId }).in("task_id", ids);
  if (logsErr) throw new Error(logsErr.message);

  const { error: commentsErr } = await supabase.from("task_comments").update({ user_id: toUserId }).in("task_id", ids);
  if (commentsErr) throw new Error(commentsErr.message);

  const { error: filesErr } = await supabase.from("files").update({ user_id: toUserId }).in("source_task_id", ids);
  if (filesErr) throw new Error(filesErr.message);
}