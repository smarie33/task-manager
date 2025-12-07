"use client";

import React, { useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2Icon, PencilIcon } from 'lucide-react';
import { cn, lightenHexColor } from '@/lib/utils'; // Import lightenHexColor

interface TaskItemProps {
  task: { id: string; content: string };
  index: number;
  groupColor: string; // New prop for the group's color
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskContent: (taskId: string, newContent: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, index, groupColor, onDeleteTask, onUpdateTaskContent }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(task.content);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editedContent.trim() !== task.content) {
      onUpdateTaskContent(task.id, editedContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    }
  };

  // Calculate the lighter background color when editing
  const editingBackgroundColor = isEditing ? lightenHexColor(groupColor, 0.75) : undefined;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "shadow-sm cursor-grab active:cursor-grabbing rounded-none",
            "hover:bg-gray-100 dark:hover:bg-gray-700", // Hover effect
            {
              "border-t-0": index !== 0 && !snapshot.isDragging,
              "bg-white dark:bg-gray-800": !isEditing, // Default background when not editing
            }
          )}
        >
          <CardContent className="p-0"> {/* Removed padding here to allow inner div to fill */}
            <div
              className="p-3 flex items-center justify-between gap-2" // Added padding back to inner div
              style={editingBackgroundColor ? { backgroundColor: editingBackgroundColor } : {}} // Apply dynamic background to inner div
            >
              {isEditing ? (
                <Input
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  className="flex-grow text-sm"
                  autoFocus
                />
              ) : (
                <span className="flex-grow text-sm cursor-pointer" onClick={handleEdit}>
                  {task.content}
                </span>
              )}
              <div className="flex gap-1">
                {!isEditing && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-blue-500" onClick={handleEdit}>
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-red-500" onClick={() => onDeleteTask(task.id)}>
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
};

export default TaskItem;