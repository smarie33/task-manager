"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import AppDrawer from "@/components/AppDrawer";
import { useTaskData } from "@/context/task-data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ImageIcon, ExternalLinkIcon } from "lucide-react";
import { FileMeta } from "@/types/task";

type SortKey = "name" | "date" | "type";
type SortOrder = "asc" | "desc";

const Images: React.FC = () => {
  const { libraryImages } = useTaskData();

  const images = React.useMemo<FileMeta[]>(() => {
    return libraryImages.filter((f) => (f.mimeType ?? "").startsWith("image/"));
  }, [libraryImages]);

  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc");
  const [selected, setSelected] = React.useState<FileMeta | null>(null);

  const filteredSorted = React.useMemo<FileMeta[]>(() => {
    const q = query.trim().toLowerCase();
    let list = images.filter((file) => (q ? file.name.toLowerCase().includes(q) : true));

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
  }, [images, query, sortKey, sortOrder]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <AppHeader />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Images</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
            No images found{query ? ` for "${query}"` : ""}. Upload images from any task to see them here.
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
                      <p className="truncate">{file.sourceTaskContent || "Unknown"}</p>
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
                  <p className="truncate">{selected.sourceTaskContent || "Unknown"}</p>
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