"use client";

import React, { useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2Icon, PencilIcon, FileIcon } from 'lucide-react';
import { cn, lightenHexColor } from '@/lib/utils';
import { Task } from './TaskManager'; // Import Task interface

interface TaskItemProps {
  task: Task;
  index: number;
  groupColor: string;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskField: <K extends keyof Task>(taskId: string, field: K, value: Task[K]) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, index, groupColor, onDeleteTask, onUpdateTaskField }) => {
  const [editingField, setEditingField] = useState<keyof Task | null>(null);
  const [editedContent, setEditedContent] = useState(task.content);
  const [editedOwner, setEditedOwner] = useState(task.owner);
  const [editedTimeline, setEditedTimeline] = useState(task.timeline);
  const [editedTimeTracking, setEditedTimeTracking] = useState(task.timeTracking.toString());
  const [editedTags, setEditedTags] = useState(task.tags.join(', '));

  const handleSaveEdit = (field: keyof Task, value: any) => {
    if (field === 'timeTracking') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue !== task.timeTracking) {
        onUpdateTaskField(task.id, field, numValue);
      }
    } else if (field === 'tags') {
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

  const renderField = (field: keyof Task, displayValue: React.ReactNode, editValue: string | number, setEditValue: (value: string) => void) => {
    const isCurrentlyEditing = editingField === field;
    const inputType = field === 'timeTracking' ? 'number' : 'text';

    return (
      <div className="flex-grow min-w-0">
        {isCurrentlyEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveEdit(field, editValue)}
            onKeyDown={(e) => handleKeyDown(e, field, editValue)}
            className="h-7 text-sm p-1"
            autoFocus
            type={inputType}
          />
        ) : (
          <span className="text-sm truncate cursor-pointer block" onClick={() => {
            setEditValue(task[field]?.toString() || '');
            setEditingField(field);
          }}>
            {displayValue}
          </span>
        )}
      </div>
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
              className="grid grid-cols-[minmax(150px,_2fr)_repeat(5,_1fr)_minmax(50px,_0.5fr)_auto] gap-2 p-3 items-center"
              style={editingBackgroundColor ? { backgroundColor: editingBackgroundColor } : {}}
            >
              {/* Item */}
              {renderField('content', task.content, editedContent, setEditedContent)}

              {/* Owner */}
              {renderField('owner', task.owner || 'N/A', editedOwner, setEditedOwner)}

              {/* Status */}
              <div className="flex-grow min-w-0">
                <Select
                  value={task.status}
                  onValueChange={(value: 'To Do' | 'In Progress' | 'Done' | 'Blocked') => onUpdateTaskField(task.id, 'status', value)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To Do">To Do</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Timeline */}
              {renderField('timeline', task.timeline || 'N/A', editedTimeline, setEditedTimeline)}

              {/* Time Tracking */}
              {renderField('timeTracking', `${task.timeTracking}h` || '0h', editedTimeTracking, setEditedTimeTracking)}

              {/* Tags */}
              {renderField('tags', task.tags.join(', ') || 'N/A', editedTags, setEditedTags)}

              {/* Has Files */}
              <div className="flex justify-center items-center">
                {task.hasFiles && <FileIcon className="h-4 w-4 text-gray-500" />}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1 w-14 justify-end">
                {editingField && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-blue-500" onClick={() => handleSaveEdit(editingField, task[editingField])}>
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