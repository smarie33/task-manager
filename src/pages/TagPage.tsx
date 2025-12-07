"use client";

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTaskData } from "@/context/task-data-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { lightenHexColor } from "@/lib/utils";
import AppDrawer from "@/components/AppDrawer";
import { Task } from "@/types/task";

const TagPage: React.FC = () => {
  const { tagName = "" } = useParams();
  const navigate = useNavigate();
  const { groups } = useTaskData();

  // ADD: selected task for drawer
  const [selected, setSelected] = useState<{ task: Task; groupName: string; groupColor: string } | null>(null);

  const decodedTag = decodeURIComponent(tagName);
  const tasksWithTag = groups
    .flatMap((g) => g.tasks.map((t) => ({ task: t, groupName: g.name, groupColor: g.color })))
    .filter(({ task }) => task.tags.includes(decodedTag));

  return (
    <div className="p-6 min-h-screen bg-black">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate("/")}>
            ← Back to Task Manager
          </Button>
          <h1 className="text-2xl font-bold text-white"># {decodedTag}</h1>
          <div className="w-24" />
        </div>

        {tasksWithTag.length === 0 ? (
          <p className="text-sm text-gray-300">No items with this tag.</p>
        ) : (
          <div className="space-y-4">
            {tasksWithTag.map(({ task, groupName, groupColor }) => (
              <Card
                key={task.id}
                className="shadow-sm cursor-pointer hover:bg-gray-100"
                onClick={() => setSelected({ task, groupName, groupColor })}
                role="button"
                aria-label={`Open details for ${task.content}`}
              >
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{task.content}</CardTitle>
                  <span
                    className="text-xs font-medium rounded-md px-2 py-1 border"
                    style={{
                      color: groupColor,
                      backgroundColor: lightenHexColor(groupColor, 0.9),
                      borderColor: groupColor,
                    }}
                  >
                    {groupName}
                  </span>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Owner</p>
                      <p>{task.owner || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Timeline</p>
                      <p>{task.timeline || "N/A"}</p>
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

        {/* Drawer shown when a task is selected */}
        <AppDrawer
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          title="Task Details"
        >
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{selected.task.content}</h2>
                <span
                  className="text-xs font-medium rounded-md px-2 py-1 border"
                  style={{
                    color: selected.groupColor,
                    backgroundColor: lightenHexColor(selected.groupColor, 0.9),
                    borderColor: selected.groupColor,
                  }}
                >
                  {selected.groupName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="text-sm">{selected.task.owner || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timeline</p>
                  <p className="text-sm">{selected.task.timeline || "N/A"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-sm">{selected.task.status || "N/A"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Tags</p>
                <p className="text-sm">
                  {selected.task.tags.length ? selected.task.tags.join(", ") : "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Item</p>
                <p className="text-sm">{selected.task.content}</p>
              </div>
            </div>
          )}
        </AppDrawer>
      </div>
    </div>
  );
};

export default TagPage;