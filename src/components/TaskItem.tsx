"use client";

import React, { useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Trash2Icon, PencilIcon, FileIcon } from 'lucide-react';
import { cn, lightenHexColor } from '@/lib/utils';
import { Task, StatusOption } from './TaskManager'; // Import Task and StatusOption interfaces
import { format, parseISO, isValid } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface TaskItemProps {
  task: Task;
  index: number;
  groupColor: string;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskField: <K extends keyof Task>(taskId: string, field: K, value: Task[K]) => void;
  availableStatuses: StatusOption[];
}

const TaskItem: React.FC<TaskItemProps> = ({ task, index, groupColor, onDeleteTask, onUpdateTaskField, availableStatuses }) => {
  const [editingField, setEditingField] = useState<keyof Task | null>(null);
  const [editedContent, setEditedContent] = useState(task.content);
  const [editedOwner, setEditedOwner] = useState(task.owner);
  const [editedTimeline, setEditedTimeline] = useState(task.timeline);
  const [editedTimeTracking, setEditedTimeTracking] = useState(task.timeTracking.toString());
  const [editedTags, setEditedTags] = useState(task.tags.join(', '));

  const [calendarOpen, setCalendarOpen] = useState(false);
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
    setEditedTimeline(newTimelineString); // Update local state for display
    // setCalendarOpen(false); // Optionally close popover after selection
  };

  const getFormattedTimeline = (timeline: string): string => {
    if (!timeline) return 'N/A';

    const parts = timeline.split(' - ');
    if (parts.length === 2) {
      const from = parseISO(parts[0]);
      const to = parseISO(parts[1]);

      if (isValid(from) && isValid(to)) {
        if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
          // Same month, same year: "MMM DD - DD"
          return `${format(from, 'MMM dd')} - ${format(to, 'dd')}`;
        } else {
          // Different months or years: "MMM DD - MMM DD"
          return `${format(from, 'MMM dd')} - ${format(to, 'MMM dd')}`;
        }
      }
    } else {
      const singleDate = parseISO(timeline);
      if (isValid(singleDate)) {
        // Single date: "MMM DD"
        return format(singleDate, 'MMM dd');
      }
    }
    return timeline; // Fallback to original if parsing fails
  };

  const renderField = (field: keyof Task, displayValue: React.ReactNode, editValue: string | number, setEditValue: (value: string) => void) => {
    const isCurrentlyEditing = editingField === field;
    const inputType = field === 'timeTracking' ? 'number' : 'text';

    if (field === 'timeline') {
      return (
        <Popover open={calendarOpen} onOpenChange={(open) => {
          setCalendarOpen(open);
          if (!open) {
            setEditingField(null); // Close editing mode when popover closes
          }
        }}>
          <PopoverTrigger asChild>
            <span className="text-sm truncate cursor-pointer block px-2 py-2" onClick={() => {
              setEditingField(field); // Set editing field when trigger is clicked
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
            className="h-7 text-sm p-1 px-2"
            autoFocus
            type={inputType}
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
  const statusColor = currentStatusOption ? currentStatusOption.color : '#6b7280'; // Default gray if status not found

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
              className="flex items-center" // Use flex to align sticky and scrollable parts
              style={editingBackgroundColor ? { backgroundColor: editingBackgroundColor } : {}}
            >
              {/* Sticky Item Column */}
              <div className="w-[150px] sticky left-0 z-10 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                {renderField('content', task.content, editedContent, setEditedContent)}
              </div>

              {/* Scrollable Columns Container */}
              <div className="flex-grow overflow-x-auto">
                <div className="grid grid-cols-[repeat(5,_minmax(150px,_1fr))_minmax(50px,_0.5fr)_auto] min-w-max items-center">
                  {/* Owner */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
                    {renderField('owner', task.owner || 'N/A', editedOwner, setEditedOwner)}
                  </div>

                  {/* Status */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
                    <Select
                      value={task.status}
                      onValueChange={(value: string) => onUpdateTaskField(task.id, 'status', value)}
                    >
                      <SelectTrigger className="h-auto text-xs px-2 py-2">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }}></span>
                          <SelectValue placeholder="Status" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {availableStatuses.map(status => (
                          <SelectItem key={status.name} value={status.name}>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }}></span>
                              {status.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Timeline */}
                  <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
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