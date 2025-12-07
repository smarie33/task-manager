"use client";

import React, { useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2Icon, PencilIcon } from 'lucide-react';

interface TaskItemProps {
  task: { id: string; content: string };
  index: number;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskContent: (taskId: string, newContent: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, index, onDeleteTask, onUpdateTaskContent }) => {
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

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-2 bg-white dark:bg-gray-800 shadow-sm cursor-grab active:cursor-grabbing"
        >
          <CardContent className="p-3 flex items-center justify-between gap-2">
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
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
};

export default TaskItem;