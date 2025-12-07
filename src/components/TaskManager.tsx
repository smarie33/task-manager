"use client";

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import TaskGroup from './TaskGroup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useSynchronizedScroll } from "@/components/SynchronizedScrollProvider"; // Import the hook

export interface StatusOption {
  name: string;
  color: string;
}

export interface Task {
  id: string;
  content: string; // Item
  owner: string;
  status: string; // Now references StatusOption.name
  timeline: string; // e.g., "2023-12-31" or "Q4 2023"
  timeTracking: number; // in hours
  tags: string[];
  hasFiles: boolean;
}

interface TaskGroupData {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
}

const initialStatuses: StatusOption[] = [
  { name: 'To Do', color: '#ef4444' }, // red-500
  { name: 'In Progress', color: '#f97316' }, // orange-500
  { name: 'Done', color: '#22c55e' }, // green-500
  { name: 'Blocked', color: '#6b7280' }, // gray-500
];

const initialGroups: TaskGroupData[] = [
  {
    id: uuidv4(),
    name: 'To Do',
    color: '#ef4444', // red-500
    tasks: [
      { id: uuidv4(), content: 'Buy groceries', owner: 'Alice', status: 'To Do', timeline: 'Next Week', timeTracking: 0, tags: ['personal', 'urgent'], hasFiles: false },
      { id: uuidv4(), content: 'Walk the dog', owner: 'Bob', status: 'To Do', timeline: 'Today', timeTracking: 0, tags: ['home'], hasFiles: true },
    ],
  },
  {
    id: uuidv4(),
    name: 'In Progress',
    color: '#f97316', // orange-500
    tasks: [
      { id: uuidv4(), content: 'Work on project', owner: 'Charlie', status: 'In Progress', timeline: 'End of Month', timeTracking: 10, tags: ['work', 'development'], hasFiles: true },
    ],
  },
  {
    id: uuidv4(),
    name: 'Done',
    color: '#22c55e', // green-500
    tasks: [
      { id: uuidv4(), content: 'Finish report', owner: 'Alice', status: 'Done', timeline: 'Last Week', timeTracking: 5, tags: ['work'], hasFiles: false },
    ],
  },
];

const TaskManager: React.FC = () => {
  const [groups, setGroups] = useState<TaskGroupData[]>(initialGroups);
  const [availableStatuses, setAvailableStatuses] = useState<StatusOption[]>(initialStatuses);
  const [newGroupName, setNewGroupName] = useState('');
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#60a5fa'); // Default blue-400

  const { ref: masterScrollRef, onScroll: handleMasterScroll } = useSynchronizedScroll({ isMaster: true });

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      return;
    }

    // If dropped in the same place, do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceGroupIndex = groups.findIndex(group => group.id === source.droppableId);
    const destinationGroupIndex = groups.findIndex(group => group.id === destination.droppableId);

    const newGroups = Array.from(groups);
    const sourceGroup = newGroups[sourceGroupIndex];
    const destinationGroup = newGroups[destinationGroupIndex];

    // Find the task being dragged
    const task = sourceGroup.tasks.find(t => t.id === draggableId);
    if (!task) return;

    // Remove task from source group
    sourceGroup.tasks.splice(source.index, 1);

    // Add task to destination group
    destinationGroup.tasks.splice(destination.index, 0, task);

    setGroups(newGroups);
  };

  const handleAddTask = (groupId: string, content: string) => {
    setGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              tasks: [...group.tasks, {
                id: uuidv4(),
                content,
                owner: '',
                status: availableStatuses[0]?.name || 'To Do', // Default to first available status
                timeline: '',
                timeTracking: 0,
                tags: [],
                hasFiles: false,
              }],
            }
          : group
      )
    );
  };

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      setGroups(prevGroups => [
        ...prevGroups,
        {
          id: uuidv4(),
          name: newGroupName.trim(),
          color: '#60a5fa', // blue-400 default color
          tasks: [],
        },
      ]);
      setNewGroupName('');
    }
  };

  const handleAddStatus = () => {
    if (newStatusName.trim() && !availableStatuses.some(s => s.name === newStatusName.trim())) {
      setAvailableStatuses(prev => [...prev, { name: newStatusName.trim(), color: newStatusColor }]);
      setNewStatusName('');
      setNewStatusColor('#60a5fa'); // Reset to default
    }
  };

  const handleUpdateGroupName = (groupId: string, newName: string) => {
    setGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId ? { ...group, name: newName } : group
      )
    );
  };

  const handleUpdateGroupColor = (groupId: string, newColor: string) => {
    setGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId ? { ...group, color: newColor } : group
      )
    );
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
  };

  const handleDeleteTask = (groupId: string, taskId: string) => {
    setGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              tasks: group.tasks.filter(task => task.id !== taskId),
            }
          : group
      )
    );
  };

  const handleUpdateTaskField = <K extends keyof Task>(groupId: string, taskId: string, field: K, value: Task[K]) => {
    setGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              tasks: group.tasks.map(task =>
                task.id === taskId ? { ...task, [field]: value } : task
              ),
            }
          : group
      )
    );
  };

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">Task Manager</h1>
      <div className="flex flex-wrap gap-6 justify-center mb-8">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="New group name..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddGroup();
            }}
            className="w-40"
          />
          <Button onClick={handleAddGroup}>
            <PlusIcon className="h-4 w-4 mr-2" /> Add Group
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="New status name..."
            value={newStatusName}
            onChange={(e) => setNewStatusName(e.target.value)}
            className="w-40"
          />
          <Input
            type="color"
            value={newStatusColor}
            onChange={(e) => setNewStatusColor(e.target.value)}
            className="w-10 h-10 p-0 border-none cursor-pointer"
            title="Choose status color"
          />
          <Button onClick={handleAddStatus}>
            <PlusIcon className="h-4 w-4 mr-2" /> Add Status
          </Button>
        </div>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        {/* This div will be the single scrollable container for all groups' scrollable content */}
        <div className="overflow-x-auto pb-4" ref={masterScrollRef} onScroll={handleMasterScroll}>
          <div className="flex flex-col items-center gap-6 min-w-max"> {/* min-w-max ensures content dictates width */}
            {groups.map((group) => (
              <TaskGroup
                key={group.id}
                group={group}
                onAddTask={handleAddTask}
                onUpdateGroupName={handleUpdateGroupName}
                onUpdateGroupColor={handleUpdateGroupColor}
                onDeleteGroup={handleDeleteGroup}
                onDeleteTask={handleDeleteTask}
                onUpdateTaskField={handleUpdateTaskField}
                availableStatuses={availableStatuses}
              />
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default TaskManager;