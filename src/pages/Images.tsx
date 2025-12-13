"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import AppDrawer from "@/components/AppDrawer";
import { useTaskData } from "@/context/task-data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, ExternalLinkIcon, UploadIcon, XIcon, FilterIcon } from "lucide-react";
import { FileMeta, TaskGroupData } from "@/types/task";
import { useToast } from "@/components/ui/use-toast";
import { addManyFiles } from "@/services/db";
import { useSession } from "@/context/session-context";

type SortKey = "name" | "date" | "type";
type SortOrder = "asc" | "desc";

const UNASSIGNED = "__unassigned__";

const flattenTasks = (groups: TaskGroupData[]) =>
  groups.flatMap((g) => g.tasks.map((t) => ({ id: t.id, content: t.content })));

const Images: React.FC = () => {
  const { toast } = useToast();
  const { libraryImages, setLibraryImages, groups } = useTaskData();
  const { session } = useSession();

  // All tasks for assignment/filtering
  const allTasks = React.useMemo(() => flattenTasks(groups), [groups]);

  // Only image files from library
  const images = React.useMemo<FileMeta[]>(() => {
    return libraryImages.filter((f) => (f.mimeType ?? "").startsWith("image/"));
  }, [libraryImages]);

  // Counts per task for chips
  const taskCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    let unassigned = 0;
    for (const f of images) {
      if (f.sourceTaskId) {
        map.set(f.sourceTaskId, (map.get(f.sourceTaskId) ?? 0) + 1);
      } else {
        unassigned += 1;
      }
    }
    return { map, unassigned };
  }, [images]);

  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc");
  const [selected, setSelected] = React.useState<FileMeta | null>(null);
  const [selectedTaskFilter, setSelectedTaskFilter] = React.useState<string | null>(null);

  // Upload form state
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [assignTaskId, setAssignTaskId] = React.useState<string | null>(null);

  const handlePickFiles = () => fileInputRef.current?.click();

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const chosenTaskId = assignTaskId && assignTaskId !== UNASSIGNED ? assignTaskId : undefined;
    const chosenTaskContent = chosenTaskId
      ? allTasks.find((t) => t.id === chosenTaskId)?.content
      : undefined;

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
        sourceTaskId: chosenTaskId,
        sourceTaskContent: chosenTaskContent,
      });
    }

    if (newFiles.length > 0) {
      setLibraryImages((prev) => [...prev, ...newFiles]);
      // Persist
      if (session?.user) {
        addManyFiles(session.user.id, newFiles).catch(() => {});
      }
      toast({
        title: "Upload complete",
        description: `${newFiles.length} image${newFiles.length > 1 ? "s" : ""} added${chosenTaskId ? " to task" : ""}.`,
      });
      // If we assigned to a task, automatically filter to that task for convenience
      if (chosenTaskId) setSelectedTaskFilter(chosenTaskId);
    }

    e.target.value = "";
  };

  // Derived filtered/sorted images
  const filteredSorted = React.useMemo<FileMeta[]>(() => {
    const q = query.trim().toLowerCase();

    let list = images.filter((file) => (q ? file.name.toLowerCase().includes(q) : true));

    if (selectedTaskFilter) {
      if (selectedTaskFilter === UNASSIGNED) {
        list = list.filter((f) => !f.sourceTaskId);
      } else {
        list = list.filter((f) => f.sourceTaskId === selectedTaskFilter);
      }
    }

    const compareStr = (a?: string, b?: string) => (a ?? "").localeCompare(b ?? "");
    const compareDate = (a?: string, b?: string) => {
      const ta = a ? Date.parse(a) : 0;
      const tb = b ? Date.parse(b) : 0;
      return ta - tb;
    };

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = compareStr(a.name, b.name);
      } else if (sortKey === "type") {
        cmp = compareStr(a.mimeType, b.mimeType);
      } else {
        cmp = compareDate(a.createdAt, b.createdAt);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return list;
  }, [images, query, sortKey, sortOrder, selectedTaskFilter]);

  const clearFilter = () => setSelectedTaskFilter(null);

  // Helper for task content lookup
  const taskNameById = React.useCallback(
    (id?: string) => (id ? allTasks.find((t) => t.id === id)?.content : undefined),
    [allTasks]
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <AppHeader />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Images</h1>
            </div>

            {/* Upload controls */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Select
                value={assignTaskId ?? UNASSIGNED}
                onValueChange={(v) => setAssignTaskId(v === UNASSIGNED ? null : v)}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Assign to task (optional)" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {allTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.content}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button onClick={handlePickFiles}>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Upload Images
                </Button>
                {selectedTaskFilter && (
                  <Button variant="outline" onClick={clearFilter} title="Clear task filter">
                    <XIcon className="h-4 w-4 mr-2" />
                    Clear Filter
                  </Button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
              />
            </div>
          </div>

          {/* Task chips with counts */}
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                <FilterIcon className="h-4 w-4" />
                <span>Tasks with images</span>
              </div>

              {taskCounts.unassigned > 0 && (
                <Badge
                  variant={selectedTaskFilter === UNASSIGNED ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setSelectedTaskFilter(UNASSIGNED)}
                >
                  Unassigned ({taskCounts.unassigned})
                </Badge>
              )}

              {Array.from(taskCounts.map.entries())
                .map(([taskId, count]) => {
                  const name = taskNameById(taskId) ?? "Unknown task";
                  return (
                    <Badge
                      key={taskId}
                      variant={selectedTaskFilter === taskId ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => setSelectedTaskFilter(taskId)}
                      title={name}
                    >
                      {name} ({count})
                    </Badge>
                  );
                })}
              {taskCounts.map.size === 0 && taskCounts.unassigned === 0 && (
                <span className="text-sm text-muted-foreground">No images yet.</span>
              )}
            </div>
          </Card>

          {/* Search / Sort controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Input
              placeholder="Search by image name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:w-64"
            />
            <div className="flex gap-2">
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Asc</SelectItem>
                  <SelectItem value="desc">Desc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {filteredSorted.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No images found
            {query ? ` for "${query}"` : ""}
            {selectedTaskFilter
              ? selectedTaskFilter === UNASSIGNED
                ? " in Unassigned"
                : " for selected task"
              : ""}.
            You can upload images using the button above.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSorted.map((file) => (
              <Card key={file.id} className="shadow-sm overflow-hidden">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base truncate">{file.name}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div
                    className="rounded-md border overflow-hidden mb-3 bg-white dark:bg-gray-800 cursor-zoom-in hover:ring-2 hover:ring-primary/50"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(file)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelected(file);
                    }}
                    aria-label={`Open details for ${file.name}`}
                  >
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-48 object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="break-all">{file.mimeType || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p>{file.createdAt ? new Date(file.createdAt).toLocaleString() : "Unknown"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">From Task</p>
                      {file.sourceTaskId ? (
                        <button
                          className="truncate text-blue-600 hover:underline dark:text-blue-400"
                          onClick={() => setSelectedTaskFilter(file.sourceTaskId!)}
                          title="Filter by this task"
                        >
                          {file.sourceTaskContent ?? "Unknown"}
                        </button>
                      ) : (
                        <span className="truncate">Unassigned</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button asChild variant="outline">
                      <a href={file.url} target="_blank" rel="noreferrer">
                        <ExternalLinkIcon className="h-4 w-4 mr-2" />
                        Open
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AppDrawer
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          title="Image Details"
        >
          {selected && (
            <div className="space-y-4">
              <div className="rounded-md border overflow-hidden bg-white dark:bg-gray-800">
                <img
                  src={selected.url}
                  alt={selected.name}
                  className="w-full max-h-[60vh] object-contain bg-black/5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="break-all">{selected.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="break-all">{selected.mimeType || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date Uploaded</p>
                  <p>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Task</p>
                  {selected.sourceTaskId ? (
                    <button
                      className="truncate text-blue-600 hover:underline dark:text-blue-400"
                      onClick={() => setSelectedTaskFilter(selected.sourceTaskId!)}
                      title="Filter by this task"
                    >
                      {selected.sourceTaskContent ?? "Unknown"}
                    </button>
                  ) : (
                    <span className="truncate">Unassigned</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button asChild variant="outline">
                  <a href={selected.url} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon className="h-4 w-4 mr-2" />
                    Open Original
                  </a>
                </Button>
              </div>
            </div>
          )}
        </AppDrawer>
      </div>
    </div>
  );
};

export default Images;