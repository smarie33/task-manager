"use client";

import React, { useState, useEffect } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import TaskGroup from "./TaskGroup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, ChevronDown, ChevronUp } from "lucide-react";
import { useTaskData } from "@/context/task-data-context";
import { Task, StatusOption } from "@/types/task";
import { useAuth } from "@/context/auth-context";
import { useSession } from "@/context/session-context";
// NEW: shadcn Select for filters
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createGroup, updateGroup, deleteGroup, createTask, updateTaskRow, updateTaskGroup } from "@/services/db";
import { updateTaskPositions, deleteTasksByGroup } from "@/services/db";
import { showError, showSuccess } from "@/utils/toast";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import TaskCsvImportDialog from "@/components/task-import/TaskCsvImportDialog";

const TaskManager: React.FC = () => {
  const { groups, setGroups, availableStatuses, setAvailableStatuses } = useTaskData();
  const [newGroupName, setNewGroupName] = useState("");
  const { role } = useAuth();
  const { session } = useSession();
  const readOnly = role === "Viewer";

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
      // Reindex positions for the affected group
      const updates = destinationGroup.tasks.map((t, idx) => ({ id: t.id, position: idx }));
      updateTaskPositions(updates).catch(() => showError("Failed to save task order"));
    } else {
      // Reindex both groups; moved task also changes group_id
      const sourceUpdates = sourceGroup.tasks.map((t, idx) => ({ id: t.id, position: idx }));
      const destUpdates = destinationGroup.tasks.map((t, idx) => ({
        id: t.id,
        position: idx,
        group_id: t.id === task.id ? destination.droppableId : undefined,
      }));
      updateTaskPositions([...sourceUpdates, ...destUpdates]).catch(() => showError("Failed to move task"));
    }
  };

  const handleAddTask = async (groupId: string, content: string) => {
    if (readOnly) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    if (!session?.user?.id) return;
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
    } as Omit<Task, "id">;
    try {
      const row = await createTask(session.user.id, groupId, baseTask);
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
      } as Task;
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, tasks: [...g.tasks, createdTask] } : g))
      );
    } catch {
      showError("Failed to create task");
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

        {/* ADDED: CSV import */}
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

        {/* NEW: global collapse/expand controls (allowed in readOnly) */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={collapseAll}>
            <ChevronDown className="h-4 w-4 mr-2" /> Collapse All
          </Button>
          <Button variant="outline" onClick={expandAll}>
            <ChevronUp className="h-4 w-4 mr-2" /> Expand All
          </Button>

          {/* Filters next to Expand All */}
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
          {groups.map((group) => {
            const visibleTasks = group.tasks.filter((t) => {
              const ownerOk = !selectedOwner || t.owner === selectedOwner;
              const statusOk = !selectedStatus || t.status === selectedStatus;
              return ownerOk && statusOk;
            });
            const otherGroups = groups.filter((g) => g.id !== group.id).map((g) => ({ id: g.id, name: g.name }));
            return (
              <TaskGroup
                key={group.id}
                group={group}
                onAddTask={handleAddTask}
                onUpdateGroupName={handleUpdateGroupName}
                onUpdateGroupColor={handleUpdateGroupColor}
                onDeleteGroup={handleDeleteGroup}
                onDeleteTask={handleDeleteTask}
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
              />
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default TaskManager;