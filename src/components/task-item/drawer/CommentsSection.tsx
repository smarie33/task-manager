"use client";

import React from "react";
import { Task } from "@/types/task";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from "uuid";
import { insertComment } from "@/services/db";
import { useSession } from "@/context/session-context";
import { useUserProfile } from "@/context/user-profile-context";

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
  const { session } = useSession();
  const { profile } = useUserProfile();

  const authorName = React.useMemo(() => {
    const fromProfile = String(profile?.name ?? "").trim();
    if (fromProfile) return fromProfile;

    const email = String(session?.user?.email ?? "").trim();
    if (!email) return "Anonymous";
    return email.split("@")[0] || email;
  }, [profile?.name, session?.user?.email]);

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
        <div className="flex justify-end">
          <Button
            variant="default"
            onClick={() => {
              const text = newCommentText.trim();
              if (!text) return;

              const newComment = {
                id: uuidv4(),
                text,
                createdAt: new Date().toISOString(),
                author: authorName,
              };
              const updated = [...(comments ?? []), newComment];
              onUpdateTaskField(taskId, "comments", updated as Task["comments"]);
              setNewCommentText("");

              if (session?.user) {
                insertComment(session.user.id, taskId, text, authorName).catch(() => {});
              }
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