"use client";

import React, { useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Trash2Icon, PencilIcon, FileIcon, PlusIcon, PlayIcon, PauseIcon } from 'lucide-react';
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

  // ADD: timer state and refs
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [displayedSeconds, setDisplayedSeconds] = useState(() => Math.round(task.timeTracking * 3600));
  const intervalRef = React.useRef<number | null>(null);
  const startRef = React.useRef<number | null>(null);
  const baseSecondsRef = React.useRef<number>(Math.round(task.timeTracking * 3600));
  const lastPersistMinuteRef = React.useRef<number>(Math.floor(task.timeTracking * 60));

  // ADD: open state for time logs popover
  const [timeLogsOpen, setTimeLogsOpen] = useState(false);

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

  // Keep displayed time in sync when not running
  React.useEffect(() => {
    if (!isTimerRunning) {
      const secs = Math.round(task.timeTracking * 3600);
      baseSecondsRef.current = secs;
      setDisplayedSeconds(secs);
      lastPersistMinuteRef.current = Math.floor(secs / 60);
    }
  }, [task.timeTracking, isTimerRunning]);

  // Clear interval on unmount
  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleSaveEdit = (field: keyof Task, value: any) => {
    if (field === 'timeTracking') {
      // If editing while running, pause first
      if (isTimerRunning) {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
        setIsTimerRunning(false);
      }
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue !== task.timeTracking) {
        const secs = Math.round(numValue * 3600);
        baseSecondsRef.current = secs;
        setDisplayedSeconds(secs);
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

  // ADD: duration formatter
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // ADD: start/pause handlers
  const startTimer = () => {
    if (isTimerRunning) return;
    setIsTimerRunning(true);
    startRef.current = Date.now();
    intervalRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - (startRef.current || Date.now())) / 1000);
      const newSeconds = baseSecondsRef.current + elapsed;
      setDisplayedSeconds(newSeconds);

      // Persist roughly every minute to reduce re-renders
      const currentMinutes = Math.floor(newSeconds / 60);
      if (currentMinutes > lastPersistMinuteRef.current) {
        lastPersistMinuteRef.current = currentMinutes;
        onUpdateTaskField(task.id, 'timeTracking', newSeconds / 3600);
      }
    }, 1000);
  };

  const pauseTimer = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTimerRunning(false);
    // Compute this session's duration BEFORE updating baseSeconds
    const sessionSeconds = displayedSeconds - (baseSecondsRef.current || 0);
    const sessionDate = format(new Date(startRef.current ?? Date.now()), 'yyyy-MM-dd');

    // Persist total time
    onUpdateTaskField(task.id, 'timeTracking', displayedSeconds / 3600);

    // Persist session log
    const newLogs = [...(task.timeLogs || []), { durationSeconds: Math.max(0, sessionSeconds), date: sessionDate }];
    onUpdateTaskField(task.id, 'timeLogs', newLogs);

    // Update base to the new displayed value
    baseSecondsRef.current = displayedSeconds;
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
                            <Button
                              key={status.name}
                              variant="outline"
                              className="flex h-10 w-full items-center justify-between text-xs font-medium rounded-none py-1 px-2"
                              style={{ backgroundColor: lightenHexColor(status.color, 0.8), color: status.color, borderColor: status.color }}
                              onClick={() => handleStatusSelect(status.name)}
                            >
                              <span className="flex-1 text-center">{status.name}</span>
                              {
                                !['done', 'in progress'].includes(status.name.toLowerCase()) && (
                                  <span
                                    role="button"
                                    aria-label={`Delete status ${status.name}`}
                                    className="ml-2 text-destructive hover:text-destructive/90"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleDeleteStatus(status.name);
                                    }}
                                  >
                                    <Trash2Icon className="h-4 w-4" />
                                  </span>
                                )
                              }
                            </Button>
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
                    {editingField === 'timeTracking' ? (
                      <Input
                        value={editedTimeTracking}
                        onChange={(e) => setEditedTimeTracking(e.target.value)}
                        onBlur={() => handleSaveEdit('timeTracking', editedTimeTracking)}
                        onKeyDown={(e) => handleKeyDown(e, 'timeTracking', editedTimeTracking)}
                        className="h-7 text-sm p-1 px-2 rounded-none border-2"
                        autoFocus
                        type="number"
                        style={{
                          borderColor: darkenHexColor(groupColor, 0.5),
                          boxShadow: `inset 0 0 0 1px ${groupColor}`,
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-between px-2 py-2">
                        <div className="flex items-center gap-1">
                          {/* Time display opens logs popover */}
                          <Popover open={timeLogsOpen} onOpenChange={setTimeLogsOpen}>
                            <PopoverTrigger asChild>
                              <span
                                className="text-sm truncate cursor-pointer"
                                onClick={() => setTimeLogsOpen(true)}
                                title="View time logs"
                              >
                                {formatDuration(displayedSeconds)}
                              </span>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2">
                              <div className="space-y-2">
                                <div className="text-sm font-semibold">Time Logs</div>
                                <div className="max-h-48 overflow-y-auto">
                                  {task.timeLogs && task.timeLogs.length > 0 ? (
                                    task.timeLogs.map((log, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-sm py-1">
                                        <span>{formatDuration(log.durationSeconds)}</span>
                                        <span className="text-gray-500">{log.date}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs text-gray-500">No time logs yet.</div>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          {/* Edit manual time value */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-500 hover:text-blue-500"
                            onClick={() => {
                              setEditedTimeTracking((displayedSeconds / 3600).toFixed(2));
                              setEditingField('timeTracking');
                            }}
                            aria-label="Edit time"
                            title="Edit time"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-500 hover:text-blue-500"
                          onClick={() => (isTimerRunning ? pauseTimer() : startTimer())}
                          aria-label={isTimerRunning ? "Pause timer" : "Start timer"}
                          title={isTimerRunning ? "Pause" : "Play"}
                        >
                          {isTimerRunning ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
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