"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { joinTaskOwners, splitTaskOwners } from "@/lib/task-owners";

type OwnerCellProps = {
  value?: string;
  owners: string[];
  onChange: (owner: string) => void;
  disabled?: boolean;
};

const OwnerCell: React.FC<OwnerCellProps> = ({ value = "", owners, onChange, disabled = false }) => {
  const selectedOwners = React.useMemo(() => splitTaskOwners(value), [value]);

  const handleToggleOwner = (owner: string, checked: boolean) => {
    const nextOwners = checked
      ? [...selectedOwners, owner]
      : selectedOwners.filter((currentOwner) => currentOwner !== owner);
    onChange(joinTaskOwners(nextOwners));
  };

  return (
    <div className="px-2 py-1">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex min-h-7 w-full flex-wrap items-center gap-1 rounded-sm px-0.5 py-0.5 text-left transition-colors hover:bg-muted/60 disabled:cursor-default disabled:hover:bg-transparent"
            disabled={disabled}
          >
            {selectedOwners.length > 0 ? (
              selectedOwners.map((owner) => (
                <Badge
                  key={owner}
                  variant="secondary"
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {owner}
                </Badge>
              ))
            ) : (
              <Badge
                variant="outline"
                className="rounded-full border-dashed px-2 py-0.5 text-xs font-normal text-muted-foreground"
              >
                Select owners
              </Badge>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-2">
            {owners.length === 0 ? (
              <div className="text-sm text-muted-foreground">No active users</div>
            ) : (
              owners.map((owner) => {
                const checked = selectedOwners.includes(owner);
                return (
                  <label key={owner} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => handleToggleOwner(owner, value === true)}
                      disabled={disabled}
                    />
                    <span>{owner}</span>
                  </label>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default OwnerCell;