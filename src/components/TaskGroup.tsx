"use client";

import React, { useState } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import TaskItem from './TaskItem';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusIcon, PaintbrushIcon, Trash2Icon } from 'lucide-react';
import { Task, StatusOption } from './TaskManager'; // Import Task and StatusOption interfaces
import { useSynchronizedScroll } from "@/components/SynchronizedScrollProvider"; // Import the hook

interface TaskGroupProps {
  group: { id: string; name: string; color: string; tasks: Task[] };
  onAddTask: (groupId: string, content: string) => void;
  onUpdateGroupName: (groupId: string, newName: string) => void;
  onUpdateGroupColor: (groupId: string, newColor: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onDeleteTask: (groupId: string, taskId: string) => void;
  onUpdateTaskField: <K extends keyof Task>(groupId: string, taskId: string, field: K, value: Task[K]) => void;
  availableStatuses: StatusOption[];
  setAvailableStatuses: React.Dispatch<React.SetStateAction<StatusOption[]>>;
  allTags: string[];
  // NEW: global delete for tags
  onDeleteGlobalTag: (tag: string) => void;
}

const TaskGroup: React.FC<TaskGroupProps> = ({
  group,
  onAddTask,
  onUpdateGroupName,
  onUpdateGroupColor,
  onDeleteGroup,
  onDeleteTask,
  onUpdateTaskField,
  availableStatuses,
  setAvailableStatuses,
  allTags,
  onDeleteGlobalTag, // NEW
}) => {
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const { ref: scrollHeaderRef, onScroll: handleHeaderScroll } = useSynchronizedScroll();


  const handleAddTask = () => {
    if (newTaskContent.trim()) {
      onAddTask(group.id, newTaskContent.trim());
      setNewTaskContent('');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateGroupName(group.id, e.target.value);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateGroupColor(group.id, e.target.value);
  };

  return (
    <Card className="w-[90vw] max-w-5xl flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between py-2 px-4 rounded-t-lg" style={{ backgroundColor: group.color }}>
        {isEditingName ? (
          <Input
            value={group.name}
            onChange={handleNameChange}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setIsEditingName(false);
            }}
            className="text-lg font-semibold bg-transparent border-none focus:ring-0 focus:outline-none text-white"
            autoFocus
          />
        ) : (
          <CardTitle className="text-lg font-semibold text-white cursor-pointer" onClick={() => setIsEditingName(true)}>
            {group.name}
          </CardTitle>
        )}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              type="color"
              value={group.color}
              onChange={handleColorChange}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              aria-label="Change group color"
            />
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <PaintbrushIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => onDeleteGroup(group.id)}>
            <Trash2Icon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Column Headers */}
      <div className="grid grid-cols-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border-b bg-gray-50 dark:bg-gray-800">
        {/* Sticky Item Header - First column of the grid */}
        <div className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 py-2">
          <div className="px-2 truncate">Item</div>
        </div>

        {/* Scrollable Headers - Second column of the grid */}
        <div className="overflow-x-auto" ref={scrollHeaderRef} onScroll={handleHeaderScroll}>
          <div className="grid grid-cols-[repeat(5,_minmax(150px,_1fr))_minmax(50px,_0.5fr)_auto] min-w-[800px]">
            <div className="border-r border-gray-200 dark:border-gray-700 py-2">
              <div className="px-2 truncate">Owner</div>
            </div>
            <div className="border-r border-gray-200 dark:border-gray-700 py-2">
              <div className="px-2 truncate">Status</div>
            </div>
            <div className="border-r border-gray-200 dark:border-gray-700 py-2">
              <div className="px-2 truncate">Timeline</div>
            </div>
            <div className="border-r border-gray-200 dark:border-gray-700 py-2">
              <div className="px-2 truncate">Time Tracking</div>
            </div>
            <div className="border-r border-gray-200 dark:border-gray-700 py-2">
              <div className="px-2 truncate">Tags</div>
            </div>
            <div className="py-2"> {/* No right border */}
              <div className="px-2 truncate text-center">Files</div>
            </div>
            <div className="w-14 py-2"></div> {/* Placeholder for action buttons, no border */}
          </div>
        </div>
      </div>

      <Droppable droppableId={group.id}>
        {(provided, snapshot) => (
          <CardContent
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-0 flex-grow ${snapshot.isDraggingOver ? 'bg-gray-100 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800'} transition-colors duration-200`}
          >
            {group.tasks.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center p-4">Drag tasks here or add a new one below.</p>
            )}
            {group.tasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                index={index}
                groupColor={group.color}
                onDeleteTask={(taskId) => onDeleteTask(group.id, taskId)}
                onUpdateTaskField={(taskId, field, value) => onUpdateTaskField(group.id, taskId, field, value)}
                availableStatuses={availableStatuses}
                setAvailableStatuses={setAvailableStatuses}
                allTags={allTags}
                // NEW: pass global tag deletion
                onDeleteGlobalTag={onDeleteGlobalTag}
              />
            ))}
            {provided.placeholder}
          </CardContent>
        )}
      </Droppable>
      <CardFooter className="p-4 border-t bg-white dark:bg-gray-800">
        <Input
          type="text"
          placeholder="Add a new task..."
          value={newTaskContent}
          onChange={(e) => setNewTaskContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddTask();
          }}
          className="flex-grow mr-2"
        />
        <Button onClick={handleAddTask} size="icon">
          <PlusIcon className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TaskGroup;