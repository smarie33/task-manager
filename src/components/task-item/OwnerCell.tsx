"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OwnerCellProps = {
  value?: string; // current owner (string label)
  owners: string[]; // available owners to choose from (names/emails)
  onChange: (owner: string) => void;
  disabled?: boolean;
};

const NONE = "__none__";

const OwnerCell: React.FC<OwnerCellProps> = ({ value = "", owners, onChange, disabled = false }) => {
  const val = value && owners.includes(value) ? value : (value ? value : NONE);

  return (
    <div className="px-2 py-1">
      <Select
        value={val}
        onValueChange={(v) => onChange(v === NONE ? "" : v)}
        disabled={disabled}
      >
        <SelectTrigger className="h-7 rounded-none">
          <SelectValue placeholder="Select owner" />
        </SelectTrigger>
        <SelectContent className="rounded-none">
          <SelectItem value={NONE}>None</SelectItem>
          {owners.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default OwnerCell;