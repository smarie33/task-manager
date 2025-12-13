"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type OwnerTask = { id: string; content: string };

type AddHoursFormProps = {
  ownerTasks: OwnerTask[];
  onSave: (taskId: string, date: string, seconds: number) => void;
  disabled?: boolean;
};

const AddHoursForm: React.FC<AddHoursFormProps> = ({ ownerTasks, onSave, disabled }) => {
  const [logTaskId, setLogTaskId] = React.useState<string>("");
  const [logDate, setLogDate] = React.useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [logHours, setLogHours] = React.useState<string>("0");
  const [logMinutes, setLogMinutes] = React.useState<string>("0");

  React.useEffect(() => {
    if (!logTaskId || !ownerTasks.find((t) => t.id === logTaskId)) {
      setLogTaskId(ownerTasks[0]?.id ?? "");
    }
  }, [ownerTasks, logTaskId]);

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Add Hours</div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <Label>Task</Label>
          <Select
            value={logTaskId || undefined}
            onValueChange={(val) => setLogTaskId(val)}
            disabled={ownerTasks.length === 0 || disabled}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={ownerTasks.length === 0 ? "No tasks available" : "Select task"} />
            </SelectTrigger>
            <SelectContent>
              {ownerTasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.content}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="log-date">Date</Label>
          <Input
            id="log-date"
            type="date"
            className="mt-1"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="log-hours">Hours</Label>
            <Input
              id="log-hours"
              type="number"
              min={0}
              step={1}
              className="mt-1"
              value={logHours}
              onChange={(e) => setLogHours(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="log-minutes">Minutes</Label>
            <Input
              id="log-minutes"
              type="number"
              min={0}
              max={59}
              step={1}
              className="mt-1"
              value={logMinutes}
              onChange={(e) => setLogMinutes(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (!logTaskId) return;
            const hoursNum = Math.max(0, parseInt(logHours || "0", 10));
            const minutesNum = Math.min(59, Math.max(0, parseInt(logMinutes || "0", 10)));
            const seconds = hoursNum * 3600 + minutesNum * 60;
            if (seconds <= 0) return;
            onSave(logTaskId, logDate, seconds);
            setLogHours("0");
            setLogMinutes("0");
          }}
          disabled={!logTaskId || ownerTasks.length === 0 || disabled}
        >
          Save Log
        </Button>
      </div>
    </div>
  );
};

export default AddHoursForm;