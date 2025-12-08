"use client";

import React, { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { XIcon, PlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TagsCellProps {
  taskTags: string[];
  allTags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onDeleteGlobalTag: (tag: string) => void;
  disabled?: boolean;
}

const TagsCell: React.FC<TagsCellProps> = ({ taskTags, allTags, onAddTag, onRemoveTag, onDeleteGlobalTag, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const navigate = useNavigate();

  const handleAddNewTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    onAddTag(tag);
    setNewTag("");
  };

  const sortedAll = Array.from(new Set(allTags)).sort();

  if (disabled) {
    return (
      <div className="text-sm truncate block px-2 py-2">
        {taskTags.length ? taskTags.join(", ") : "N/A"}
      </div>
    );
  }

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
                  <Button
                    key={tag}
                    variant="secondary"
                    size="sm"
                    className="h-7 rounded-full px-2 flex items-center gap-1"
                    onClick={() => onRemoveTag(tag)}
                    aria-label={`Remove ${tag}`}
                  >
                    <span
                      className="text-xs underline decoration-dotted hover:decoration-solid"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/tags/${encodeURIComponent(tag)}`);
                      }}
                    >
                      {tag}
                    </span>
                    <XIcon className="h-3 w-3 ml-1" />
                  </Button>
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
                      className="h-8 rounded-md px-2 flex items-center gap-1"
                      onClick={() => (hasTag ? onRemoveTag(tag) : onAddTag(tag))}
                      aria-label={hasTag ? `Remove ${tag}` : `Add ${tag}`}
                    >
                      {!hasTag ? (
                        <>
                          <PlusIcon className="h-3 w-3 mr-1" />
                          <span
                            className="text-xs underline decoration-dotted hover:decoration-solid"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tags/${encodeURIComponent(tag)}`);
                            }}
                          >
                            {tag}
                          </span>
                          <span
                            className="ml-1 inline-flex items-center justify-center rounded-full hover:bg-muted px-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteGlobalTag(tag);
                            }}
                            aria-label={`Delete ${tag} globally`}
                            role="button"
                          >
                            <XIcon className="h-3 w-3" />
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className="text-xs underline decoration-dotted hover:decoration-solid"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tags/${encodeURIComponent(tag)}`);
                            }}
                          >
                            {tag}
                          </span>
                          <XIcon className="h-3 w-3 ml-1" />
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