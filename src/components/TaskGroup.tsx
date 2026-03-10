"use client";

import React, { useState } from 'react';
import { Droppable, type DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';
import TaskItem from './TaskItem';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, PlusIcon, PaintbrushIcon, Trash2Icon, ChevronDown, ChevronRight } from 'lucide-react';
import { Task, StatusOption } from '@/types/task'; // updated import
import { useSynchronizedScroll } from "@/components/SynchronizedScrollProvider"; // Import the hook
import { Archive } from 'lucide-react';
import GroupDeleteDialog from '@/components/group/GroupDeleteDialog';

type SortKey = "owner" | "content" | "status" | "timeline";

interface TaskGroupProps {
  group: { id: string; name: string; color: string; tasks: Task[]; userId?: string };
  onAddTask: (groupId: string, content: string) => void;
  onUpdateGroupName: (groupId: string, newName: string) => void;
  onUpdateGroupColor: (groupId: string, newColor: string) => void;
  onDeleteGroup: (groupId: string, mode: "delete" | "reassign", targetGroupId?: string) => void;
  onDeleteSelectedTasks: (groupId: string, taskIds: string[]) => void;
  onUpdateTaskField: <K extends keyof Task>(groupId: string, taskId: string, field: K, value: Task[K]) => void;
  availableStatuses: StatusOption[];
  setAvailableStatuses: React.Dispatch<React.SetStateAction<StatusOption[]>>;
  allTags: string[];
  onDeleteGlobalTag: (tag: string) => void;
  readOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  visibleTasks?: Task[];
  dragDisabled?: boolean;
  filterActive?: boolean;
  onArchiveGroup: (groupId: string) => void;
  otherGroups: { id: string; name: string }[];
  owners: string[];
  onSortGroup?: (groupId: string, sortBy: SortKey) => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

const TaskGroup: React.FC<TaskGroupProps> = ({
  group,
  onAddTask,
  onUpdateGroupName,
  onUpdateGroupColor,
  onDeleteGroup,
  onDeleteSelectedTasks,
  onUpdateTaskField,
  availableStatuses,
  setAvailableStatuses,
  allTags,
  onDeleteGlobalTag,
  readOnly = false,
  isCollapsed: isCollapsedProp,
  onToggleCollapse,
  visibleTasks,
  dragDisabled = false,
  filterActive = false,
  onArchiveGroup,
  otherGroups,
  owners,
  onSortGroup,
  dragHandleProps,
}) => {
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const { ref: scrollHeaderRef, onScroll: handleHeaderScroll } = useSynchronizedScroll();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    // Prune selections for tasks that no longer exist
    setSelectedTaskIds((prev) => {
      const allowed = new Set(group.tasks.map((t) => t.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [group.tasks]);

  const deleteSelectedDisabled = readOnly || selectedTaskIds.size === 0;

  const handleDeleteSelected = () => {
    if (deleteSelectedDisabled) return;
    const ids = Array.from(selectedTaskIds);
    onDeleteSelectedTasks(group.id, ids);
    setSelectedTaskIds(new Set());
  };

  const toggleTaskSelected = (taskId: string, selected: boolean) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  };

  // Use controlled collapsed value if provided, otherwise local state
  const collapsed = typeof isCollapsedProp === 'boolean' ? isCollapsedProp : isCollapsed;
  const toggleCollapsed = onToggleCollapse ?? (() => setIsCollapsed((prev) => !prev));

  // Determine which tasks to render
  const tasksToShow = visibleTasks ?? group.tasks;

  const SortHeader: React.FC<{ label: string; sortKey: SortKey; center?: boolean }> = ({ label, sortKey, center }) => {
    if (!onSortGroup) {
      return <div className={`px-2 truncate ${center ? "text-center" : ""}`}>{label}</div>;
    }
    return (
      <button
        type="button"
        className={`px-2 truncate text-left hover:underline ${center ? "w-full text-center" : "w-full"}`}
        onClick={() => onSortGroup(group.id, sortKey)}
      >
        {label}
      </button>
    );
  };

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
    <Card className="w-[90vw] max-w-[1500px] flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between py-1 px-3 rounded-t-lg" style={{ backgroundColor: group.color }}>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 cursor-grab active:cursor-grabbing"
            aria-label="Reorder group"
            title="Drag to reorder group"
            {...(dragHandleProps ?? {})}
          >
            <GripVertical className="h-4 w-4" />
          </Button>

          {isEditingName ? (
            <Input
              value={group.name}
              onChange={(e) => onUpdateGroupName(group.id, e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingName(false);
              }}
              className="text-base font-semibold bg-transparent border-none focus:ring-0 focus:outline-none text-white"
              autoFocus
              disabled={readOnly}
            />
          ) : (
            <CardTitle
              className={`text-base font-semibold text-white ${readOnly ? "" : "cursor-pointer"}`}
              onClick={() => {
                if (!readOnly) setIsEditingName(true);
              }}
            >
              {group.name}
            </CardTitle>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            aria-label={collapsed ? "Expand group" : "Collapse group"}
            onClick={toggleCollapsed}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              type="color"
              value={group.color}
              onChange={(e) => onUpdateGroupColor(group.id, e.target.value)}
              className={`absolute inset-0 opacity-0 w-full h-full ${readOnly ? "pointer-events-none" : "cursor-pointer"}`}
              aria-label="Change group color"
              disabled={readOnly}
            />
            <Button variant="ghost" size="icon" className={`text-white ${readOnly ? "" : "hover:bg-white/20"}`} disabled={readOnly}>
              <PaintbrushIcon className="h-4 w-4" />
            </Button>
          </div>

          {!readOnly && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                aria-label="Archive group"
                onClick={() => onArchiveGroup(group.id)}
              >
                <Archive className="h-4 w-4" />
              </Button>

              <GroupDeleteDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    aria-label="Delete group"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                }
                groupName={group.name}
                hasTasks={group.tasks.length > 0}
                otherGroups={otherGroups}
                onConfirm={(mode, targetGroupId) => onDeleteGroup(group.id, mode, targetGroupId)}
              />
            </>
          )}
        </div>
      </CardHeader>

      {!collapsed && (
        <div className="grid grid-cols-[2.5rem_minmax(0,_1fr)_minmax(0,_1fr)] text-xs font-semibold text-gray-600 dark:text-gray-300 border-b bg-gray-50 dark:bg-gray-800">
          {/* Sticky Checkbox Header */}
          <div className="sticky left-0 z-20 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 py-1 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-600 hover:text-red-600"
              aria-label="Delete selected tasks"
              title={selectedTaskIds.size > 0 ? `Delete ${selectedTaskIds.size} selected` : "Select tasks to delete"}
              onClick={handleDeleteSelected}
              disabled={deleteSelectedDisabled}
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>

          {/* Sticky Item Header */}
          <div className="sticky left-10 z-10 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 py-2">
            <SortHeader label="Item" sortKey="content" />
          </div>

          {/* Scrollable Headers */}
          <div className="overflow-x-auto" ref={scrollHeaderRef} onScroll={handleHeaderScroll}>
            <div className="grid grid-cols-[repeat(5,_minmax(150px,_1fr))_minmax(120px,_0.5fr)] min-w-[740px]">
              <div className="border-r border-gray-200 dark:border-gray-700 py-2">
                <SortHeader label="Owner" sortKey="owner" />
              </div>
              <div className="border-r border-gray-200 dark:border-gray-700 py-2">
                <SortHeader label="Status" sortKey="status" />
              </div>
              <div className="border-r border-gray-200 dark:border-gray-700 py-2">
                <SortHeader label="Timeline" sortKey="timeline" />
              </div>
              <div className="border-r border-gray-200 dark:border-gray-700 py-2">
                <div className="px-2 truncate">Time Tracking</div>
              </div>
              <div className="border-r border-gray-200 dark:border-gray-700 py-2">
                <div className="px-2 truncate">Tags</div>
              </div>
              <div className="py-2">
                <div className="px-2 truncate text-center">Images</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!collapsed && (
        <Droppable droppableId={group.id}>
          {(provided, snapshot) => (
            <CardContent
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-0 flex-grow ${snapshot.isDraggingOver ? 'bg-gray-100 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800'} transition-colors duration-200`}
            >
              {tasksToShow.length === 0 && !snapshot.isDraggingOver && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center p-4">
                  {filterActive ? "No tasks match the current filters." : "Drag tasks here or add a new one below."}
                </p>
              )}
              {tasksToShow.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  index={index}
                  groupColor={group.color}
                  selected={selectedTaskIds.has(task.id)}
                  onSelectedChange={(sel) => toggleTaskSelected(task.id, sel)}
                  onUpdateTaskField={(taskId, field, value) => onUpdateTaskField(group.id, taskId, field, value)}
                  availableStatuses={availableStatuses}
                  setAvailableStatuses={setAvailableStatuses}
                  allTags={allTags}
                  onDeleteGlobalTag={onDeleteGlobalTag}
                  readOnly={readOnly}
                  dragDisabled={dragDisabled}
                  owners={owners}
                />
              ))}
              {provided.placeholder}
            </CardContent>
          )}
        </Droppable>
      )}
      {!collapsed && (
        <CardFooter className="p-4 border-t bg-white dark:bg-gray-800">
          <Input
            type="text"
            placeholder="Add a new task..."
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (!readOnly) {
                  if (newTaskContent.trim()) {
                    onAddTask(group.id, newTaskContent.trim());
                    setNewTaskContent('');
                  }
                }
              }
            }}
            className="flex-grow mr-2"
            disabled={readOnly}
          />
          <Button
            onClick={() => {
              if (!readOnly) {
                if (newTaskContent.trim()) {
                  onAddTask(group.id, newTaskContent.trim());
                  setNewTaskContent('');
                }
              }
            }}
            size="icon"
            disabled={readOnly}
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default TaskGroup;