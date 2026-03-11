"use client";

import React, { useState } from "react";
import { Draggable } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, lightenHexColor } from "@/lib/utils";
import { Task, StatusOption, FileMeta } from "@/types/task";
import { useSynchronizedScroll } from "@/components/SynchronizedScrollProvider";
import StatusCell from "./task-item/StatusCell";
import TimelineCell from "./task-item/TimelineCell";
import TimeTrackingCell from "./task-item/TimeTrackingCell";
import AppDrawer from "./AppDrawer";
import TagsCell from "./task-item/TagsCell";
import FilesCell from "./task-item/FilesCell";
import EditableCell from "./task-item/EditableCell";
import DrawerEditSection from "./task-item/drawer/DrawerEditSection";
import DrawerImagesSection from "./task-item/drawer/DrawerImagesSection";
import CommentsSection from "./task-item/drawer/CommentsSection";
import NotesEditor from "./task-item/drawer/NotesEditor";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import OwnerCell from "./task-item/OwnerCell";
import { MessageSquare, StickyNote } from "lucide-react";

interface TaskItemProps {
  task: Task;
  index: number;
  groupColor: string;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  onUpdateTaskField: <K extends keyof Task>(
    taskId: string,
    field: K,
    value: Task[K]
  ) => void;
  availableStatuses: StatusOption[];
  setAvailableStatuses: React.Dispatch<React.SetStateAction<StatusOption[]>>;
  allTags: string[];
  onDeleteGlobalTag: (tag: string) => void;
  readOnly?: boolean;
  dragDisabled?: boolean;
  owners: string[]; // NEW: list of owners to show in dropdown
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  index,
  groupColor,
  selected,
  onSelectedChange,
  onUpdateTaskField,
  availableStatuses,
  setAvailableStatuses,
  allTags,
  onDeleteGlobalTag,
  readOnly = false,
  dragDisabled = false,
  owners,
}) => {
  const [editingField, setEditingField] = useState<keyof Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditingDrawerTitle, setIsEditingDrawerTitle] = useState(false);
  const [drawerTitleDraft, setDrawerTitleDraft] = useState(task.content);

  const statusColor =
    availableStatuses.find((s) => s.name === task.status)?.color ?? "#6b7280";

  const { ref: scrollItemRef, onScroll: handleItemScroll } =
    useSynchronizedScroll();

  const editingBackgroundColor = editingField
    ? lightenHexColor(groupColor, 0.75)
    : undefined;

  const handleAddFiles = (newFiles: FileMeta[]) => {
    if (readOnly) return;
    const merged = [...(task.files ?? []), ...newFiles];
    onUpdateTaskField(task.id, "files", merged as Task["files"]);
    onUpdateTaskField(task.id, "hasFiles", (merged.length > 0) as Task["hasFiles"]);
  };

  const handleRemoveFile = (id: string) => {
    if (readOnly) return;
    const updated = (task.files ?? []).filter((f) => f.id !== id);
    onUpdateTaskField(task.id, "files", updated as Task["files"]);
    onUpdateTaskField(task.id, "hasFiles", (updated.length > 0) as Task["hasFiles"]);
  };

  const taskImages = React.useMemo(() => {
    return (task.files ?? []).filter((f) =>
      (f.mimeType ?? "").startsWith("image/")
    );
  }, [task.files]);

  const hasComments = (task.comments ?? []).length > 0;
  const hasNotes = React.useMemo(() => {
    const html = String(task.notes ?? "");
    if (/<img\b/i.test(html)) return true;
    const text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/\u200B/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > 0;
  }, [task.notes]);

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={readOnly || dragDisabled}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "shadow-sm cursor-grab active:cursor-grabbing rounded-none",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            {
              "border-t-0": index !== 0 && !snapshot.isDragging,
              "bg-white dark:bg-gray-800": !editingField,
            }
          )}
        >
          <CardContent className="p-0">
            <div
              className="grid grid-cols-[2.5rem_minmax(0,_1fr)_minmax(0,_1fr)] items-center"
              style={
                editingBackgroundColor
                  ? { backgroundColor: editingBackgroundColor }
                  : {}
              }
            >
              {/* Sticky Checkbox Column */}
              <div className="sticky left-0 z-20 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex items-center justify-center">
                <Checkbox
                  checked={selected}
                  onCheckedChange={(v) => onSelectedChange(v === true)}
                  disabled={readOnly}
                  aria-label="Select task"
                />
              </div>

              {/* Sticky Item Column */}
              <div className="sticky left-10 z-10 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                <div
                  className="flex items-center gap-2 px-2 py-2 cursor-pointer"
                  onClick={() => setIsDrawerOpen(true)}
                  title="Open task details"
                >
                  <span className="text-sm truncate min-w-0 flex-1">{task.content}</span>
                  {(hasNotes || hasComments) && (
                    <span className="flex items-center gap-1 shrink-0 text-muted-foreground">
                      {hasNotes ? (
                        <span title="Has notes">
                          <StickyNote className="h-4 w-4" />
                        </span>
                      ) : null}
                      {hasComments ? (
                        <span title="Has comments">
                          <MessageSquare className="h-4 w-4" />
                        </span>
                      ) : null}
                    </span>
                  )}
                </div>
              </div>

              {/* Scrollable Columns Container */}
              <div
                className="overflow-x-auto"
                ref={scrollItemRef}
                onScroll={handleItemScroll}
              >
                <div className="grid grid-cols-[repeat(5,_minmax(150px,_1fr))_minmax(120px,_0.5fr)] min-w-[740px] items-center">
                  {/* Owner */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
                    <OwnerCell
                      value={task.owner}
                      owners={owners}
                      onChange={(newOwner) =>
                        onUpdateTaskField(task.id, "owner", newOwner as Task["owner"])
                      }
                      disabled={readOnly}
                    />
                  </div>

                  {/* Status */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
                    <StatusCell
                      status={task.status}
                      availableStatuses={availableStatuses}
                      setAvailableStatuses={setAvailableStatuses}
                      onChange={(name) =>
                        onUpdateTaskField(task.id, "status", name as Task["status"])
                      }
                      disabled={readOnly}
                    />
                  </div>

                  {/* Timeline */}
                  <TimelineCell
                    timeline={task.timeline}
                    status={task.status}
                    onChange={(newTimeline) =>
                      onUpdateTaskField(task.id, "timeline", newTimeline as Task["timeline"])
                    }
                    disabled={readOnly}
                  />

                  {/* Time Tracking */}
                  <TimeTrackingCell
                    task={task}
                    groupColor={groupColor}
                    onUpdateTimeTracking={(hours) =>
                      onUpdateTaskField(task.id, "timeTracking", hours as Task["timeTracking"])
                    }
                    onUpdateTimeLogs={(logs) =>
                      onUpdateTaskField(task.id, "timeLogs", logs as Task["timeLogs"])
                    }
                    disabled={readOnly}
                  />

                  {/* Tags */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
                    <TagsCell
                      taskTags={task.tags}
                      allTags={allTags}
                      onAddTag={(tag) => {
                        if (readOnly) return;
                        const t = tag.trim();
                        if (!t) return;
                        if (task.tags.includes(t)) return;
                        onUpdateTaskField(task.id, "tags", [...task.tags, t] as Task["tags"]);
                      }}
                      onRemoveTag={(tag) => {
                        if (readOnly) return;
                        onUpdateTaskField(task.id, "tags", task.tags.filter((x) => x !== tag) as Task["tags"]);
                      }}
                      onDeleteGlobalTag={onDeleteGlobalTag}
                      disabled={readOnly}
                    />
                  </div>

                  {/* Files */}
                  <div className={`flex justify-center items-center py-2 ${taskImages.length > 0 ? "bg-blue-600 text-white" : ""}`}>
                    <FilesCell
                      files={task.files ?? []}
                      onAddFiles={handleAddFiles}
                      onRemoveFile={handleRemoveFile}
                      disabled={readOnly}
                      parentTaskId={task.id}
                      parentTaskContent={task.content}
                      inverted={taskImages.length > 0}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          {/* Drawer for Task details */}
          <AppDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} title="Task Details">
            <div className="space-y-4">
              {/* Inline editable task content directly under the header */}
              <div className="w-full">
                {isEditingDrawerTitle ? (
                  <input
                    value={drawerTitleDraft}
                    onChange={(e) => setDrawerTitleDraft(e.target.value)}
                    onBlur={() => {
                      if (drawerTitleDraft !== task.content) {
                        onUpdateTaskField(task.id, "content", drawerTitleDraft as Task["content"]);
                      }
                      setIsEditingDrawerTitle(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (drawerTitleDraft !== task.content) {
                          onUpdateTaskField(task.id, "content", drawerTitleDraft as Task["content"]);
                        }
                        setIsEditingDrawerTitle(false);
                      } else if (e.key === "Escape") {
                        setDrawerTitleDraft(task.content);
                        setIsEditingDrawerTitle(false);
                      }
                    }}
                    autoFocus
                    disabled={readOnly}
                    className="w-full bg-transparent border-b border-gray-300 focus:border-gray-500 outline-none text-base px-1 py-1"
                  />
                ) : (
                  <p
                    className={`text-base ${readOnly ? "cursor-default" : "cursor-text"} px-1 py-1 rounded hover:bg-muted/50`}
                    onClick={() => {
                      if (readOnly) return;
                      setDrawerTitleDraft(task.content);
                      setIsEditingDrawerTitle(true);
                    }}
                    title="Click to edit"
                  >
                    {task.content || "Untitled task"}
                  </p>
                )}
              </div>

              {/* Quick details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="text-sm">{task.owner || "N/A"}</p>
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
                    {task.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timeline</p>
                  <p className="text-sm">{task.timeline || "N/A"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Tags</p>
                  <p className="text-sm">{task.tags.length ? task.tags.join(", ") : "N/A"}</p>
                </div>
              </div>

              {/* Notes above Edit Details */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <NotesEditor
                  value={task.notes || ""}
                  onChange={(html) => {
                    if (readOnly) return;
                    onUpdateTaskField(task.id, "notes", html as Task["notes"]);
                  }}
                  disabled={readOnly}
                />
              </div>

              {/* Edit Details accordion without item editing */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="edit">
                  <AccordionTrigger>Edit Details</AccordionTrigger>
                  <AccordionContent>
                    <DrawerEditSection
                      task={task}
                      availableStatuses={availableStatuses}
                      allTags={allTags}
                      onDeleteGlobalTag={onDeleteGlobalTag}
                      onUpdateTaskField={onUpdateTaskField}
                      readOnly={readOnly}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Images thumbnails */}
              <DrawerImagesSection images={taskImages} />

              {/* Comments */}
              <CommentsSection
                taskId={task.id}
                comments={task.comments}
                onUpdateTaskField={onUpdateTaskField}
                readOnly={readOnly}
              />
            </div>
          </AppDrawer>
        </Card>
      )}
    </Draggable>
  );
};

export default TaskItem;