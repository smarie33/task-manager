"use client";

import React, { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { XIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagsCellProps {
  taskTags: string[];
  allTags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

const TagsCell: React.FC<TagsCellProps> = ({ taskTags, allTags, onAddTag, onRemoveTag }) => {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState("");

  const handleAddNewTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    onAddTag(tag);
    setNewTag("");
  };

  const sortedAll = Array.from(new Set(allTags)).sort();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="text-sm truncate cursor-pointer block px-2 py-2">
          {taskTags.length ? taskTags.join(", ") : "N/A"}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Current tags</p>
            {taskTags.length ? (
              <div className="flex flex-wrap gap-2">
                {taskTags.map((tag) => (
                  <div key={tag} className="flex items-center gap-1">
                    <Badge variant="secondary">{tag}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      aria-label={`Remove ${tag}`}
                      onClick={() => onRemoveTag(tag)}
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags.</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">All tags</p>
            {sortedAll.length ? (
              <div className="flex flex-wrap gap-2">
                {sortedAll.map((tag) => {
                  const hasTag = taskTags.includes(tag);
                  return (
                    <Button
                      key={tag}
                      variant={hasTag ? "secondary" : "outline"}
                      size="sm"
                      className={cn("h-7")}
                      disabled={hasTag}
                      onClick={() => onAddTag(tag)}
                    >
                      {hasTag ? (
                        tag
                      ) : (
                        <>
                          <PlusIcon className="h-3 w-3 mr-1" />
                          {tag}
                        </>
                      )}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags in app yet.</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Add a new tag</p>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="e.g. urgent"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddNewTag();
                  }
                }}
              />
              <Button onClick={handleAddNewTag}>Add</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TagsCell;