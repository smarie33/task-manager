"use client";

import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card, CardContent } from '@/components/ui/card';

interface TaskItemProps {
  task: { id: string; content: string };
  index: number;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, index }) => {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-2 bg-white dark:bg-gray-800 shadow-sm cursor-grab active:cursor-grabbing"
        >
          <CardContent className="p-3 text-sm">
            {task.content}
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
};

export default TaskItem;