"use client";

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import TaskGroup from './TaskGroup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Task {
  id: string;
  content: string;
}

interface TaskGroupData {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
}

const initialGroups: TaskGroupData[] = [
  {
    id: uuidv4(),
    name: 'To Do',
    color: '#ef4444', // red-500
    tasks: [
      { id: uuidv4(), content: 'Buy groceries' },
      { id: uuidv4(), content: 'Walk the dog' },
    ],
  },
  {
    id: uuidv4(),
    name: 'In Progress',
    color: '#f97316', // orange-500
    tasks: [
      { id: uuidv4(), content: 'Work on project' },
    ],
  },
  {
    id: uuidv4(),
    name: 'Done',
    color: '#22c55e', // green-500
    tasks: [],
  },
];

const TaskManager: React.FC = () => {
  const [groups, setGroups] = useState<TaskGroupData[]>(initialGroups);
  const [newGroupName, setNewGroupName] = useState('');

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
              tasks: [...group.tasks, { id: uuidv4(), content }],
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

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">Task Manager</h1>
      <div className="flex flex-wrap gap-6 justify-center mb-8">
        <Input
          type="text"
          placeholder="New group name..."
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddGroup();
          }}
          className="w-64"
        />
        <Button onClick={handleAddGroup}>
          <PlusIcon className="h-4 w-4 mr-2" /> Add Group
        </Button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-wrap gap-6 justify-center">
          {groups.map((group) => (
            <TaskGroup
              key={group.id}
              group={group}
              onAddTask={handleAddTask}
              onUpdateGroupName={handleUpdateGroupName}
              onUpdateGroupColor={handleUpdateGroupColor}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default TaskManager;