"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { formatTaskOwners, joinTaskOwners, splitTaskOwners } from "@/lib/task-owners";

type OwnerCellProps = {
  value?: string;
  owners: string[];
  onChange: (owner: string) => void;
  disabled?: boolean;
};

const OwnerCell: React.FC<OwnerCellProps> = ({ value = "", owners, onChange, disabled = false }) => {
  const selectedOwners = React.useMemo(() => splitTaskOwners(value), [value]);
  const buttonLabel = selectedOwners.length > 0 ? formatTaskOwners(value) : "Select owners";

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
          <Button
            type="button"
            variant="outline"
            className="h-7 w-full justify-between rounded-none px-2 text-left font-normal"
            disabled={disabled}
          >
            <span className="truncate">{buttonLabel}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
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

            {selectedOwners.length > 0 ? (
              <div className="flex flex-wrap gap-1 border-t pt-3">
                {selectedOwners.map((owner) => (
                  <Badge key={owner} variant="secondary">
                    {owner}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default OwnerCell;
