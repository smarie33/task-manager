"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Mode = "delete" | "reassign";

interface GroupDeleteDialogProps {
  trigger: React.ReactNode;
  groupName: string;
  hasTasks: boolean;
  otherGroups: { id: string; name: string }[];
  onConfirm: (mode: Mode, targetGroupId?: string) => void;
}

const GroupDeleteDialog: React.FC<GroupDeleteDialogProps> = ({ trigger, groupName, hasTasks, otherGroups, onConfirm }) => {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>(hasTasks ? "reassign" : "delete");
  const [target, setTarget] = React.useState<string | undefined>(otherGroups[0]?.id);

  const canReassign = hasTasks && otherGroups.length > 0;

  const handleConfirm = () => {
    if (mode === "reassign") {
      if (!canReassign || !target) return;
      onConfirm("reassign", target);
    } else {
      onConfirm("delete");
    }
    setOpen(false);
  };

  React.useEffect(() => {
    if (!hasTasks) {
      setMode("delete");
    } else {
      setMode(otherGroups.length > 0 ? "reassign" : "delete");
    }
  }, [hasTasks, otherGroups.length]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{groupName}”</DialogTitle>
          <DialogDescription>
            {hasTasks
              ? "This group has tasks. Choose whether to move them to another group or delete them."
              : "This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={mode} onValueChange={(val) => setMode(val as Mode)} className="grid gap-3">
            <div className="flex items-start gap-2">
              <RadioGroupItem value="delete" id="delete" />
              <Label htmlFor="delete" className="cursor-pointer">
                Delete group{hasTasks ? " and all its tasks" : ""}
              </Label>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="reassign" id="reassign" disabled={!canReassign} />
              <div className={canReassign ? "" : "opacity-50"}>
                <Label htmlFor="reassign" className="cursor-pointer">Move tasks to another group</Label>
                <div className="mt-2">
                  <Select
                    value={target}
                    onValueChange={(val) => setTarget(val)}
                    disabled={!canReassign || mode !== "reassign"}
                  >
                    <SelectTrigger className="w-[260px]">
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupDeleteDialog;