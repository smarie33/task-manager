"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import AppDrawer from "@/components/AppDrawer";
import { useTaskData } from "@/context/task-data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ImageIcon, ExternalLinkIcon, UploadIcon, XIcon, Trash2, StickyNote } from "lucide-react";
import { FileMeta, TaskGroupData } from "@/types/task";
import { useToast } from "@/components/ui/use-toast";
import { addManyFilesWithIds, deleteFileMeta, updateTaskRow } from "@/services/db";
import { useSession } from "@/context/session-context";
import { v4 as uuidv4 } from "uuid";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SortKey = "name" | "date" | "type";
type SortOrder = "asc" | "desc";

const UNASSIGNED = "__unassigned__";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const flattenTasks = (groups: TaskGroupData[]) =>
  groups.flatMap((g) => g.tasks.map((t) => ({ id: t.id, content: t.content })));

const hashString = (s: string) => {
  // Deterministic, lightweight hash (not cryptographic)
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
};

const isSafeImageSrc = (src: string) => {
  const s = src.trim();
  if (!s) return false;
  // Block javascript: and other dangerous protocols
  if (/^javascript:/i.test(s)) return false;
  // Allow common safe image sources
  if (/^data:image\//i.test(s)) return true;
  if (/^https?:\/\//i.test(s)) return true;
  if (/^blob:/i.test(s)) return true;
  return false;
};

const mimeFromSrc = (src: string) => {
  const m = src.match(/^data:([^;]+);/i);
  return m?.[1];
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });

const extractNoteImages = (groups: TaskGroupData[]): FileMeta[] => {
  const out: FileMeta[] = [];
  const parser = new DOMParser();

  for (const g of groups) {
    for (const t of g.tasks) {
      const html = String(t.notes ?? "").trim();
      if (!html || !/<img\b/i.test(html)) continue;

      const doc = parser.parseFromString(html, "text/html");
      const imgs = Array.from(doc.querySelectorAll("img"));

      imgs.forEach((img, idx) => {
        const src = img.getAttribute("src") ?? "";
        if (!isSafeImageSrc(src)) return;

        const alt = (img.getAttribute("alt") ?? "").trim();
        const name = alt || `Embedded image ${idx + 1}`;

        out.push({
          id: `noteimg-${t.id}-${idx}-${hashString(src)}`,
          name,
          url: src,
          mimeType: mimeFromSrc(src),
          sourceTaskId: t.id,
          sourceTaskContent: t.content,
        });
      });
    }
  }

  return out;
};

const Images: React.FC = () => {
  const { toast } = useToast();
  const { libraryImages, setLibraryImages, groups, setGroups } = useTaskData();
  const { session } = useSession();

  const libraryImageIdSet = React.useMemo(() => new Set(libraryImages.map((i) => i.id)), [libraryImages]);

  // All tasks for assignment/filtering
  const allTasks = React.useMemo(() => flattenTasks(groups), [groups]);

  // Images embedded inside task notes (WYSIWYG)
  const noteImages = React.useMemo(() => extractNoteImages(groups), [groups]);

  // Combine library images + note-embedded images (deduped)
  const images = React.useMemo<FileMeta[]>(() => {
    const all = [...libraryImages, ...noteImages].filter(
      (f) =>
        (f.mimeType ?? "").startsWith("image/") ||
        /^data:image\//i.test(f.url) ||
        /^https?:\/\//i.test(f.url) ||
        /^blob:/i.test(f.url)
    );

    const seen = new Set<string>();
    const deduped: FileMeta[] = [];
    for (const f of all) {
      const key = `${f.sourceTaskId ?? ""}|${f.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(f);
    }
    return deduped;
  }, [libraryImages, noteImages]);

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
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const [addToNotesOpen, setAddToNotesOpen] = React.useState(false);
  const [addToNotesImage, setAddToNotesImage] = React.useState<FileMeta | null>(null);
  const [addToNotesTaskId, setAddToNotesTaskId] = React.useState<string | undefined>(undefined);

  const appendImageToNotesHtml = React.useCallback((existingHtml: string, img: FileMeta) => {
    if (!isSafeImageSrc(img.url)) return existingHtml;

    const parser = new DOMParser();
    const base = existingHtml && existingHtml.trim() ? existingHtml : "<p><br /></p>";
    const doc = parser.parseFromString(base, "text/html");

    const figure = doc.createElement("figure");
    figure.className = "notes-inline-figure";

    const imageEl = doc.createElement("img");
    imageEl.className = "notes-inline-image";
    imageEl.src = img.url;
    imageEl.alt = (img.name || "Image").slice(0, 200);

    figure.appendChild(imageEl);

    const p = doc.createElement("p");
    p.appendChild(doc.createElement("br"));

    doc.body.appendChild(figure);
    doc.body.appendChild(p);

    return doc.body.innerHTML;
  }, []);

  const openAddToNotes = React.useCallback((img: FileMeta) => {
    setAddToNotesImage(img);
    setAddToNotesTaskId(img.sourceTaskId ?? undefined);
    setAddToNotesOpen(true);
  }, []);

  const handleAddImageToTaskNotes = React.useCallback(async () => {
    if (!addToNotesImage || !addToNotesTaskId) return;
    if (!isSafeImageSrc(addToNotesImage.url)) {
      toast({ title: "Can't insert image", description: "This image has an unsafe URL." });
      return;
    }

    const task = groups.flatMap((g) => g.tasks).find((t) => t.id === addToNotesTaskId);
    if (!task) {
      toast({ title: "Task not found" });
      return;
    }

    const nextNotes = appendImageToNotesHtml(String(task.notes ?? ""), addToNotesImage);

    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) => (t.id === addToNotesTaskId ? { ...t, notes: nextNotes } : t)),
      }))
    );

    try {
      await updateTaskRow(addToNotesTaskId, { notes: nextNotes });
      toast({ title: "Added to notes" });
    } catch {
      toast({ title: "Failed to update notes" });
    } finally {
      setAddToNotesOpen(false);
      setAddToNotesImage(null);
      setAddToNotesTaskId(undefined);
    }
  }, [addToNotesImage, addToNotesTaskId, appendImageToNotesHtml, groups, setGroups, toast]);

  // Upload form state
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handlePickFiles = () => fileInputRef.current?.click();

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const tooLarge = files.filter((f) => f.size > MAX_IMAGE_BYTES);
    const ok = files.filter((f) => f.size <= MAX_IMAGE_BYTES);

    if (tooLarge.length > 0) {
      toast({
        title: "Some images were skipped",
        description: `Please choose images smaller than 2MB. Skipped ${tooLarge.length}.`,
      });
    }

    if (ok.length === 0) {
      e.target.value = "";
      return;
    }

    const dataUrls = await Promise.all(ok.map((f) => fileToDataUrl(f)));

    // Images uploaded here are always unassigned
    const newFiles: FileMeta[] = ok.map((f, idx) => ({
      id: uuidv4(),
      name: f.name,
      url: dataUrls[idx],
      mimeType: f.type,
      size: f.size,
      createdAt: new Date(f.lastModified || Date.now()).toISOString(),
      sourceTaskId: undefined,
      sourceTaskContent: undefined,
    }));

    setLibraryImages((prev) => [...prev, ...newFiles]);

    if (session?.user) {
      addManyFilesWithIds(session.user.id, newFiles).catch(() => {});
    }

    toast({
      title: "Upload complete",
      description: `${newFiles.length} image${newFiles.length > 1 ? "s" : ""} added.`,
    });

    e.target.value = "";
  };

  const handleDeleteImage = async (img: FileMeta) => {
    setLibraryImages((prev) => prev.filter((x) => x.id !== img.id));
    if (selected?.id === img.id) setSelected(null);

    if (session?.user) {
      try {
        await deleteFileMeta(img.id);
      } catch {
        // If delete fails, reload from DB on next refresh/login
      }
    }

    toast({ title: "Image deleted" });
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

  const tasksWithImages = React.useMemo(() => {
    return Array.from(taskCounts.map.entries())
      .map(([taskId, count]) => ({
        taskId,
        count,
        name: taskNameById(taskId) ?? "Unknown task",
      }))
      .filter((x) => x.count > 0)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [taskCounts.map, taskNameById]);

  const selectedIsDeletable = !!selected && libraryImageIdSet.has(selected.id);

  const allTasksForSelect = React.useMemo(() => {
    return groups
      .flatMap((g) => g.tasks.map((t) => ({ id: t.id, label: `${t.content || "Untitled task"} — ${g.name}` })) )
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [groups]);

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

          {/* Search / Filter / Sort controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Input
              placeholder="Search by image name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:w-64"
            />

            <Select value={selectedTaskFilter ?? undefined} onValueChange={(v) => setSelectedTaskFilter(v)}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Filter by task" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={UNASSIGNED}>Unassigned ({taskCounts.unassigned})</SelectItem>
                {tasksWithImages.map((t) => (
                  <SelectItem key={t.taskId} value={t.taskId}>
                    {t.name} ({t.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
            {query ? ` for \"${query}\"` : ""}
            {selectedTaskFilter
              ? selectedTaskFilter === UNASSIGNED
                ? " in Unassigned"
                : " for selected task"
              : ""}.
            You can upload images using the button above.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSorted.map((file) => {
              const deletable = libraryImageIdSet.has(file.id);
              return (
                <Card key={file.id} className="shadow-sm overflow-hidden">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base truncate flex-1">{file.name}</CardTitle>
                      {deletable ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelected(file);
                            setDeleteOpen(true);
                          }}
                          aria-label={`Delete ${file.name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
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
                    <div className="flex justify-end mt-3 gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => openAddToNotes(file)}
                        title="Add this image to a task's notes"
                      >
                        <StickyNote className="h-4 w-4 mr-2" />
                        Add to Notes
                      </Button>
                      <Button asChild variant="outline">
                        <a href={file.url} target="_blank" rel="noreferrer">
                          <ExternalLinkIcon className="h-4 w-4 mr-2" />
                          Open
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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

              {!selectedIsDeletable ? (
                <p className="text-xs text-muted-foreground">
                  This image is embedded in task notes. To remove it, edit the task's notes.
                </p>
              ) : null}

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

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => openAddToNotes(selected)}>
                  <StickyNote className="h-4 w-4 mr-2" />
                  Add to Notes
                </Button>
                {selectedIsDeletable ? (
                  <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                ) : null}
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

        <Dialog open={addToNotesOpen} onOpenChange={setAddToNotesOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add image to task notes</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Select value={addToNotesTaskId} onValueChange={(v) => setAddToNotesTaskId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a task" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {allTasksForSelect.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addToNotesImage ? (
                <div className="rounded-md border overflow-hidden bg-white dark:bg-gray-800">
                  <img src={addToNotesImage.url} alt={addToNotesImage.name} className="w-full max-h-48 object-contain" />
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                This will append the image to the end of the selected task's notes.
              </p>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setAddToNotesOpen(false);
                  setAddToNotesImage(null);
                  setAddToNotesTaskId(undefined);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddImageToTaskNotes} disabled={!addToNotesTaskId || !addToNotesImage}>
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete image?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will remove the image from your Images library. This action cannot be undone.
            </p>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!selected) return;
                  setDeleteOpen(false);
                  handleDeleteImage(selected);
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Images;