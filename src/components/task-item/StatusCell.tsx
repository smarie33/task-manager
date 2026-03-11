"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Trash2Icon, PlusIcon, PaletteIcon } from "lucide-react";
import { StatusOption } from "@/types/task";
import { useSession } from "@/context/session-context";
import { addStatus, updateStatus } from "@/services/db";

type StatusCellProps = {
  status: string;
  availableStatuses: StatusOption[];
  setAvailableStatuses: React.Dispatch<React.SetStateAction<StatusOption[]>>;
  onChange: (statusName: string) => void;
  disabled?: boolean;
};

const StatusCell: React.FC<StatusCellProps> = ({
  status,
  availableStatuses,
  setAvailableStatuses,
  onChange,
  disabled = false,
}) => {
  const { session } = useSession();

  const currentStatusOption = availableStatuses.find((s) => s.name === status);
  const statusColor = currentStatusOption ? currentStatusOption.color : "#6b7280";

  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#60a5fa");

  const persistStatusColor = async (name: string, color: string) => {
    const userId = session?.user?.id;
    if (!userId) return;
    try {
      await updateStatus(userId, name, color);
    } catch {
      // Best-effort persistence; UI still updates locally.
    }
  };

  const handleAddStatus = async () => {
    const userId = session?.user?.id;
    const name = newStatusName.trim();
    if (name && !availableStatuses.some((s) => s.name === name)) {
      setAvailableStatuses((prev) => [...prev, { name, color: newStatusColor }]);
      setNewStatusName("");
      setNewStatusColor("#60a5fa");

      // Best-effort DB persistence
      if (userId) {
        try {
          await addStatus(userId, { name, color: newStatusColor });
        } catch {
          // ignore
        }
      }
    }
  };

  const handleDeleteStatus = (statusName: string) => {
    setAvailableStatuses((prev) => prev.filter((s) => s.name !== statusName));
  };

  return (
    <Popover open={statusPopoverOpen && !disabled} onOpenChange={(open) => setStatusPopoverOpen(disabled ? false : open)}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full text-sm px-2 py-2 justify-center rounded-none h-auto min-h-0 font-bold text-white hover:text-white hover:opacity-90"
          style={{ backgroundColor: statusColor, color: "#fff" }}
          disabled={disabled}
        >
          <span className="flex items-center gap-2">{status || "Set status"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {availableStatuses.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-2 border rounded-none px-2 py-1"
              style={{
                backgroundColor: s.color,
                borderColor: s.color,
                color: "#fff",
              }}
            >
              {!disabled ? (
                <span className="inline-flex items-center gap-1">
                  {/* Use native input here (more reliable inside clickable containers) */}
                  <input
                    type="color"
                    value={s.color}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onChange={(e) => {
                      const next = e.target.value;
                      setAvailableStatuses((prev) => prev.map((x) => (x.name === s.name ? { ...x, color: next } : x)));
                      persistStatusColor(s.name, next);
                    }}
                    className="h-6 w-6 p-0 border-0 bg-transparent cursor-pointer"
                    title={`Change color for ${s.name}`}
                  />
                  <PaletteIcon className="h-3.5 w-3.5 opacity-70" />
                </span>
              ) : null}

              <button
                type="button"
                className="flex-1 text-center truncate text-xs font-bold"
                onClick={() => {
                  onChange(s.name);
                  setStatusPopoverOpen(false);
                }}
                disabled={disabled}
              >
                {s.name}
              </button>

              {!["done", "in progress"].includes(s.name.toLowerCase()) && (
                <button
                  type="button"
                  aria-label={`Delete status ${s.name}`}
                  className="ml-1 text-destructive hover:text-destructive/90"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!disabled) handleDeleteStatus(s.name);
                  }}
                  disabled={disabled}
                >
                  <Trash2Icon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 p-2 border-t pt-4">
          <h4 className="text-sm font-semibold">Add New Status</h4>
          <Input
            type="text"
            placeholder="New status name..."
            value={newStatusName}
            onChange={(e) => setNewStatusName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddStatus();
            }}
            className="w-full"
            disabled={disabled}
          />
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={newStatusColor}
              onChange={(e) => setNewStatusColor(e.target.value)}
              className="w-10 h-10 p-0 border-none cursor-pointer disabled:cursor-not-allowed"
              title="Choose status color"
              disabled={disabled}
            />
            <Button onClick={handleAddStatus} className="flex-grow" disabled={disabled}>
              <PlusIcon className="h-4 w-4 mr-2" /> Add Status
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default StatusCell;