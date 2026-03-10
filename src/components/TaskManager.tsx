"use client";

import React, { useState, useEffect, useRef } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import TaskGroup from "./TaskGroup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, ChevronDown, ChevronUp } from "lucide-react";
import { useTaskData } from "@/context/task-data-context";
import { Task } from "@/types/task";
import { useAuth } from "@/context/auth-context";
import { useSession } from "@/context/session-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createGroup, updateGroup, deleteGroup, createTask, updateTaskRow } from "@/services/db";
import { updateTaskPositions, deleteTasksByGroup, deleteTasksByIds } from "@/services/db";
import { showError, showSuccess } from "@/utils/toast";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import TaskCsvImportDialog from "@/components/task-import/TaskCsvImportDialog";

type SortKey = "owner" | "content" | "status" | "timeline";

const GROUP_ORDER_KEY = "taskGroupOrder";

type DropPos = "below";

const TaskManager: React.FC = () => {
  const { groups, setGroups, availableStatuses, setAvailableStatuses } = useTaskData();
  const [newGroupName, setNewGroupName] = useState("");
  const { role } = useAuth();
  const { session } = useSession();
  const readOnly = role === "Viewer";

  const [groupOrder, setGroupOrder] = useState<string[]>(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(GROUP_ORDER_KEY) : null;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed.filter((v) => typeof v === "string") as string[]) : [];
    } catch {
      return [];
    }
  });

  const applyGroupOrder = React.useCallback(
    (list: typeof groups, order: string[]) => {
      if (!order || order.length === 0) return list;
      const byId = new Map(list.map((g) => [g.id, g]));
      const ordered: typeof groups = [];
      for (const id of order) {
        const g = byId.get(id);
        if (g) ordered.push(g);
      }
      for (const g of list) {
        if (!order.includes(g.id)) ordered.push(g);
      }
      return ordered;
    },
    []
  );

  useEffect(() => {
    // Keep groupOrder in sync with actual groups (remove stale, append new)
    setGroupOrder((prev) => {
      const existing = new Set(groups.map((g) => g.id));
      const next = prev.filter((id) => existing.has(id));
      for (const g of groups) {
        if (!next.includes(g.id)) next.push(g.id);
      }
      return next;
    });
  }, [groups]);

  useEffect(() => {
    window.localStorage.setItem(GROUP_ORDER_KEY, JSON.stringify(groupOrder));
  }, [groupOrder]);

  const orderedGroups = React.useMemo(() => applyGroupOrder(groups, groupOrder), [groups, groupOrder, applyGroupOrder]);

  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [groupDropHover, setGroupDropHover] = useState<{ groupId: string; pos: DropPos } | null>(null);
  const prevCollapsedRef = useRef<Record<string, boolean> | null>(null);
  const pendingGroupMoveRef = useRef<{ from: string; to: string; pos: DropPos } | null>(null);

  const reorderGroupsById = (fromGroupId: string, toGroupId: string, pos: DropPos) => {
    const current = applyGroupOrder(groups, groupOrder);
    const fromIndex = current.findIndex((g) => g.id === fromGroupId);
    const toIndex = current.findIndex((g) => g.id === toGroupId);
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromGroupId === toGroupId) return;

    let insertIndex = toIndex + 1;

    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    if (fromIndex < insertIndex) insertIndex -= 1;
    next.splice(insertIndex, 0, moved);

    setGroups(next);
    setGroupOrder(next.map((g) => g.id));
  };

  const finishGroupDrag = (applyPending: boolean) => {
    setDraggingGroupId(null);
    setGroupDropHover(null);

    if (prevCollapsedRef.current) {
      setCollapsedGroups(prevCollapsedRef.current);
      prevCollapsedRef.current = null;
    }

    if (applyPending) {
      const pending = pendingGroupMoveRef.current;
      pendingGroupMoveRef.current = null;
      if (pending) {
        // Run after React state clears to avoid browser drag state glitches.
        setTimeout(() => reorderGroupsById(pending.from, pending.to, pending.pos), 0);
      }
    } else {
      pendingGroupMoveRef.current = null;
    }
  };

  const onGroupDragStart = (groupId: string) => (e: React.DragEvent) => {
    setDraggingGroupId(groupId);
    setGroupDropHover(null);
    pendingGroupMoveRef.current = null;

    // Collapse everything while dragging (and restore afterwards)
    if (!prevCollapsedRef.current) {
      prevCollapsedRef.current = collapsedGroups;
    }
    setCollapsedGroups(Object.fromEntries(groups.map((g) => [g.id, true])));

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", groupId);
  };

  const onGroupDragEnd = () => {
    // This doesn't always fire reliably across browsers when the DOM reorders,
    // so we also call finishGroupDrag from onDrop.
    finishGroupDrag(true);
  };

  const onGroupDropZoneDragOver = (overGroupId: string, pos: DropPos) => (e: React.DragEvent) => {
    if (!draggingGroupId || draggingGroupId === overGroupId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setGroupDropHover({ groupId: overGroupId, pos });
  };

  const onGroupDropZoneDrop = (overGroupId: string, pos: DropPos) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = e.dataTransfer.getData("text/plain") || draggingGroupId;
    if (from && from !== overGroupId) {
      pendingGroupMoveRef.current = { from, to: overGroupId, pos };
    }

    // Important: explicitly finish the drag on drop so we never get stuck in a dragging state.
    finishGroupDrag(true);
  };

  useEffect(() => {
    if (!draggingGroupId) return;

    const onWindowDragEnd = () => finishGroupDrag(true);
    window.addEventListener("dragend", onWindowDragEnd);
    return () => window.removeEventListener("dragend", onWindowDragEnd);
  }, [draggingGroupId]);

  // Load users for owner dropdown
  const { users } = useAdminUsers();
  const ownerOptions = React.useMemo(() => {
    const emailToUsername = (email?: string | null) => {
      if (!email) return "";
      return String(email).split("@")[0] ?? "";
    };
    const labels = users
      .filter((u) => u.status === "active")
      .map((u) => (u.name && u.name.trim().length > 0 ? u.name.trim() : emailToUsername(u.email)))
      .filter((v) => !!v);
    return Array.from(new Set(labels)).sort();
  }, [users]);

  // NEW: global filters
  const [selectedOwner, setSelectedOwner] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // NEW: sentinel values (Radix Select items cannot use empty strings)
  const ALL_USERS = "__all_users__";
  const ALL_STATUSES = "__all_statuses__";

  // NEW: collapsed state per group with localStorage persistence
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem("collapsedGroups") : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        return parsed;
      } catch {
        // fall through to default
      }
    }
    return Object.fromEntries(groups.map((g) => [g.id, false]));
  });

  useEffect(() => {
    // ensure keys exist for all groups and remove stale ones
    setCollapsedGroups((prev) => {
      const next: Record<string, boolean> = {};
      for (const g of groups) {
        next[g.id] = prev[g.id] ?? false;
      }
      return next;
    });
  }, [groups]);

  useEffect(() => {
    window.localStorage.setItem("collapsedGroups", JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  const collapseAll = () => {
    setCollapsedGroups(Object.fromEntries(groups.map((g) => [g.id, true])));
  };

  const expandAll = () => {
    setCollapsedGroups(Object.fromEntries(groups.map((g) => [g.id, false])));
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // ALL TAGS: collect unique tags across all tasks
  const allTags = Array.from(new Set(groups.flatMap((g) => g.tasks.flatMap((t) => t.tags)))).sort();

  // NEW: collect unique owners across all tasks (non-empty)
  const allOwners = Array.from(
    new Set(
      groups.flatMap((g) => g.tasks.map((t) => t.owner).filter((o) => !!o && o.trim().length > 0))
    )
  ).sort();

  // NEW: filter active flag
  const filterActive = (selectedOwner && selectedOwner.length > 0) || (selectedStatus && selectedStatus.length > 0);

  // NEW: delete a tag globally (remove from all tasks in all groups)
  const handleDeleteGlobalTag = (tagToDelete: string) => {
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        tasks: group.tasks.map((task) => ({
          ...task,
          tags: task.tags.filter((t) => t !== tagToDelete),
        })),
      }))
    );
  };

  const parseTimelineFirstDate = (timeline: string) => {
    const t = String(timeline ?? "").trim();
    if (!t) return Number.POSITIVE_INFINITY;
    const m = t.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (!m) return Number.POSITIVE_INFINITY;
    const ms = new Date(m[0]).getTime();
    return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
  };

  const handleSortGroup = (groupId: string, sortBy: SortKey) => {
    const statusRank = new Map<string, number>();
    availableStatuses.forEach((s, idx) => statusRank.set(s.name, idx));

    const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

    const sortTasks = (tasks: Task[]) => {
      const copy = [...tasks];
      copy.sort((a, b) => {
        if (sortBy === "owner") {
          const ao = norm(a.owner);
          const bo = norm(b.owner);
          if (!ao && bo) return 1;
          if (ao && !bo) return -1;
          if (ao !== bo) return ao.localeCompare(bo);
          return norm(a.content).localeCompare(norm(b.content));
        }
        if (sortBy === "content") {
          const ac = norm(a.content);
          const bc = norm(b.content);
          if (ac !== bc) return ac.localeCompare(bc);
          return a.id.localeCompare(b.id);
        }
        if (sortBy === "status") {
          const ar = statusRank.has(a.status) ? (statusRank.get(a.status) as number) : Number.MAX_SAFE_INTEGER;
          const br = statusRank.has(b.status) ? (statusRank.get(b.status) as number) : Number.MAX_SAFE_INTEGER;
          if (ar !== br) return ar - br;
          const as = norm(a.status);
          const bs = norm(b.status);
          if (as !== bs) return as.localeCompare(bs);
          return norm(a.content).localeCompare(norm(b.content));
        }
        // timeline
        const ad = parseTimelineFirstDate(a.timeline);
        const bd = parseTimelineFirstDate(b.timeline);
        if (ad !== bd) return ad - bd;
        return norm(a.content).localeCompare(norm(b.content));
      });
      return copy.map((t, idx) => ({ ...t, position: idx }));
    };

    let updatesToPersist: { id: string; position: number }[] = [];

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const sorted = sortTasks(g.tasks);
        updatesToPersist = sorted.map((t) => ({ id: t.id, position: t.position ?? 0 }));
        return { ...g, tasks: sorted };
      })
    );

    // Persist ordering for admins/editors so it sticks after reload.
    if (!readOnly && updatesToPersist.length > 0) {
      updateTaskPositions(updatesToPersist).catch(() => showError("Failed to save sort order"));
    }
  };

  const handleAddTask = async (groupId: string, content: string) => {
    if (readOnly) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    if (!session?.user?.id) return;

    const groupOwnerUserId = (groups.find((g) => g.id === groupId)?.userId ?? session.user.id) as string;

    // Determine position at end of group
    const current = groups.find((g) => g.id === groupId);
    const newPos = current ? current.tasks.length : 0;
    const baseTask = {
      content: trimmed,
      owner: "",
      status: availableStatuses[0]?.name || "To Do",
      timeline: "",
      timeTracking: 0,
      tags: [],
      hasFiles: false,
      notes: "",
      position: newPos,
      userId: groupOwnerUserId,
    } as Omit<Task, "id">;
    try {
      const row = await createTask(groupOwnerUserId, groupId, baseTask);
      const createdTask = {
        id: row.id as string,
        content: row.content ?? trimmed,
        owner: row.owner ?? "",
        status: row.status ?? baseTask.status,
        timeline: row.timeline ?? "",
        timeTracking: Number(row.time_tracking ?? 0),
        tags: Array.isArray(row.tags) ? row.tags : [],
        hasFiles: !!row.has_files,
        timeLogs: [],
        comments: [],
        files: [],
        notes: row.notes ?? "",
        position: typeof row.position === "number" ? row.position : newPos,
        userId: row.user_id ?? groupOwnerUserId,
      } as Task;
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, tasks: [...g.tasks, createdTask] } : g))
      );
    } catch {
      showError("Failed to create task");
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (readOnly) return;
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceGroupIndex = groups.findIndex((group) => group.id === source.droppableId);
    const destinationGroupIndex = groups.findIndex((group) => group.id === destination.droppableId);

    const newGroups = Array.from(groups);
    const sourceGroup = newGroups[sourceGroupIndex];
    const destinationGroup = newGroups[destinationGroupIndex];

    const task = sourceGroup.tasks.find((t) => t.id === draggableId);
    if (!task) return;

    // Update in-memory order
    sourceGroup.tasks.splice(source.index, 1);
    destinationGroup.tasks.splice(destination.index, 0, task);

    setGroups(newGroups);

    // Persist ordering
    if (source.droppableId === destination.droppableId) {
      const updates = destinationGroup.tasks.map((t, idx) => ({ id: t.id, position: idx }));
      updateTaskPositions(updates).catch(() => showError("Failed to save task order"));
    } else {
      const sourceUpdates = sourceGroup.tasks.map((t, idx) => ({ id: t.id, position: idx }));
      const destUpdates = destinationGroup.tasks.map((t, idx) => ({
        id: t.id,
        position: idx,
        group_id: t.id === task.id ? destination.droppableId : undefined,
      }));
      updateTaskPositions([...sourceUpdates, ...destUpdates]).catch(() => showError("Failed to move task"));
    }
  };

  const handleAddGroup = async () => {
    if (readOnly) return;
    const name = newGroupName.trim();
    if (!name) return;
    if (!session?.user?.id) return;
    try {
      const row = await createGroup(session.user.id, name, "#60a5fa");
      setGroups((prev) => [...prev, { id: row.id as string, name: row.name, color: row.color, tasks: [] }]);
      setNewGroupName("");
    } catch {
      showError("Failed to create group");
    }
  };

  const handleUpdateGroupName = (groupId: string, newName: string) => {
    if (readOnly) return;
    setGroups((prevGroups) =>
      prevGroups.map((group) => (group.id === groupId ? { ...group, name: newName } : group))
    );
    updateGroup(groupId, { name: newName }).catch(() => showError("Failed to update group name"));
  };

  const handleUpdateGroupColor = (groupId: string, newColor: string) => {
    if (readOnly) return;
    setGroups((prevGroups) =>
      prevGroups.map((group) => (group.id === groupId ? { ...group, color: newColor } : group))
    );
    updateGroup(groupId, { color: newColor }).catch(() => showError("Failed to update group color"));
  };

  // REPLACED: delete with guarded options (reassign or delete)
  const handleDeleteGroup = (groupId: string, mode: "delete" | "reassign", targetGroupId?: string) => {
    if (readOnly) return;
    if (mode === "delete") {
      // Remove locally
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      // Delete tasks then group remotely
      Promise.resolve()
        .then(() => deleteTasksByGroup(groupId))
        .then(() => deleteGroup(groupId))
        .then(() => showSuccess("Group deleted"))
        .catch(() => showError("Failed to delete group"));
      return;
    }
    if (mode === "reassign" && targetGroupId) {
      // Move tasks locally to target group end, then remove group
      setGroups((prev) => {
        const source = prev.find((g) => g.id === groupId);
        const target = prev.find((g) => g.id === targetGroupId);
        if (!source || !target) return prev;
        const moved = source.tasks;
        const combined = [...target.tasks, ...moved];
        // Reindex combined
        const reindexed = combined.map((t, idx) => ({ ...t, position: idx }));
        return prev
          .map((g) => {
            if (g.id === targetGroupId) return { ...g, tasks: reindexed };
            if (g.id === groupId) return null as any;
            return g;
          })
          .filter(Boolean) as typeof prev;
      });
      // Persist: reindex target group's tasks with new positions and group_id for moved tasks, then delete group
      const targetGroup = groups.find((g) => g.id === targetGroupId);
      const sourceGroup = groups.find((g) => g.id === groupId);
      const combined = [...(targetGroup?.tasks ?? []), ...(sourceGroup?.tasks ?? [])];
      const updates = combined.map((t, idx) => ({
        id: t.id,
        position: idx,
        group_id: targetGroupId,
      }));
      updateTaskPositions(updates)
        .then(() => deleteGroup(groupId))
        .then(() => showSuccess("Group deleted and tasks reassigned"))
        .catch(() => showError("Failed to reassign tasks or delete group"));
      return;
    }
  };

  const handleDeleteSelectedTasksInGroup = (groupId: string, taskIds: string[]) => {
    if (readOnly) return;
    if (taskIds.length === 0) return;

    let remainingUpdates: { id: string; position: number }[] = [];

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const remaining = g.tasks
          .filter((t) => !taskIds.includes(t.id))
          .map((t, idx) => ({ ...t, position: idx }));
        remainingUpdates = remaining.map((t) => ({ id: t.id, position: t.position ?? 0 }));
        return { ...g, tasks: remaining };
      })
    );

    deleteTasksByIds(taskIds)
      .then(() => updateTaskPositions(remainingUpdates))
      .then(() => showSuccess(`Deleted ${taskIds.length} task${taskIds.length === 1 ? "" : "s"}`))
      .catch(() => showError("Failed to delete tasks"));
  };

  const handleDeleteTask = (groupId: string, taskId: string) => {
    if (readOnly) return;
    setGroups((prevGroups) =>
      prevGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              tasks: group.tasks.filter((task) => task.id !== taskId).map((t, idx) => ({ ...t, position: idx })),
            }
          : group
      )
    );
    // Persist delete, then reindex remaining positions
    import("@/services/db").then(m => {
      m.deleteTask(taskId)
        .then(() => {
          const grp = groups.find((g) => g.id === groupId);
          if (!grp) return;
          const remaining = grp.tasks.filter((t) => t.id !== taskId);
          const updates = remaining.map((t, idx) => ({ id: t.id, position: idx }));
          return m.updateTaskPositions(updates);
        })
        .catch(() => showError("Failed to delete task"));
    });
  };

  const handleDeleteAllTasksInGroup = (groupId: string) => {
    if (readOnly) return;

    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, tasks: [] } : g)));
    deleteTasksByGroup(groupId)
      .then(() => showSuccess("Deleted tasks"))
      .catch(() => showError("Failed to delete tasks"));
  };

  const handleUpdateTaskField = <K extends keyof Task>(
    groupId: string,
    taskId: string,
    field: K,
    value: Task[K]
  ) => {
    if (readOnly) return;
    setGroups((prevGroups) =>
      prevGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              tasks: group.tasks.map((task) => (task.id === taskId ? { ...task, [field]: value } : task)),
            }
          : group
      )
    );
    const persistable: Partial<Task> = { [field]: value } as any;
    updateTaskRow(taskId, persistable).catch(() => showError("Failed to update task"));
  };

  // ADDED: archive group
  const handleArchiveGroup = (groupId: string) => {
    if (readOnly) return;
    // Optimistically hide group
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    updateGroup(groupId, { archived: true })
      .then(() => showSuccess("Group archived"))
      .catch(() => showError("Failed to archive group"));
  };

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">Task Manager</h1>
      <div className="flex flex-wrap gap-6 justify-center mb-8">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="New group name..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddGroup();
            }}
            className="w-40"
            disabled={readOnly}
          />
          <Button onClick={handleAddGroup} disabled={readOnly}>
            <PlusIcon className="h-4 w-4 mr-2" /> Add Group
          </Button>
        </div>

        <TaskCsvImportDialog
          userId={session?.user?.id ?? null}
          groups={groups}
          availableStatuses={availableStatuses}
          setAvailableStatuses={setAvailableStatuses}
          disabled={readOnly}
          onTasksImported={(groupId, tasks) => {
            setGroups((prev) =>
              prev.map((g) => (g.id === groupId ? { ...g, tasks: [...g.tasks, ...tasks] } : g))
            );
          }}
        />

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={collapseAll}>
            <ChevronDown className="h-4 w-4 mr-2" /> Collapse All
          </Button>
          <Button variant="outline" onClick={expandAll}>
            <ChevronUp className="h-4 w-4 mr-2" /> Expand All
          </Button>

          <div className="flex items-center gap-2 ml-2">
            <Select
              value={selectedOwner === "" ? ALL_USERS : selectedOwner}
              onValueChange={(val) => setSelectedOwner(val === ALL_USERS ? "" : val)}
            >
              <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_USERS}>All users</SelectItem>
                {allOwners.map((owner) => (
                  <SelectItem key={owner} value={owner}>
                    {owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedStatus === "" ? ALL_STATUSES : selectedStatus}
              onValueChange={(val) => setSelectedStatus(val === ALL_STATUSES ? "" : val)}
            >
              <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
                {availableStatuses.map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col items-center gap-6 pb-4">
          {orderedGroups.map((group) => {
            const visibleTasks = group.tasks.filter((t) => {
              const ownerOk = !selectedOwner || t.owner === selectedOwner;
              const statusOk = !selectedStatus || t.status === selectedStatus;
              return ownerOk && statusOk;
            });
            const otherGroups = groups.filter((g) => g.id !== group.id).map((g) => ({ id: g.id, name: g.name }));

            const isDragging = draggingGroupId === group.id;
            const showDrop = !!draggingGroupId && draggingGroupId !== group.id;
            const bottomActive = showDrop && groupDropHover?.groupId === group.id && groupDropHover?.pos === "below";

            return (
              <div key={group.id} className="w-full flex justify-center">
                <div className="w-full max-w-[1500px]">
                  <div className={isDragging ? "opacity-70" : ""}>
                    <TaskGroup
                      group={group}
                      onAddTask={handleAddTask}
                      onUpdateGroupName={handleUpdateGroupName}
                      onUpdateGroupColor={handleUpdateGroupColor}
                      onDeleteGroup={handleDeleteGroup}
                      onDeleteSelectedTasks={handleDeleteSelectedTasksInGroup}
                      onUpdateTaskField={handleUpdateTaskField}
                      availableStatuses={availableStatuses}
                      setAvailableStatuses={setAvailableStatuses}
                      allTags={allTags}
                      onDeleteGlobalTag={handleDeleteGlobalTag}
                      readOnly={readOnly}
                      isCollapsed={collapsedGroups[group.id] ?? false}
                      onToggleCollapse={() => toggleGroupCollapse(group.id)}
                      visibleTasks={filterActive ? visibleTasks : undefined}
                      dragDisabled={filterActive}
                      filterActive={filterActive}
                      onArchiveGroup={handleArchiveGroup}
                      otherGroups={otherGroups}
                      owners={ownerOptions}
                      onSortGroup={handleSortGroup}
                      groupDragHandleProps={{
                        draggable: true,
                        onDragStart: onGroupDragStart(group.id),
                        onDragEnd: onGroupDragEnd,
                      }}
                    />
                  </div>

                  {/* Drop area BELOW */}
                  {showDrop ? (
                    <div
                      onDragOver={onGroupDropZoneDragOver(group.id, "below")}
                      onDrop={onGroupDropZoneDrop(group.id, "below")}
                      className={
                        "h-4 rounded-md transition-colors " +
                        (bottomActive ? "bg-blue-500/25 ring-2 ring-blue-500" : "bg-transparent")
                      }
                      aria-hidden
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default TaskManager;