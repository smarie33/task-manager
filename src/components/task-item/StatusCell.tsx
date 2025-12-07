"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Trash2Icon, PlusIcon } from "lucide-react";
import { StatusOption } from "@/types/task";
import { lightenHexColor } from "@/lib/utils";

type StatusCellProps = {
  status: string;
  availableStatuses: StatusOption[];
  setAvailableStatuses: React.Dispatch<React.SetStateAction<StatusOption[]>>;
  onChange: (statusName: string) => void;
};

const StatusCell: React.FC<StatusCellProps> = ({
  status,
  availableStatuses,
  setAvailableStatuses,
  onChange,
}) => {
  const currentStatusOption = availableStatuses.find((s) => s.name === status);
  const statusColor = currentStatusOption ? currentStatusOption.color : "#6b7280";

  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#60a5fa");

  const handleAddStatus = () => {
    const name = newStatusName.trim();
    if (name && !availableStatuses.some((s) => s.name === name)) {
      setAvailableStatuses((prev) => [...prev, { name, color: newStatusColor }]);
      setNewStatusName("");
      setNewStatusColor("#60a5fa");
    }
  };

  const handleDeleteStatus = (statusName: string) => {
    setAvailableStatuses((prev) => prev.filter((s) => s.name !== statusName));
  };

  return (
    <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full text-sm px-2 py-2 justify-center rounded-none h-auto min-h-0"
          style={{ backgroundColor: lightenHexColor(statusColor, 0.8), color: statusColor }}
        >
          <span className="flex items-center gap-2">{status}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {availableStatuses.map((s) => (
            <Button
              key={s.name}
              variant="outline"
              className="flex h-10 w-full items-center justify-between text-xs font-medium rounded-none py-1 px-2"
              style={{ backgroundColor: lightenHexColor(s.color, 0.8), color: s.color, borderColor: s.color }}
              onClick={() => {
                onChange(s.name);
                setStatusPopoverOpen(false);
              }}
            >
              <span className="flex-1 text-center">{s.name}</span>
              {!["done", "in progress"].includes(s.name.toLowerCase()) && (
                <span
                  role="button"
                  aria-label={`Delete status ${s.name}`}
                  className="ml-2 text-destructive hover:text-destructive/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteStatus(s.name);
                  }}
                >
                  <Trash2Icon className="h-4 w-4" />
                </span>
              )}
            </Button>
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
          />
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={newStatusColor}
              onChange={(e) => setNewStatusColor(e.target.value)}
              className="w-10 h-10 p-0 border-none cursor-pointer"
              title="Choose status color"
            />
            <Button onClick={handleAddStatus} className="flex-grow">
              <PlusIcon className="h-4 w-4 mr-2" /> Add Status
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default StatusCell;