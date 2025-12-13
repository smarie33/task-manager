"use client";

import React from "react";
import { useTaskData } from "@/context/task-data-context";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FileIcon, LinkIcon, UploadIcon } from "lucide-react";
import { FileMeta } from "@/types/task";
import { v4 as uuidv4 } from "uuid";
import { showSuccess, showError } from "@/utils/toast";
import { addManyFiles, addExternalLink } from "@/services/db";
import { useSession } from "@/context/session-context";

const Files: React.FC = () => {
  const { groups, libraryFiles, setLibraryFiles, externalLinks, setExternalLinks } = useTaskData();
  const { session } = useSession();

  // Gather any non-image files from tasks (future-proof; currently FilesCell adds images only)
  const taskNonImageFiles = React.useMemo<FileMeta[]>(() => {
    return groups.flatMap((g) =>
      g.tasks.flatMap((t) => (t.files ?? []).filter((f) => !(f.mimeType ?? "").startsWith("image/")))
    );
  }, [groups]);

  // Combine global library files with any task non-images
  const nonImageFiles = React.useMemo<FileMeta[]>(() => {
    return [...libraryFiles, ...taskNonImageFiles];
  }, [libraryFiles, taskNonImageFiles]);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [newLinkUrl, setNewLinkUrl] = React.useState("");
  const [newLinkLabel, setNewLinkLabel] = React.useState("");

  // New: active task filter
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const getTaskNameById = React.useCallback(
    (id: string | null) => {
      if (!id) return null;
      for (const g of groups) {
        const t = g.tasks.find((tt) => tt.id === id);
        if (t) return t.content;
      }
      return null;
    },
    [groups]
  );
  const filteredFiles = React.useMemo(() => {
    if (!selectedTaskId) return nonImageFiles;
    return nonImageFiles.filter((f) => f.sourceTaskId === selectedTaskId);
  }, [nonImageFiles, selectedTaskId]);

  const pickFiles = () => fileInputRef.current?.click();

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const added: FileMeta[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list.item(i);
      if (!f) continue;
      // Skip images; only add non-image files to the Files page library
      if ((f.type ?? "").startsWith("image/")) continue;
      const url = URL.createObjectURL(f);
      added.push({
        id: uuidv4(),
        name: f.name,
        url,
        mimeType: f.type,
        size: f.size,
      });
    }

    if (added.length > 0) {
      setLibraryFiles((prev) => [...prev, ...added]);
      if (session?.user) {
        addManyFiles(session.user.id, added).catch(() => {});
      }
      showSuccess(`${added.length} file${added.length > 1 ? "s" : ""} uploaded`);
    } else {
      showError("Please select non-image files");
    }

    e.target.value = "";
  };

  const handleAddLink = () => {
    const url = newLinkUrl.trim();
    const label = newLinkLabel.trim();
    if (!url) {
      showError("URL is required");
      return;
    }
    const isValid = /^https?:\/\/.+/i.test(url);
    if (!isValid) {
      showError("Please enter a valid http(s) URL");
      return;
    }
    setExternalLinks((prev) => [...prev, { id: uuidv4(), url, label }]);
    if (session?.user) {
      addExternalLink(session.user.id, { id: "", url, label }).catch(() => {});
    }
    setNewLinkUrl("");
    setNewLinkLabel("");
    showSuccess("Link added");
  };

  // Existing tasks with hasFiles for legacy display
  const tasksWithFiles = React.useMemo(() => {
    return groups.flatMap((g) =>
      g.tasks
        .filter((t) => t.hasFiles)
        .map((t) => ({ task: t, groupName: g.name, groupColor: g.color }))
    );
  }, [groups]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">Files</h1>

        {/* Uploader for non-image files */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <Button onClick={pickFiles} className="w-full sm:w-auto">
            <UploadIcon className="h-4 w-4 mr-2" />
            Upload non-image files
          </Button>

          <div className="flex-1" />

          {/* Add external link */}
          <div className="flex w-full sm:w-auto gap-2">
            <Input
              placeholder="https://example.com/resource"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Label (optional)"
              value={newLinkLabel}
              onChange={(e) => setNewLinkLabel(e.target.value)}
              className="w-40"
            />
            <Button onClick={handleAddLink}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Add Link
            </Button>
          </div>
        </div>

        {/* Non-image files list */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Files (non-images)
              {selectedTaskId ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  filtered by "{getTaskNameById(selectedTaskId) ?? "Selected Task"}"
                </span>
              ) : null}
            </h2>
            {selectedTaskId ? (
              <Button variant="outline" size="sm" onClick={() => setSelectedTaskId(null)}>
                Clear filter
              </Button>
            ) : null}
          </div>
          {filteredFiles.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">No non-image files uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredFiles.map((f) => (
                <Card key={f.id} className="shadow-sm">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-gray-500" />
                      <span className="truncate">{f.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p>{f.mimeType || "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Size</p>
                        <p>{typeof f.size === "number" ? `${Math.round(f.size / 1024)} KB` : "N/A"}</p>
                      </div>
                      {f.sourceTaskId ? (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">From Task</p>
                          <p className="truncate">{f.sourceTaskContent || getTaskNameById(f.sourceTaskId) || "Unknown"}</p>
                        </div>
                      ) : null}
                      <div className="col-span-2">
                        <a
                          href={f.url}
                          download={f.name}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Download / Open
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* External Sources */}
        <Separator className="my-6" />
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">External Sources</h2>
          {externalLinks.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">No links added yet.</p>
          ) : (
            <div className="space-y-2">
              {externalLinks.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-md border p-3 bg-white dark:bg-gray-800">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {l.label || l.url}
                    </p>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      {l.url}
                    </a>
                  </div>
                  <LinkIcon className="h-4 w-4 text-gray-500 ml-3 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Existing task cards (unchanged) */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tasks with Files</h2>
        {tasksWithFiles.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">No tasks with files yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tasksWithFiles.map(({ task, groupName }, idx) => (
              <Card
                key={`${task.id}-${idx}`}
                className={`shadow-sm cursor-pointer ${selectedTaskId === task.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"}`}
                onClick={() => setSelectedTaskId(task.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedTaskId(task.id);
                }}
                title="Click to filter files by this task"
              >
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">{task.content}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground">Owner</p>
                      <p>{task.owner || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Group</p>
                      <p>{groupName}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Tags</p>
                      <p>{task.tags.length ? task.tags.join(", ") : "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Files;