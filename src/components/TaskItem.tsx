"use client";

import React, { useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Trash2Icon, PencilIcon, FileIcon, PlusIcon } from 'lucide-react';
import { cn, lightenHexColor, darkenHexColor } from '@/lib/utils';
import { Task, StatusOption } from './TaskManager';
import { format, parseISO, isValid, startOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useSynchronizedScroll } from "@/components/SynchronizedScrollProvider";

interface TaskItemProps {
  task: Task;
  index: number;
  groupColor: string;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskField: <K extends keyof Task>(taskId: string, field: K, value: Task[K]) => void;
  availableStatuses: StatusOption[];
  setAvailableStatuses: React.Dispatch<React.SetStateAction<StatusOption[]>>;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, index, groupColor, onDeleteTask, onUpdateTaskField, availableStatuses, setAvailableStatuses }) => {
  const [editingField, setEditingField] = useState<keyof Task | null>(null);
  const [editedContent, setEditedContent] = useState(task.content);
  const [editedOwner, setEditedOwner] = useState(task.owner);
  const [editedTimeline, setEditedTimeline] = useState(task.timeline);
  const [editedTimeTracking, setEditedTimeTracking] = useState(task.timeTracking.toString());
  const [editedTags, setEditedTags] = useState(task.tags.join(', '));

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#60a5fa');

  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(() => {
    if (task.timeline) {
      const parts = task.timeline.split(' - ');
      if (parts.length === 2) {
        const from = parseISO(parts[0]);
        const to = parseISO(parts[1]);
        if (isValid(from) && isValid(to)) return { from, to };
      } else {
        const from = parseISO(task.timeline);
        if (isValid(from)) return { from };
      }
    }
    return undefined;
  });

  const { ref: scrollItemRef, onScroll: handleItemScroll } = useSynchronizedScroll();

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

  const handleDateSelect = (range: DateRange | undefined) => {
    setSelectedDateRange(range);
    let newTimelineString = '';
    if (range?.from) {
      newTimelineString = format(range.from, 'yyyy-MM-dd');
      if (range.to && range.to !== range.from) {
        newTimelineString += ` - ${format(range.to, 'yyyy-MM-dd')}`;
      }
    }
    onUpdateTaskField(task.id, 'timeline', newTimelineString);
    setEditedTimeline(newTimelineString);
    // setCalendarOpen(false); // Optionally close popover after selection
  };

  const handleStatusSelect = (statusName: string) => {
    onUpdateTaskField(task.id, 'status', statusName);
    setStatusPopoverOpen(false);
  };

  const handleAddStatus = () => {
    if (newStatusName.trim() && !availableStatuses.some(s => s.name === newStatusName.trim())) {
      setAvailableStatuses(prev => [...prev, { name: newStatusName.trim(), color: newStatusColor }]);
      setNewStatusName('');
      setNewStatusColor('#60a5fa');
    }
  };

  const handleDeleteStatus = (statusName: string) => {
    setAvailableStatuses(prev => prev.filter(s => s.name !== statusName));
  };

  const getFormattedTimeline = (timeline: string): string => {
    if (!timeline) return 'N/A';

    const parts = timeline.split(' - ');
    if (parts.length === 2) {
      const from = parseISO(parts[0]);
      const to = parseISO(parts[1]);

      if (isValid(from) && isValid(to)) {
        if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
          return `${format(from, 'MMM dd')} - ${format(to, 'dd')}`;
        } else {
          return `${format(from, 'MMM dd')} - ${format(to, 'MMM dd')}`;
        }
      }
    } else {
      const singleDate = parseISO(timeline);
      if (isValid(singleDate)) {
        return format(singleDate, 'MMM dd');
      }
    }
    return timeline;
  };

  const isTimelinePast = (timeline: string): boolean => {
    if (!timeline || timeline === 'N/A') return false;

    const parts = timeline.split(' - ');
    let dateToCheck: Date | null = null;

    if (parts.length === 2) {
      dateToCheck = parseISO(parts[1]); // Use the end date for ranges
    } else {
      dateToCheck = parseISO(timeline); // Use the single date
    }

    if (!dateToCheck || !isValid(dateToCheck)) return false;

    const startOfDateToCheck = startOfDay(dateToCheck);
    const startOfToday = startOfDay(new Date());

    return startOfDateToCheck < startOfToday; // Is the date before today (start of day)?
  };

  const isTimelineFuture = (timeline: string): boolean => {
    if (!timeline || timeline === 'N/A') return false;

    const parts = timeline.split(' - ');
    let dateToCheck: Date | null = null;

    if (parts.length === 2) {
      dateToCheck = parseISO(parts[0]); // Use the start date for ranges
    } else {
      dateToCheck = parseISO(timeline); // Use the single date
    }

    if (!dateToCheck || !isValid(dateToCheck)) return false;

    const startOfDateToCheck = startOfDay(dateToCheck);
    const startOfToday = startOfDay(new Date());

    return startOfDateToCheck > startOfToday; // Is the date after today (start of day)?
  };

  const renderField = (field: keyof Task, displayValue: React.ReactNode, editValue: string | number, setEditValue: (value: string) => void) => {
    const isCurrentlyEditing = editingField === field;
    const inputType = field === 'timeTracking' ? 'number' : 'text';

    if (field === 'timeline') {
      return (
        <Popover open={calendarOpen} onOpenChange={(open) => {
          setCalendarOpen(open);
          if (!open) {
            setEditingField(null);
          }
        }}>
          <PopoverTrigger asChild>
            <span className="text-sm truncate cursor-pointer block px-2 py-2" onClick={() => {
              setEditingField(field);
            }}>
              {displayValue || 'N/A'}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="range"
              selected={selectedDateRange}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );
    }

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
          <span className="text-sm truncate cursor-pointer block px-2 py-2" onClick={() => {
            setEditValue(task[field]?.toString() || '');
            setEditingField(field);
          }}>
            {displayValue}
          </span>
        )}
      </>
    );
  };

  const editingBackgroundColor = editingField ? lightenHexColor(groupColor, 0.75) : undefined;
  const currentStatusOption = availableStatuses.find(s => s.name === task.status);
  const statusColor = currentStatusOption ? currentStatusOption.color : '#6b7280';
  const isPastDue = isTimelinePast(task.timeline);
  const isDoneAndFuture = task.status === 'Done' && isTimelineFuture(task.timeline);
  const isDoneAndPast = task.status === 'Done' && isTimelinePast(task.timeline); // New condition

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
              {/* Sticky Item Column - First column of the grid */}
              <div className="sticky left-0 z-10 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                {renderField('content', task.content, editedContent, setEditedContent)}
              </div>

              {/* Scrollable Columns Container - Second column of the grid */}
              <div className="overflow-x-auto" ref={scrollItemRef} onScroll={handleItemScroll}>
                <div className="grid grid-cols-[repeat(5,_minmax(150px,_1fr))_minmax(50px,_0.5fr)_auto] min-w-[800px] items-center">
                  {/* Owner */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
                    {renderField('owner', task.owner || 'N/A', editedOwner, setEditedOwner)}
                  </div>

                  {/* Status */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
                    <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full text-sm px-2 py-2 justify-center rounded-none h-auto min-h-0"
                          style={{ backgroundColor: lightenHexColor(statusColor, 0.8), color: statusColor }}
                        >
                          <span className="flex items-center gap-2">
                            {task.status}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                          {availableStatuses.map(status => (
                            <div key={status.name} className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                className="flex-1 h-10 text-center text-xs font-medium rounded-none py-1"
                                style={{ backgroundColor: lightenHexColor(status.color, 0.8), color: status.color, borderColor: status.color }}
                                onClick={() => handleStatusSelect(status.name)}
                              >
                                {status.name}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteStatus(status.name)}
                                aria-label={`Delete status ${status.name}`}
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col gap-2 p-2 border-t pt-4">
                          <h4 className="text-sm font-semibold">Add New Status</h4>
                          <Input
                            type="text"
                            placeholder="New status name..."
                            value={newStatusName}
                            onChange={(e) => setNewStatusName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddStatus();
                            }}
                            className="w-full"
                          />
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={newStatusColor}
                              onChange={(e) => setNewStatusColor(e.target.value)}
                              className="w-10 h-10 p-0 border-none cursor-pointer"
                              title="Choose status color"
                            />
                            <Button onClick={handleAddStatus} className="flex-grow">
                              <PlusIcon className="h-4 w-4 mr-2" /> Add Status
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Timeline */}
                  <div className={cn(
                    "flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700 text-center",
                    isPastDue && task.status !== 'Done' && "bg-red-500 text-white", // Only apply red if not 'Done'
                    (isDoneAndFuture || isDoneAndPast) && "bg-white text-black" // Apply white/black for 'Done' tasks, whether future or past
                  )}>
                    {renderField('timeline', getFormattedTimeline(task.timeline), editedTimeline, setEditedTimeline)}
                  </div>

                  {/* Time Tracking */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
                    {renderField('timeTracking', `${task.timeTracking}h` || '0h', editedTimeTracking, setEditedTimeTracking)}
                  </div>

                  {/* Tags */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
                    {renderField('tags', task.tags.join(', ') || 'N/A', editedTags, setEditedTags)}
                  </div>

                  {/* Has Files */}
                  <div className="flex justify-center items-center py-2">
                    {task.hasFiles && <FileIcon className="h-4 w-4 text-gray-500" />}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1 w-14 justify-end py-2">
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
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
};

export default TaskItem;