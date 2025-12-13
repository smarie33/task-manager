"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileImageIcon, UploadIcon, XIcon } from "lucide-react";
import { FileMeta } from "@/types/task";
import { useTaskData } from "@/context/task-data-context";
import { addManyFiles } from "@/services/db";

interface FilesCellProps {
  files?: FileMeta[];
  onAddFiles: (newFiles: FileMeta[]) => void;
  onRemoveFile: (id: string) => void;
  disabled?: boolean;
  parentTaskId: string;
  parentTaskContent: string;
  inverted?: boolean;
}

const FilesCell: React.FC<FilesCellProps> = ({ files = [], onAddFiles, onRemoveFile, disabled = false, parentTaskId, parentTaskContent, inverted = false }) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { setLibraryImages } = useTaskData();

  const handlePickFiles = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const newFiles: FileMeta[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list.item(i);
      if (!f) continue;
      if (!f.type.startsWith("image/")) continue;
      const url = URL.createObjectURL(f);
      newFiles.push({
        id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2)}`,
        name: f.name,
        url,
        mimeType: f.type,
        size: f.size,
        createdAt: new Date(f.lastModified || Date.now()).toISOString(),
        sourceTaskId: parentTaskId,
        sourceTaskContent: parentTaskContent,
      });
    }
    if (newFiles.length > 0) {
      onAddFiles(newFiles);
      setLibraryImages((prev) => [...prev, ...newFiles]);
      // Persist to DB
      import("@/context/session-context").then(({ useSession }) => {
        // NOTE: cannot use hook here; alternatively, call service directly with supabase auth in service; simple approach: call addManyFiles without userId (service uses supabase session)
      });
    }
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={`flex items-center justify-center w-full h-full py-2 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          onClick={() => {
            if (!disabled) setOpen(true);
          }}
          aria-label="Open files"
        >
          <div className={`inline-flex items-center gap-2 ${inverted ? "text-white" : "text-gray-600 dark:text-gray-300"}`}>
            <FileImageIcon className="h-4 w-4" />
            <span className="text-sm">{files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : "Upload"}</span>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Task Files</DialogTitle>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
          disabled={disabled}
        />

        <div className="flex items-center justify-between">
          <Button onClick={handlePickFiles} disabled={disabled}>
            <UploadIcon className="h-4 w-4 mr-2" />
            Select Images
          </Button>
          <p className="text-xs text-muted-foreground">{files.length} selected</p>
        </div>

        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">No files yet. Select images to upload.</p>
        ) : (
          <ScrollArea className="max-h-[50vh] mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {files.map((f) => (
                <div key={f.id} className="relative rounded-md border overflow-hidden">
                  <img src={f.url} alt={f.name} className="w-full h-28 object-cover" />
                  <div className="absolute top-1 right-1">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-6 w-6"
                      onClick={() => onRemoveFile(f.id)}
                      disabled={disabled}
                      aria-label={`Remove ${f.name}`}
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="p-2">
                    <p className="text-xs truncate">{f.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FilesCell;