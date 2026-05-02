"use client";

import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseCSV, getCellByHeader, splitList } from "@/utils/csv";
import type { Task, TaskGroupData, StatusOption } from "@/types/task";
import { bulkCreateTasks, addStatus } from "@/services/db";
import { showError, showSuccess } from "@/utils/toast";
import { formatTaskOwners } from "@/lib/task-owners";

type Props = {
  userId: string | null;
  groups: TaskGroupData[];
  availableStatuses: StatusOption[];
  setAvailableStatuses: React.Dispatch<React.SetStateAction<StatusOption[]>>;
  onTasksImported: (groupId: string, tasks: Task[]) => void;
  disabled?: boolean;
};

const NONE = "__none__";

function buildTimeline(start: string, end: string) {
  const s = (start ?? "").trim();
  const e = (end ?? "").trim();
  if (!s && !e) return "";
  if (s && e && s !== e) return `${s} - ${e}`;
  return s || e;
}

const TaskCsvImportDialog: React.FC<Props> = ({
  userId,
  groups,
  availableStatuses,
  setAvailableStatuses,
  onTasksImported,
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const [fileName, setFileName] = React.useState<string>("");
  const [csvText, setCsvText] = React.useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>("");
  const [isImporting, setIsImporting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setSelectedGroupId((prev) => prev || groups[0]?.id || "");
  }, [open, groups]);

  const parsed = React.useMemo(() => {
    if (!csvText) return null;
    try {
      return parseCSV(csvText);
    } catch {
      return null;
    }
  }, [csvText]);

  const rowCount = parsed?.rows?.length ?? 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
  };

  const handleImport = async () => {
    if (disabled) return;
    if (!userId) {
      showError("You must be signed in to import");
      return;
    }
    if (!parsed) {
      showError("Please upload a valid CSV");
      return;
    }
    if (!selectedGroupId) {
      showError("Please choose a group");
      return;
    }

    // Required mapping (as requested):
    // Name -> Item(content), Owner -> Owner, Status -> Status,
    // Timeline - Start -> Timeline first date, Timeline - End -> Timeline second date,
    // Tags -> Tags, Notes -> Notes (WYSIWYG)

    const tasksToCreate: Omit<Task, "id">[] = parsed.rows
      .map((row) => {
        const name = getCellByHeader(parsed.headers, row, "Name");
        if (!name) return null;
        const owner = getCellByHeader(parsed.headers, row, "Owner");
        const status = getCellByHeader(parsed.headers, row, "Status") || "No Status";
        const start = getCellByHeader(parsed.headers, row, "Timeline - Start");
        const end = getCellByHeader(parsed.headers, row, "Timeline - End");
        const tags = splitList(getCellByHeader(parsed.headers, row, "Tags"));
        const notes = getCellByHeader(parsed.headers, row, "Notes");

        return {
          content: name,
          owner: formatTaskOwners(owner),
          status,
          timeline: buildTimeline(start, end),
          timeTracking: 0,
          tags,
          hasFiles: false,
          timeLogs: [],
          comments: [],
          files: [],
          notes,
        } as Omit<Task, "id">;
      })
      .filter(Boolean) as Omit<Task, "id">[];

    if (tasksToCreate.length === 0) {
      showError("No tasks found (make sure the CSV has a 'Name' column)");
      return;
    }

    // Ensure any new statuses exist locally (and attempt to persist)
    const incomingStatusNames = Array.from(
      new Set(tasksToCreate.map((t) => t.status).filter((s) => !!s && s.trim().length > 0))
    );
    const existing = new Set(availableStatuses.map((s) => s.name));
    const newOnes = incomingStatusNames.filter((s) => !existing.has(s));

    if (newOnes.length > 0) {
      setAvailableStatuses((prev) => [...prev, ...newOnes.map((name) => ({ name, color: "#6b7280" }))]);
      // Best-effort DB persistence
      await Promise.all(
        newOnes.map(async (name) => {
          try {
            await addStatus(userId, { name, color: "#6b7280" });
          } catch {
            // ignore
          }
        })
      );
    }

    setIsImporting(true);
    try {
      const created = await bulkCreateTasks(userId, selectedGroupId, tasksToCreate);
      onTasksImported(selectedGroupId, created);
      showSuccess(`Imported ${created.length} tasks`);
      setOpen(false);
      setFileName("");
      setCsvText("");
    } catch {
      showError("Failed to import tasks");
    } finally {
      setIsImporting(false);
    }
  };

  const groupOptions = groups.map((g) => ({ id: g.id, name: g.name }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import tasks from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tasksCsv">CSV file</Label>
            <Input id="tasksCsv" type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={disabled} />
            <p className="text-xs text-muted-foreground">
              {fileName ? `Selected: ${fileName}` : "Upload a .csv file"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Import into group</Label>
            <Select
              value={selectedGroupId || NONE}
              onValueChange={(v) => setSelectedGroupId(v === NONE ? "" : v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Choose…</SelectItem>
                {groupOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border p-3 text-sm">
            <div className="font-medium mb-1">Column mapping</div>
            <ul className="text-muted-foreground space-y-1">
              <li>
                <span className="text-foreground">Name</span> → Item
              </li>
              <li>
                <span className="text-foreground">Owner</span> → Owner
              </li>
              <li>
                <span className="text-foreground">Status</span> → Status
              </li>
              <li>
                <span className="text-foreground">Timeline - Start</span> → Timeline (first date)
              </li>
              <li>
                <span className="text-foreground">Timeline - End</span> → Timeline (second date)
              </li>
              <li>
                <span className="text-foreground">Tags</span> → Tags
              </li>
              <li>
                <span className="text-foreground">Notes</span> → Notes (WYSIWYG)
              </li>
            </ul>
          </div>

          <div className="text-sm text-muted-foreground">
            {parsed ? `${rowCount} rows detected.` : "Upload a CSV to detect rows."}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleImport} disabled={disabled || isImporting || !parsed || !selectedGroupId}>
            {isImporting ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskCsvImportDialog;