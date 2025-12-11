"use client";

import React, { useState, useEffect } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import TaskGroup from "./TaskGroup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon, ChevronDown, ChevronUp } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useTaskData } from "@/context/task-data-context";
import { Task, StatusOption } from "@/types/task";
import { useAuth } from "@/context/auth-context";

const TaskManager: React.FC = () => {
  const { groups, setGroups, availableStatuses, setAvailableStatuses } = useTaskData();
  const [newGroupName, setNewGroupName] = useState("");
  const { role } = useAuth();
  const readOnly = role === "Viewer";

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

    sourceGroup.tasks.splice(source.index, 1);
    destinationGroup.tasks.splice(destination.index, 0, task);

    setGroups(newGroups);
  };

  const handleAddTask = (groupId: string, content: string) => {
    if (readOnly) return;
    setGroups((prevGroups) =>
      prevGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              tasks: [
                ...group.tasks,
                {
                  id: uuidv4(),
                  content,
                  owner: "",
                  status: availableStatuses[0]?.name || "To Do",
                  timeline: "",
                  timeTracking: 0,
                  tags: [],
                  hasFiles: false,
                  timeLogs: [],
                  comments: [],
                  files: [], // NEW
                  notes: "",
                },
              ],
            }
          : group
      )
    );
  };

  const handleAddGroup = () => {
    if (readOnly) return;
    if (newGroupName.trim()) {
      setGroups((prevGroups) => [
        ...prevGroups,
        {
          id: uuidv4(),
          name: newGroupName.trim(),
          color: "#60a5fa",
          tasks: [],
        },
      ]);
      setNewGroupName("");
    }
  };

  const handleUpdateGroupName = (groupId: string, newName: string) => {
    if (readOnly) return;
    setGroups((prevGroups) =>
      prevGroups.map((group) => (group.id === groupId ? { ...group, name: newName } : group))
    );
  };

  const handleUpdateGroupColor = (groupId: string, newColor: string) => {
    if (readOnly) return;
    setGroups((prevGroups) =>
      prevGroups.map((group) => (group.id === groupId ? { ...group, color: newColor } : group))
    );
  };

  const handleDeleteGroup = (groupId: string) => {
    if (readOnly) return;
    setGroups((prevGroups) => prevGroups.filter((group) => group.id !== groupId));
  };

  const handleDeleteTask = (groupId: string, taskId: string) => {
    if (readOnly) return;
    setGroups((prevGroups) =>
      prevGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              tasks: group.tasks.filter((task) => task.id !== taskId),
            }
          : group
      )
    );
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

        {/* NEW: global collapse/expand controls (allowed in readOnly) */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={collapseAll}>
            <ChevronDown className="h-4 w-4 mr-2" /> Collapse All
          </Button>
          <Button variant="outline" onClick={expandAll}>
            <ChevronUp className="h-4 w-4 mr-2" /> Expand All
          </Button>
        </div>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col items-center gap-6 pb-4">
          {groups.map((group) => (
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
              // NEW: controlled collapse per group
              isCollapsed={collapsedGroups[group.id] ?? false}
              onToggleCollapse={() => toggleGroupCollapse(group.id)}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default TaskManager;