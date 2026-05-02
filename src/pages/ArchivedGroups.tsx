"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/context/session-context";
import { useUserProfile } from "@/context/user-profile-context";
import { loadAll, loadArchivedGroups, loadSharedArchivedGroups, loadSharedTaskData, updateGroup } from "@/services/db";
import { showError, showSuccess } from "@/utils/toast";
import { useTaskData } from "@/context/task-data-context";
import type { StatusOption, TaskGroupData } from "@/types/task";
import { RotateCcw } from "lucide-react";

const ensureNoStatus = (statuses: StatusOption[]) => {
  const normalized = statuses.map((s) =>
    s.name.toLowerCase() === "no status" ? { ...s, name: "No Status", color: "#ffffff" } : s
  );
  const has = normalized.some((s) => s.name.toLowerCase() === "no status");
  return has ? normalized : [{ name: "No Status", color: "#ffffff" }, ...normalized];
};

const ArchivedGroups: React.FC = () => {
  const { session } = useSession();
  const { profile } = useUserProfile();
  const role = profile?.role ?? "Viewer";
  const adminReadAll = role !== "Viewer";

  const {
    setGroups,
    setAvailableStatuses,
    setLibraryFiles,
    setLibraryImages,
    setExternalLinks,
  } = useTaskData();

  const [archivedGroups, setArchivedGroups] = React.useState<TaskGroupData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [unarchivingId, setUnarchivingId] = React.useState<string | null>(null);

  const reloadArchived = React.useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      let archived = null;

      try {
        archived = await loadSharedArchivedGroups(role);
      } catch (edgeError) {
        console.warn("[archived-groups] edge load failed, falling back to direct queries", {
          role,
          message: String((edgeError as any)?.message ?? edgeError),
        });
      }

      if (!archived) {
        archived = await loadArchivedGroups(session.user.id, { adminReadAll });
      }

      setArchivedGroups(archived);
    } catch {
      showError("Failed to load archived groups");
    } finally {
      setLoading(false);
    }
  }, [adminReadAll, role, session?.user?.id]);

  React.useEffect(() => {
    reloadArchived();
  }, [reloadArchived]);

  const handleUnarchive = async (groupId: string) => {
    if (!session?.user?.id) return;
    setUnarchivingId(groupId);
    try {
      await updateGroup(groupId, { archived: false });

      let loaded = null;

      try {
        loaded = await loadSharedTaskData(role);
      } catch (edgeError) {
        console.warn("[archived-groups] edge refresh failed, falling back to direct queries", {
          role,
          message: String((edgeError as any)?.message ?? edgeError),
        });
      }

      if (!loaded) {
        loaded = await loadAll(session.user.id, {
          readAllContent: !!profile,
          timeLogsUserId: role === "Viewer" || role === "Editor" ? session.user.id : null,
        });
      }

      setGroups(loaded.groups);
      setAvailableStatuses(ensureNoStatus(loaded.statuses));
      setLibraryFiles(loaded.files);
      setLibraryImages(loaded.images);
      setExternalLinks(loaded.links);

      await reloadArchived();
      showSuccess("Group unarchived");
    } catch {
      showError("Failed to unarchive group");
    } finally {
      setUnarchivingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Archived Groups</h1>

        {loading ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
        ) : archivedGroups.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">No archived groups.</p>
        ) : (
          <div className="space-y-4">
            {archivedGroups.map((g) => (
              <Card key={g.id} style={{ borderLeftWidth: 3, borderLeftColor: g.color }} className="rounded-none">
                <CardHeader
                  className="flex flex-row items-center justify-between py-2 px-3 rounded-none"
                  style={{ backgroundColor: g.color }}
                >
                  <CardTitle className="text-base font-semibold text-white">{g.name}</CardTitle>
                  <Button
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => handleUnarchive(g.id)}
                    disabled={unarchivingId === g.id}
                    title="Unarchive group"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {unarchivingId === g.id ? "Unarchiving…" : "Unarchive"}
                  </Button>
                </CardHeader>
                <CardContent className="py-3 px-4 text-sm text-muted-foreground">
                  {g.tasks.length} task{g.tasks.length === 1 ? "" : "s"}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivedGroups;