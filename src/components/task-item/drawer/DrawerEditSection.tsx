"use client";

import React from "react";
import { Task, StatusOption } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid } from "date-fns";
import type { DateRange } from "react-day-picker";
import TagsCell from "@/components/task-item/TagsCell";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import NotesEditor from "./NotesEditor";

type DrawerEditSectionProps = {
  task: Task;
  availableStatuses: StatusOption[];
  allTags: string[];
  onDeleteGlobalTag: (tag: string) => void;
  onUpdateTaskField: <K extends keyof Task>(taskId: string, field: K, value: Task[K]) => void;
  readOnly?: boolean;
};

const DrawerEditSection: React.FC<DrawerEditSectionProps> = ({
  task,
  availableStatuses,
  allTags,
  onDeleteGlobalTag,
  onUpdateTaskField,
  readOnly = false,
}) => {
  const [editedOwner, setEditedOwner] = React.useState(task.owner || "");
  React.useEffect(() => setEditedOwner(task.owner || ""), [task.owner]);
  const { users } = useAdminUsers();
  const activeNames = React.useMemo(
    () => users.filter((u) => u.status === "active").map((u) => u.name).sort((a, b) => a.localeCompare(b)),
    [users]
  );
  // Ensure current owner appears in the list if it's not an active user (to display value properly)
  const ownerOptions = React.useMemo(() => {
    if (editedOwner && !activeNames.includes(editedOwner)) {
      return [editedOwner, ...activeNames];
    }
    return activeNames;
  }, [activeNames, editedOwner]);

  const selectedDateRange: DateRange | undefined = React.useMemo(() => {
    const t = task.timeline || "";
    if (t) {
      const parts = t.split(" - ");
      if (parts.length === 2) {
        const from = parseISO(parts[0]);
        const to = parseISO(parts[1]);
        if (isValid(from) && isValid(to)) return { from, to };
      } else {
        const from = parseISO(t);
        if (isValid(from)) return { from };
      }
    }
    return undefined;
  }, [task.timeline]);

  const formatTimelineDisplay = (val: string): string => {
    if (!val) return "Select date or range";
    const parts = val.split(" - ");
    const fmt = (d: Date) => format(d, "MMM d");
    if (parts.length === 2) {
      const from = parseISO(parts[0]);
      const to = parseISO(parts[1]);
      if (isValid(from) && isValid(to)) {
        const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
        return sameMonth ? `${fmt(from)} - ${format(to, "d")}` : `${fmt(from)} - ${fmt(to)}`;
      }
      return val;
    }
    const single = parseISO(parts[0]);
    return isValid(single) ? fmt(single) : val;
  };

  const handleTimelineSelect = (range: DateRange | undefined) => {
    let newTimelineString = "";
    if (range?.from) {
      newTimelineString = format(range.from, "yyyy-MM-dd");
      if (range.to && range.to !== range.from) {
        newTimelineString += ` - ${format(range.to, "yyyy-MM-dd")}`;
      }
    }
    onUpdateTaskField(task.id, "timeline", newTimelineString as Task["timeline"]);
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">Edit Details</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Owner</p>
          <Select
            value={editedOwner || ""}
            onValueChange={(val) => {
              if (readOnly) return;
              const next = val === "__none__" ? "" : val;
              setEditedOwner(next);
              onUpdateTaskField(task.id, "owner", next as Task["owner"]);
            }}
            disabled={readOnly}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent>
              {ownerOptions.length === 0 ? (
                <SelectItem value="__none__">No active users</SelectItem>
              ) : (
                ownerOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Status</p>
          <Select
            value={task.status}
            onValueChange={(val) => {
              if (!readOnly) onUpdateTaskField(task.id, "status", val as Task["status"]);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1">Timeline</p>
        {readOnly ? (
          <div className="text-sm">{task.timeline ? formatTimelineDisplay(task.timeline) : "N/A"}</div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 justify-start text-left w-full">
                {formatTimelineDisplay(task.timeline || "")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={selectedDateRange}
                onSelect={handleTimelineSelect}
                numberOfMonths={2}
                initialFocus
              />
              <div className="flex justify-end gap-2 p-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => handleTimelineSelect(undefined)}>
                  Clear
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1">Tags</p>
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
    </div>
  );
};

export default DrawerEditSection;