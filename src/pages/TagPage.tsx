"use client";

import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useTaskData } from "@/context/task-data-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { lightenHexColor } from "@/lib/utils";
import AppDrawer from "@/components/AppDrawer";
import { Task } from "@/types/task";
import { v4 as uuidv4 } from "uuid";
import AppHeader from "@/components/AppHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import DrawerEditSection from "@/components/task-item/drawer/DrawerEditSection";
import DrawerImagesSection from "@/components/task-item/drawer/DrawerImagesSection";
import CommentsSection from "@/components/task-item/drawer/CommentsSection";
import { useAuth } from "@/context/auth-context";
import NotesEditor from "@/components/task-item/drawer/NotesEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SortMode = "content" | "group" | "status";

const TagPage: React.FC = () => {
  const { tagName = "" } = useParams();
  const { groups, setGroups, availableStatuses } = useTaskData();
  const { role } = useAuth();
  const readOnly = role === "Viewer";

  const [selected, setSelected] = useState<{ task: Task; groupId: string; groupName: string; groupColor: string } | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("content");

  // Compute all tags for DrawerEditSection tags picker parity
  const allTags = React.useMemo(() => {
    return Array.from(new Set(groups.flatMap((g) => g.tasks.flatMap((t) => t.tags)))).sort();
  }, [groups]);

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

  const statusRank = React.useMemo(() => {
    const map = new Map<string, number>();
    availableStatuses.forEach((s, idx) => map.set(s.name, idx));
    return map;
  }, [availableStatuses]);

  const statusColor = React.useMemo(() => {
    if (!selected) return "#6b7280";
    const s = availableStatuses.find((x) => x.name === selected.task.status);
    return s?.color ?? "#6b7280";
  }, [selected, availableStatuses]);

  const decodedTag = decodeURIComponent(tagName);

  const tasksWithTag = React.useMemo(() => {
    const list = groups
      .flatMap((g) =>
        g.tasks.map((t) => ({
          task: t,
          groupId: g.id,
          groupName: g.name,
          groupColor: g.color,
          groupPosition: typeof (g as any).position === "number" ? ((g as any).position as number) : undefined,
        }))
      )
      .filter(({ task }) => task.tags.includes(decodedTag));

    const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

    list.sort((a, b) => {
      if (sortMode === "group") {
        const ap = typeof a.groupPosition === "number" ? a.groupPosition : Number.MAX_SAFE_INTEGER;
        const bp = typeof b.groupPosition === "number" ? b.groupPosition : Number.MAX_SAFE_INTEGER;
        if (ap !== bp) return ap - bp;
        const gn = norm(a.groupName).localeCompare(norm(b.groupName));
        if (gn !== 0) return gn;
        return norm(a.task.content).localeCompare(norm(b.task.content));
      }

      if (sortMode === "status") {
        const ar = statusRank.has(a.task.status) ? (statusRank.get(a.task.status) as number) : Number.MAX_SAFE_INTEGER;
        const br = statusRank.has(b.task.status) ? (statusRank.get(b.task.status) as number) : Number.MAX_SAFE_INTEGER;
        if (ar !== br) return ar - br;
        const sn = norm(a.task.status).localeCompare(norm(b.task.status));
        if (sn !== 0) return sn;
        return norm(a.task.content).localeCompare(norm(b.task.content));
      }

      // content
      return norm(a.task.content).localeCompare(norm(b.task.content));
    });

    return list;
  }, [decodedTag, groups, sortMode, statusRank]);

  React.useEffect(() => {
    if (selected) {
      setEditedContent(selected.task.content);
    }
  }, [selected]);

  const updateSelectedTaskField = <K extends keyof Task>(field: K, value: Task[K]) => {
    if (!selected) return;
    setGroups((prev) =>
      prev.map((group) =>
        group.id === selected.groupId
          ? {
              ...group,
              tasks: group.tasks.map((task) =>
                task.id === selected.task.id ? { ...task, [field]: value } : task
              ),
            }
          : group
      )
    );
    setSelected((prev) => (prev ? { ...prev, task: { ...prev.task, [field]: value } } : prev));
  };

  return (
    <div className="p-6 min-h-screen bg-black">
      <AppHeader />
      <div className="max-w-5xl mx-auto pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-white"># {decodedTag}</h1>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-300">Sort</span>
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="w-44 bg-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="content">Task</SelectItem>
                <SelectItem value="group">Group</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {tasksWithTag.length === 0 ? (
          <p className="text-sm text-gray-300">No items with this tag.</p>
        ) : (
          <div className="space-y-4">
            {tasksWithTag.map(({ task, groupId, groupName, groupColor }) => (
              <Card
                key={task.id}
                className="shadow-sm cursor-pointer hover:bg-gray-100"
                onClick={() => setSelected({ task, groupId, groupName, groupColor })}
                role="button"
                aria-label={`Open details for ${task.content}`}
              >
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{task.content}</CardTitle>
                  <span
                    className="text-xs font-medium rounded-md px-2 py-1 border"
                    style={{
                      color: groupColor,
                      backgroundColor: lightenHexColor(groupColor, 0.9),
                      borderColor: groupColor,
                    }}
                  >
                    {groupName}
                  </span>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Owner</p>
                      <p>{task.owner || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Timeline</p>
                      <p>{task.timeline || "N/A"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Tags</p>
                      <p>{task.tags.length ? task.tags.join(", ") : "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Drawer shown when a task is selected */}
        <AppDrawer
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          title="Task Details"
        >
          {selected && (
            <div className="space-y-4">
              <div className="w-full">
                {isEditingTitle && !readOnly ? (
                  <input
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    autoFocus
                    onBlur={() => {
                      const next = editedContent.trim();
                      if (next !== selected.task.content) {
                        updateSelectedTaskField("content", next);
                      }
                      setIsEditingTitle(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const next = editedContent.trim();
                        if (next !== selected.task.content) {
                          updateSelectedTaskField("content", next);
                        }
                        setIsEditingTitle(false);
                      } else if (e.key === "Escape") {
                        setEditedContent(selected.task.content);
                        setIsEditingTitle(false);
                      }
                    }}
                    className="w-full bg-transparent border-b border-gray-300 focus:border-gray-500 outline-none text-lg px-1 py-1 font-semibold"
                  />
                ) : (
                  <h2
                    className={`text-lg font-semibold ${readOnly ? "cursor-default" : "cursor-text"} px-1 py-1 rounded hover:bg-muted/50`}
                    onClick={() => {
                      if (readOnly) return;
                      setEditedContent(selected.task.content);
                      setIsEditingTitle(true);
                    }}
                    title={readOnly ? undefined : "Click to rename"}
                  >
                    {selected.task.content || "Untitled task"}
                  </h2>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="text-sm">{selected.task.owner || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timeline</p>
                  <p className="text-sm">{selected.task.timeline || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span
                    className="inline-flex items-center text-xs font-medium rounded-md px-2 py-1 border"
                    style={{
                      color: statusColor,
                      backgroundColor: lightenHexColor(statusColor, 0.9),
                      borderColor: statusColor,
                    }}
                  >
                    {selected.task.status || "N/A"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tags</p>
                  <p className="text-sm">
                    {selected.task.tags.length ? selected.task.tags.join(", ") : "N/A"}
                  </p>
                </div>
              </div>

              {/* Notes above Edit Details */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <NotesEditor
                  value={selected.task.notes || ""}
                  onChange={(html) => {
                    if (readOnly) return;
                    updateSelectedTaskField("notes", html);
                  }}
                  disabled={readOnly}
                />
              </div>

              {/* Edit Details accordion (same component as Task Manager) */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="edit">
                  <AccordionTrigger>Edit Details</AccordionTrigger>
                  <AccordionContent>
                    <DrawerEditSection
                      task={selected.task}
                      availableStatuses={availableStatuses}
                      allTags={allTags}
                      onDeleteGlobalTag={handleDeleteGlobalTag}
                      onUpdateTaskField={(taskId, field, value) => {
                        // Use wrapper to route to selected task updater
                        updateSelectedTaskField(field as keyof Task, value);
                      }}
                      readOnly={readOnly}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Images thumbnails (same as Task Manager) */}
              <DrawerImagesSection
                images={(selected.task.files ?? []).filter((f) => (f.mimeType ?? "").startsWith("image/"))}
              />

              {/* Comments section (same component as Task Manager) */}
              <CommentsSection
                taskId={selected.task.id}
                comments={selected.task.comments}
                onUpdateTaskField={(taskId, field, value) => {
                  updateSelectedTaskField(field as keyof Task, value);
                }}
              />
            </div>
          )}
        </AppDrawer>
      </div>
    </div>
  );
};

export default TagPage;