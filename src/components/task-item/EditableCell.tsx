"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { darkenHexColor } from "@/lib/utils";
import { Task } from "@/types/task";

type EditableCellProps = {
  fieldKey: keyof Task;
  value?: string;
  onSave: (newValue: string) => void;
  groupColor?: string;
  editingField: keyof Task | null;
  setEditingField: (key: keyof Task | null) => void;
  readOnly?: boolean;
};

const EditableCell: React.FC<EditableCellProps> = ({
  fieldKey,
  value = "",
  onSave,
  groupColor = "#6b7280",
  editingField,
  setEditingField,
  readOnly = false,
}) => {
  const [local, setLocal] = React.useState<string>(value || "");

  React.useEffect(() => {
    setLocal(value || "");
  }, [value]);

  const isEditing = editingField === fieldKey;

  if (readOnly) {
    return <span className="text-sm truncate block px-2 py-2">{value || "N/A"}</span>;
  }

  return isEditing ? (
    <Input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== (value || "")) {
          onSave(local);
        }
        setEditingField(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (local !== (value || "")) {
            onSave(local);
          }
          setEditingField(null);
        } else if (e.key === "Escape") {
          setLocal(value || "");
          setEditingField(null);
        }
      }}
      className="h-7 text-sm p-1 px-2 rounded-none border-2"
      autoFocus
      type="text"
      style={{
        borderColor: darkenHexColor(groupColor, 0.5),
        boxShadow: `inset 0 0 0 1px ${groupColor}`,
      }}
    />
  ) : (
    <span
      className="text-sm truncate block px-2 py-2 cursor-pointer"
      onClick={() => setEditingField(fieldKey)}
    >
      {value || "N/A"}
    </span>
  );
};

export default EditableCell;