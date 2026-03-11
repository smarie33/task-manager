"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { StatusOption, TaskGroupData, FileMeta, LinkMeta } from "@/types/task";
import { v4 as uuidv4 } from "uuid";
import { useSession } from "@/context/session-context";
import { loadAll } from "@/services/db";
import { useUserProfile } from "@/context/user-profile-context";

const initialStatuses: StatusOption[] = [
  { name: "No Status", color: "#ffffff" },
  { name: "To Do", color: "#ef4444" },
  { name: "In Progress", color: "#f97316" },
  { name: "Done", color: "#22c55e" },
  { name: "Blocked", color: "#6b7280" },
];

const initialGroups: TaskGroupData[] = [
  {
    id: uuidv4(),
    name: "To Do",
    color: "#ef4444",
    tasks: [
      {
        id: uuidv4(),
        content: "Buy groceries",
        owner: "Alice",
        status: "To Do",
        timeline: "Next Week",
        timeTracking: 0,
        tags: ["personal", "urgent"],
        hasFiles: false,
        timeLogs: [],
        comments: [],
        files: [],
        notes: "",
      },
      {
        id: uuidv4(),
        content: "Walk the dog",
        owner: "Bob",
        status: "To Do",
        timeline: "Today",
        timeTracking: 0,
        tags: ["home"],
        hasFiles: true,
        timeLogs: [],
        comments: [],
        files: [],
        notes: "",
      },
    ],
  },
  {
    id: uuidv4(),
    name: "In Progress",
    color: "#f97316",
    tasks: [
      {
        id: uuidv4(),
        content: "Work on project",
        owner: "Charlie",
        status: "In Progress",
        timeline: "End of Month",
        timeTracking: 10,
        tags: ["work", "development"],
        hasFiles: true,
        timeLogs: [],
        comments: [],
        files: [],
        notes: "",
      },
    ],
  },
  {
    id: uuidv4(),
    name: "Done",
    color: "#22c55e",
    tasks: [
      {
        id: uuidv4(),
        content: "Finish report",
        owner: "Alice",
        status: "Done",
        timeline: "Last Week",
        timeTracking: 5,
        tags: ["work"],
        hasFiles: false,
        timeLogs: [],
        comments: [],
        files: [],
        notes: "",
      },
    ],
  },
];

type TaskDataContextValue = {
  groups: TaskGroupData[];
  setGroups: React.Dispatch<React.SetStateAction<TaskGroupData[]>>;
  availableStatuses: StatusOption[];
  setAvailableStatuses: React.Dispatch<React.SetStateAction<StatusOption[]>>;
  // NEW: global files and links for Files page
  libraryFiles: FileMeta[];
  setLibraryFiles: React.Dispatch<React.SetStateAction<FileMeta[]>>;
  externalLinks: LinkMeta[];
  setExternalLinks: React.Dispatch<React.SetStateAction<LinkMeta[]>>;
  // ADDED: global images folder
  libraryImages: FileMeta[];
  setLibraryImages: React.Dispatch<React.SetStateAction<FileMeta[]>>;
};

const TaskDataContext = createContext<TaskDataContextValue | undefined>(undefined);

export const TaskDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [groups, setGroups] = useState<TaskGroupData[]>(initialGroups);
  const [availableStatuses, setAvailableStatuses] = useState<StatusOption[]>(initialStatuses);
  // NEW: global library for non-image files and external links
  const [libraryFiles, setLibraryFiles] = useState<FileMeta[]>([]);
  const [externalLinks, setExternalLinks] = useState<LinkMeta[]>([]);
  // ADDED: global images folder
  const [libraryImages, setLibraryImages] = useState<FileMeta[]>([]);

  // NEW: load from Supabase when session is ready
  const { session } = useSession();
  const { profile } = useUserProfile();

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!session?.user) return;
      const adminReadAll = profile?.role === "Admin";
      try {
        const loaded = await loadAll(session.user.id, { adminReadAll });
        if (cancelled) return;

        const ensureNoStatus = (statuses: StatusOption[]) => {
          const normalized = statuses.map((s) =>
            s.name.toLowerCase() === "no status" ? { ...s, name: "No Status", color: "#ffffff" } : s
          );
          const has = normalized.some((s) => s.name.toLowerCase() === "no status");
          return has ? normalized : [{ name: "No Status", color: "#ffffff" }, ...normalized];
        };

        setGroups(loaded.groups);
        setAvailableStatuses(ensureNoStatus(loaded.statuses));
        setLibraryFiles(loaded.files);
        setLibraryImages(loaded.images);
        setExternalLinks(loaded.links);

        // Diagnostics (helps track "empty data" reports)
        console.log("[task-data] loaded", {
          adminReadAll,
          sessionUserId: session.user.id,
          sessionEmail: session.user.email,
          profileId: profile?.id,
          profileEmail: profile?.email,
          profileRole: profile?.role,
          groups: loaded.groups.length,
          tasks: loaded.groups.reduce((sum, g) => sum + g.tasks.length, 0),
          statuses: loaded.statuses.length,
          files: loaded.files.length,
          images: loaded.images.length,
          links: loaded.links.length,
        });
      } catch (e) {
        console.error("[task-data] load failed", e);
        if (cancelled) return;
        // Keep current state; do not wipe sample tasks on failure.
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.user?.email, profile?.id, profile?.email, profile?.role]);

  return (
    <TaskDataContext.Provider
      value={{
        groups,
        setGroups,
        availableStatuses,
        setAvailableStatuses,
        libraryFiles,
        setLibraryFiles,
        externalLinks,
        setExternalLinks,
        // ADDED:
        libraryImages,
        setLibraryImages,
      }}
    >
      {children}
    </TaskDataContext.Provider>
  );
};

export const useTaskData = () => {
  const ctx = useContext(TaskDataContext);
  if (!ctx) throw new Error("useTaskData must be used within TaskDataProvider");
  return ctx;
};