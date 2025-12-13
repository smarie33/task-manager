"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OwnerSelectProps = {
  owners: string[];
  value: string | null;
  onChange: (owner: string) => void;
};

const OwnerSelect: React.FC<OwnerSelectProps> = ({ owners, value, onChange }) => {
  return (
    <div className="w-48 sm:w-56">
      <Select
        value={value ?? undefined}
        onValueChange={(val) => onChange(val)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a person" />
        </SelectTrigger>
        <SelectContent>
          {owners.length > 0 ? (
            owners.map((owner) => (
              <SelectItem key={owner} value={owner}>
                {owner}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-1 text-sm text-gray-500">No people found</div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default OwnerSelect;