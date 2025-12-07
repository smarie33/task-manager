"use client";

import React, { useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';
import { Trash2Icon, PencilIcon, FileIcon } from 'lucide-react';
import { cn, lightenHexColor, darkenHexColor } from '@/lib/utils';
import { Task, StatusOption } from '@/types/task';
import { useSynchronizedScroll } from "@/components/SynchronizedScrollProvider";
import StatusCell from './task-item/StatusCell';
import TimelineCell from './task-item/TimelineCell';
import TimeTrackingCell from './task-item/TimeTrackingCell';
import AppDrawer from './AppDrawer';
import TagsCell from './task-item/TagsCell';

interface TaskItemProps {
  task: Task;
  index: number;
  groupColor: string;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskField: <K extends keyof Task>(taskId: string, field: K, value: Task[K]) => void;
  availableStatuses: StatusOption[];
  setAvailableStatuses: React.Dispatch<React.SetStateAction<StatusOption[]>>;
  allTags: string[];
  // NEW: delete a tag globally
  onDeleteGlobalTag: (tag: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  index,
  groupColor,
  onDeleteTask,
  onUpdateTaskField,
  availableStatuses,
  setAvailableStatuses,
  allTags,
  onDeleteGlobalTag, // NEW
}) => {
  const [editingField, setEditingField] = useState<keyof Task | null>(null);
  const [editedContent, setEditedContent] = useState(task.content);
  // ADDED: local state for new comment
  const [newCommentText, setNewCommentText] = useState('');
  const [editedOwner, setEditedOwner] = useState(task.owner);
  const [editedTimeline, setEditedTimeline] = useState(task.timeline);
  const [editedTags, setEditedTags] = useState(task.tags.join(', '));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ADDED: current status color for drawer display
  const statusColor = availableStatuses.find((s) => s.name === task.status)?.color ?? '#6b7280';

  const { ref: scrollItemRef, onScroll: handleItemScroll } = useSynchronizedScroll();

  // NEW: tag helpers
  const handleAddTag = (tag: string) => {
    const t = tag.trim();
    if (!t) return;
    if (task.tags.includes(t)) return;
    onUpdateTaskField(task.id, 'tags', [...task.tags, t]);
  };

  const handleRemoveTag = (tag: string) => {
    onUpdateTaskField(task.id, 'tags', task.tags.filter((x) => x !== tag));
  };

  const handleSaveEdit = (field: keyof Task, value: any) => {
    if (field === 'tags') {
      const newTags = value.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      if (newTags.join(', ') !== task.tags.join(', ')) {
        onUpdateTaskField(task.id, field, newTags);
      }
    } else if (value !== task[field]) {
      onUpdateTaskField(task.id, field, value);
    }
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: keyof Task, value: any) => {
    if (e.key === 'Enter') {
      handleSaveEdit(field, value);
    }
  };

  const renderField = (
    field: keyof Task,
    displayValue: React.ReactNode,
    editValue: string | number,
    setEditValue: (value: string) => void
  ) => {
    const isCurrentlyEditing = editingField === field;
    const inputType = 'text';

    return (
      <>
        {isCurrentlyEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveEdit(field, editValue)}
            onKeyDown={(e) => handleKeyDown(e, field, editValue)}
            className="h-7 text-sm p-1 px-2 rounded-none border-2"
            autoFocus
            type={inputType}
            style={{
              borderColor: darkenHexColor(groupColor, 0.5),
              boxShadow: `inset 0 0 0 1px ${groupColor}`,
            }}
          />
        ) : (
          <span
            className="text-sm truncate cursor-pointer block px-2 py-2"
            onClick={() => {
              setEditValue(task[field]?.toString() || '');
              setEditingField(field);
            }}
          >
            {displayValue}
          </span>
        )}
      </>
    );
  };

  const editingBackgroundColor = editingField ? lightenHexColor(groupColor, 0.75) : undefined;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "shadow-sm cursor-grab active:cursor-grabbing rounded-none",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            {
              "border-t-0": index !== 0 && !snapshot.isDragging,
              "bg-white dark:bg-gray-800": !editingField,
            }
          )}
        >
          <CardContent className="p-0">
            <div
              className="grid grid-cols-2 items-center"
              style={editingBackgroundColor ? { backgroundColor: editingBackgroundColor } : {}}
            >
              {/* Sticky Item Column */}
              <div className="sticky left-0 z-10 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                <span
                  className="text-sm truncate cursor-pointer block px-2 py-2"
                  onClick={() => setIsDrawerOpen(true)}
                >
                  {task.content}
                </span>
              </div>

              {/* Scrollable Columns Container */}
              <div className="overflow-x-auto" ref={scrollItemRef} onScroll={handleItemScroll}>
                <div className="grid grid-cols-[repeat(5,_minmax(150px,_1fr))_minmax(50px,_0.5fr)_auto] min-w-[800px] items-center">
                  {/* Owner */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
                    {renderField('owner', task.owner || 'N/A', editedOwner, setEditedOwner)}
                  </div>

                  {/* Status */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
                    <StatusCell
                      status={task.status}
                      availableStatuses={availableStatuses}
                      setAvailableStatuses={setAvailableStatuses}
                      onChange={(name) => onUpdateTaskField(task.id, 'status', name)}
                    />
                  </div>

                  {/* Timeline */}
                  <TimelineCell
                    timeline={task.timeline}
                    status={task.status}
                    onChange={(newTimeline) => {
                      onUpdateTaskField(task.id, 'timeline', newTimeline);
                      setEditedTimeline(newTimeline);
                    }}
                  />

                  {/* Time Tracking */}
                  <TimeTrackingCell
                    task={task}
                    groupColor={groupColor}
                    onUpdateTimeTracking={(hours) => onUpdateTaskField(task.id, 'timeTracking', hours)}
                    onUpdateTimeLogs={(logs) => onUpdateTaskField(task.id, 'timeLogs', logs)}
                  />

                  {/* Tags */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
                    <TagsCell
                      taskTags={task.tags}
                      allTags={allTags}
                      onAddTag={handleAddTag}
                      onRemoveTag={handleRemoveTag}
                      // NEW: global delete handler
                      onDeleteGlobalTag={onDeleteGlobalTag}
                    />
                  </div>

                  {/* Has Files */}
                  <div className="flex justify-center items-center py-2">
                    {task.hasFiles && <FileIcon className="h-4 w-4 text-gray-500" />}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1 w-14 justify-end py-2">
                    {editingField && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-500 hover:text-blue-500"
                        onClick={() => handleSaveEdit(editingField, task[editingField])}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-500 hover:text-red-500"
                      onClick={() => onDeleteTask(task.id)}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          {/* App-wide side drawer for Item details */}
          <AppDrawer
            open={isDrawerOpen}
            onOpenChange={setIsDrawerOpen}
            title="Task Details"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="text-sm">{task.owner || "N/A"}</p>
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
                    {task.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timeline</p>
                  <p className="text-sm">{task.timeline || "N/A"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Tags</p>
                  <p className="text-sm">{task.tags.length ? task.tags.join(", ") : "N/A"}</p>
                </div>
              </div>

              {/* Item editable area */}
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
                      if (editedContent !== task.content) {
                        onUpdateTaskField(task.id, 'content', editedContent);
                      }
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>

              {/* Comments section */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Comments</p>

                {/* Existing comments list */}
                <div className="space-y-2">
                  {(task.comments && task.comments.length > 0) ? (
                    task.comments.map((c) => (
                      <div key={c.id} className="rounded-md border p-2">
                        <p className="text-sm">{c.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(c.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  )}
                </div>

                {/* Add new comment */}
                <div className="space-y-2">
                  <Textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="min-h-[80px]"
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
                        };
                        const updatedComments = [...(task.comments ?? []), newComment];
                        onUpdateTaskField(task.id, 'comments', updatedComments);
                        setNewCommentText('');
                      }}
                    >
                      Add Comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </AppDrawer>
        </Card>
      )}
    </Draggable>
  );
};

export default TaskItem;