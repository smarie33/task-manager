"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlayIcon, PauseIcon } from "lucide-react";
import { Task } from "@/types/task";
import { darkenHexColor } from "@/lib/utils";
import { format } from "date-fns";

type TimeTrackingCellProps = {
  task: Task;
  groupColor: string;
  onUpdateTimeTracking: (hours: number) => void;
  onUpdateTimeLogs: (logs: NonNullable<Task["timeLogs"]>) => void;
  disabled?: boolean;
};

const TimeTrackingCell: React.FC<TimeTrackingCellProps> = ({
  task,
  groupColor,
  onUpdateTimeTracking,
  onUpdateTimeLogs,
  disabled = false,
}) => {
  const [isTimerRunning, setIsTimerRunning] = React.useState(false);
  const [displayedSeconds, setDisplayedSeconds] = React.useState(() => Math.round(task.timeTracking * 3600));
  const intervalRef = React.useRef<number | null>(null);
  const startRef = React.useRef<number | null>(null);
  const baseSecondsRef = React.useRef<number>(Math.round(task.timeTracking * 3600));
  const lastPersistMinuteRef = React.useRef<number>(Math.floor(task.timeTracking * 60));

  const [timeLogsOpen, setTimeLogsOpen] = React.useState(false);
  const [timeLogsDraft, setTimeLogsDraft] = React.useState<NonNullable<Task["timeLogs"]>>([]);

  const [editingTime, setEditingTime] = React.useState(false);
  const [editedTimeTracking, setEditedTimeTracking] = React.useState((task.timeTracking || 0).toString());

  // Keep displayed time in sync when not running
  React.useEffect(() => {
    if (!isTimerRunning) {
      const secs = Math.round(task.timeTracking * 3600);
      baseSecondsRef.current = secs;
      setDisplayedSeconds(secs);
      lastPersistMinuteRef.current = Math.floor(secs / 60);
      setEditedTimeTracking((secs / 3600).toFixed(2));
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

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const startTimer = () => {
    if (isTimerRunning) return;
    setIsTimerRunning(true);
    startRef.current = Date.now();
    intervalRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - (startRef.current || Date.now())) / 1000);
      const newSeconds = baseSecondsRef.current + elapsed;
      setDisplayedSeconds(newSeconds);

      const currentMinutes = Math.floor(newSeconds / 60);
      if (currentMinutes > lastPersistMinuteRef.current) {
        lastPersistMinuteRef.current = currentMinutes;
        onUpdateTimeTracking(newSeconds / 3600);
      }
    }, 1000);
  };

  const pauseTimer = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTimerRunning(false);
    const sessionSeconds = displayedSeconds - (baseSecondsRef.current || 0);
    const sessionDate = format(new Date(startRef.current ?? Date.now()), "yyyy-MM-dd");

    onUpdateTimeTracking(displayedSeconds / 3600);

    const newLogs = [...(task.timeLogs || []), { durationSeconds: Math.max(0, sessionSeconds), date: sessionDate }];
    onUpdateTimeLogs(newLogs);

    baseSecondsRef.current = displayedSeconds;
  };

  const commitManualTime = () => {
    const numValue = parseFloat(editedTimeTracking);
    if (!isNaN(numValue)) {
      const secs = Math.round(numValue * 3600);
      baseSecondsRef.current = secs;
      setDisplayedSeconds(secs);
      onUpdateTimeTracking(numValue);
    }
    setEditingTime(false);
  };

  return (
    <div className="flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700">
      {disabled ? (
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-sm truncate">{formatDuration(displayedSeconds)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400"
            disabled
            aria-label="Timer disabled"
            title="Timer disabled"
          >
            <PlayIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : editingTime ? (
        <Input
          value={editedTimeTracking}
          onChange={(e) => setEditedTimeTracking(e.target.value)}
          onBlur={commitManualTime}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitManualTime();
          }}
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
            <Popover
              open={timeLogsOpen}
              onOpenChange={(open) => {
                setTimeLogsOpen(open);
                if (open) {
                  setTimeLogsDraft(task.timeLogs || []);
                }
              }}
            >
              <PopoverTrigger asChild>
                <span
                  className="text-sm truncate cursor-pointer"
                  onClick={() => setTimeLogsOpen(true)}
                  title="View and edit time logs"
                >
                  {formatDuration(displayedSeconds)}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-80 sm:w-[22rem] p-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Time Logs</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTimeLogsDraft((prev) => [
                          ...prev,
                          {
                            durationSeconds: 0,
                            date: format(new Date(), "yyyy-MM-dd"),
                          },
                        ])
                      }
                    >
                      Add Log
                    </Button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {timeLogsDraft.length > 0 ? (
                      timeLogsDraft.map((log, idx) => {
                        const hours = Math.floor(log.durationSeconds / 3600);
                        const minutes = Math.floor((log.durationSeconds % 3600) / 60);
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={hours}
                                onChange={(e) => {
                                  const newHours = Math.max(0, parseInt(e.target.value || "0", 10));
                                  const newSeconds = newHours * 3600 + minutes * 60;
                                  setTimeLogsDraft((prev) =>
                                    prev.map((l, i) => (i === idx ? { ...l, durationSeconds: newSeconds } : l))
                                  );
                                }}
                                className="w-16 h-8 text-sm"
                                aria-label="Hours"
                              />
                              <span className="text-xs text-gray-600">h</span>
                              <Input
                                type="number"
                                min={0}
                                max={59}
                                step={1}
                                value={minutes}
                                onChange={(e) => {
                                  const newMinutes = Math.min(59, Math.max(0, parseInt(e.target.value || "0", 10)));
                                  const newSeconds = hours * 3600 + newMinutes * 60;
                                  setTimeLogsDraft((prev) =>
                                    prev.map((l, i) => (i === idx ? { ...l, durationSeconds: newSeconds } : l))
                                  );
                                }}
                                className="w-16 h-8 text-sm"
                                aria-label="Minutes"
                              />
                              <span className="text-xs text-gray-600">m</span>
                            </div>

                            <Input
                              type="date"
                              value={log.date}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                setTimeLogsDraft((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, date: newDate } : l))
                                );
                              }}
                              className="h-8 text-sm"
                              aria-label="Date"
                            />

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-red-500 ml-auto"
                              onClick={() => {
                                setTimeLogsDraft((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              title="Delete log"
                              aria-label="Delete log"
                            >
                              <span className="text-lg leading-none">&times;</span>
                            </Button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-gray-500">No time logs yet.</div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setTimeLogsOpen(false);
                        setTimeLogsDraft(task.timeLogs || []);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        onUpdateTimeLogs(timeLogsDraft);
                        setTimeLogsOpen(false);
                      }}
                    >
                      Save Logs
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
  );
};

export default TimeTrackingCell;