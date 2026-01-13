"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type PublishedSwitchProps = {
  checked: boolean;
  onChange: (val: boolean) => void;
};

const PublishedSwitch: React.FC<PublishedSwitchProps> = ({ checked, onChange }) => {
  return (
    <div className="flex items-center gap-3">
      <Switch checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <Label>Published</Label>
      <span className="text-xs text-muted-foreground">
        Turn off to save as draft (not visible on non-admin pages).
      </span>
    </div>
  );
};

export default PublishedSwitch;