"use client";

import React from "react";
import { useTaskData } from "@/context/task-data-context";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Files: React.FC = () => {
  const { groups } = useTaskData();

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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Files</h1>
        {tasksWithFiles.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">No tasks with files yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tasksWithFiles.map(({ task, groupName }, idx) => (
              <Card key={`${task.id}-${idx}`} className="shadow-sm">
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