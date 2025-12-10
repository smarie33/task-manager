"use client";

import React from "react";
import { Task } from "@/types/task";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from "uuid";

type CommentsSectionProps = {
  taskId: string;
  comments?: Task["comments"];
  onUpdateTaskField: <K extends keyof Task>(taskId: string, field: K, value: Task[K]) => void;
  readOnly?: boolean;
};

const CommentsSection: React.FC<CommentsSectionProps> = ({
  taskId,
  comments = [],
  onUpdateTaskField,
  readOnly = false,
}) => {
  const [newCommentText, setNewCommentText] = React.useState("");
  const [newCommentAuthor, setNewCommentAuthor] = React.useState("");

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Comments</p>

      <div className="space-y-2">
        {comments && comments.length > 0 ? (
          comments.map((c) => (
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
          disabled={readOnly}
        />
        <Input
          value={newCommentAuthor}
          onChange={(e) => setNewCommentAuthor(e.target.value)}
          placeholder="Your name (optional)"
          className="h-9"
          disabled={readOnly}
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
              const updated = [...(comments ?? []), newComment];
              onUpdateTaskField(taskId, "comments", updated as Task["comments"]);
              setNewCommentText("");
              setNewCommentAuthor("");
            }}
            disabled={readOnly}
          >
            Add Comment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommentsSection;