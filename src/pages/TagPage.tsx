"use client";

import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useTaskData } from "@/context/task-data-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { lightenHexColor } from "@/lib/utils";
import AppDrawer from "@/components/AppDrawer";
import { Task } from "@/types/task";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from "uuid";
import AppHeader from "@/components/AppHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const TagPage: React.FC = () => {
  const { tagName = "" } = useParams();
  const { groups, setGroups, availableStatuses } = useTaskData();

  const [selected, setSelected] = useState<{ task: Task; groupId: string; groupName: string; groupColor: string } | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentAuthor, setNewCommentAuthor] = useState("");

  const statusColor = React.useMemo(() => {
    if (!selected) return "#6b7280";
    const s = availableStatuses.find((x) => x.name === selected.task.status);
    return s?.color ?? "#6b7280";
  }, [selected, availableStatuses]);

  const decodedTag = decodeURIComponent(tagName);
  const tasksWithTag = groups
    .flatMap((g) => g.tasks.map((t) => ({ task: t, groupId: g.id, groupName: g.name, groupColor: g.color })))
    .filter(({ task }) => task.tags.includes(decodedTag));

  React.useEffect(() => {
    if (selected) {
      setEditedContent(selected.task.content);
      setNewCommentText("");
      setNewCommentAuthor("");
    }
  }, [selected]);

  const updateSelectedTaskField = <K extends keyof Task>(field: K, value: Task[K]) => {
    if (!selected) return;
    setGroups((prev) =>
      prev.map((group) =>
        group.id === selected.groupId
          ? {
              ...group,
              tasks: group.tasks.map((task) =>
                task.id === selected.task.id ? { ...task, [field]: value } : task
              ),
            }
          : group
      )
    );
    setSelected((prev) => (prev ? { ...prev, task: { ...prev.task, [field]: value } } : prev));
  };

  return (
    <div className="p-6 min-h-screen bg-black">
      <AppHeader />
      <div className="max-w-5xl mx-auto pt-4">
        <div className="flex items-center justify-center mb-6">
          <h1 className="text-2xl font-bold text-white text-center"># {decodedTag}</h1>
        </div>

        {tasksWithTag.length === 0 ? (
          <p className="text-sm text-gray-300">No items with this tag.</p>
        ) : (
          <div className="space-y-4">
            {tasksWithTag.map(({ task, groupId, groupName, groupColor }) => (
              <Card
                key={task.id}
                className="shadow-sm cursor-pointer hover:bg-gray-100"
                onClick={() => setSelected({ task, groupId, groupName, groupColor })}
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
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span
                    className="inline-flex items-center text-xs font-medium rounded-md px-2 py-1 border"
                    style={{
                      color: statusColor,
                      backgroundColor: lightenHexColor(statusColor, 0.9),
                      borderColor: statusColor,
                    }}
                  >
                    {selected.task.status || "N/A"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tags</p>
                  <p className="text-sm">
                    {selected.task.tags.length ? selected.task.tags.join(", ") : "N/A"}
                  </p>
                </div>
              </div>

              {/* Item editable area (same functionality as Task Manager drawer) */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="edit">
                  <AccordionTrigger>Edit Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Item</p>
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="min-h-[120px]"
                        placeholder="Enter item text..."
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            if (editedContent !== selected.task.content) {
                              updateSelectedTaskField("content", editedContent);
                            }
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Comments section (same functionality as Task Manager drawer) */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Comments</p>

                <div className="space-y-2">
                  {(selected.task.comments && selected.task.comments.length > 0) ? (
                    selected.task.comments.map((c) => (
                      <div key={c.id} className="rounded-md border p-2">
                        <p className="text-sm">{c.text}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.author || "Anonymous"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="min-h-[80px]"
                  />
                  <Input
                    value={newCommentAuthor}
                    onChange={(e) => setNewCommentAuthor(e.target.value)}
                    placeholder="Your name (optional)"
                    className="h-9"
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="default"
                      onClick={() => {
                        const text = newCommentText.trim();
                        if (!text) return;
                        const author = newCommentAuthor.trim() || "Anonymous";
                        const newComment = {
                          id: uuidv4(),
                          text,
                          createdAt: new Date().toISOString(),
                          author,
                        };
                        const updated = [...(selected.task.comments ?? []), newComment];
                        updateSelectedTaskField("comments", updated);
                        setNewCommentText("");
                        setNewCommentAuthor("");
                      }}
                    >
                      Add Comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AppDrawer>
      </div>
    </div>
  );
};

export default TagPage;