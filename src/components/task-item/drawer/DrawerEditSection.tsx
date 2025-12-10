"use client";

import React from "react";
import { Task, StatusOption } from "@/types/task";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid } from "date-fns";
import type { DateRange } from "react-day-picker";
import TagsCell from "@/components/task-item/TagsCell";

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
  const [editedContent, setEditedContent] = React.useState(task.content || "");

  React.useEffect(() => setEditedOwner(task.owner || ""), [task.owner]);
  React.useEffect(() => setEditedContent(task.content || ""), [task.content]);

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
          <Input
            value={editedOwner}
            onChange={(e) => setEditedOwner(e.target.value)}
            onBlur={() => {
              if (!readOnly && editedOwner !== task.owner) {
                onUpdateTaskField(task.id, "owner", editedOwner as Task["owner"]);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (!readOnly && editedOwner !== task.owner) {
                  onUpdateTaskField(task.id, "owner", editedOwner as Task["owner"]);
                }
              }
            }}
            disabled={readOnly}
            className="h-9"
            placeholder="Owner name"
          />
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
          <div className="text-sm">{task.timeline || "N/A"}</div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 justify-start text-left w-full">
                {task.timeline ? task.timeline : "Select date or range"}
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

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Item</p>
        <Input
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          placeholder="Enter item text..."
          disabled={readOnly}
        />
        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (editedContent !== task.content) {
                onUpdateTaskField(task.id, "content", editedContent as Task["content"]);
              }
            }}
            disabled={readOnly}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DrawerEditSection;