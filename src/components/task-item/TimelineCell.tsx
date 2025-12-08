"use client";

import React, { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, parseISO, isValid, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

type TimelineCellProps = {
  timeline: string;
  status: string;
  onChange: (newTimeline: string) => void;
  disabled?: boolean;
};

const TimelineCell: React.FC<TimelineCellProps> = ({ timeline, status, onChange, disabled = false }) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedDateRange: DateRange | undefined = useMemo(() => {
    if (timeline) {
      const parts = timeline.split(" - ");
      if (parts.length === 2) {
        const from = parseISO(parts[0]);
        const to = parseISO(parts[1]);
        if (isValid(from) && isValid(to)) return { from, to };
      } else {
        const from = parseISO(timeline);
        if (isValid(from)) return { from };
      }
    }
    return undefined;
  }, [timeline]);

  const getFormattedTimeline = (t: string): string => {
    if (!t) return "N/A";
    const parts = t.split(" - ");
    if (parts.length === 2) {
      const from = parseISO(parts[0]);
      const to = parseISO(parts[1]);
      if (isValid(from) && isValid(to)) {
        if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
          return `${format(from, "MMM dd")} - ${format(to, "dd")}`;
        } else {
          return `${format(from, "MMM dd")} - ${format(to, "MMM dd")}`;
        }
      }
    } else {
      const singleDate = parseISO(t);
      if (isValid(singleDate)) return format(singleDate, "MMM dd");
    }
    return t;
  };

  const isTimelinePast = (t: string): boolean => {
    if (!t || t === "N/A") return false;
    const parts = t.split(" - ");
    let dateToCheck: Date | null = null;
    if (parts.length === 2) {
      dateToCheck = parseISO(parts[1]);
    } else {
      dateToCheck = parseISO(t);
    }
    if (!dateToCheck || !isValid(dateToCheck)) return false;
    const startOfDateToCheck = startOfDay(dateToCheck);
    const startOfToday = startOfDay(new Date());
    return startOfDateToCheck < startOfToday;
  };

  const isTimelineFuture = (t: string): boolean => {
    if (!t || t === "N/A") return false;
    const parts = t.split(" - ");
    let dateToCheck: Date | null = null;
    if (parts.length === 2) {
      dateToCheck = parseISO(parts[0]);
    } else {
      dateToCheck = parseISO(t);
    }
    if (!dateToCheck || !isValid(dateToCheck)) return false;
    const startOfDateToCheck = startOfDay(dateToCheck);
    const startOfToday = startOfDay(new Date());
    return startOfDateToCheck > startOfToday;
  };

  const isPastDue = isTimelinePast(timeline);
  const isDoneAndFuture = status === "Done" && isTimelineFuture(timeline);
  const isDoneAndPast = status === "Done" && isTimelinePast(timeline);

  const handleDateSelect = (range: DateRange | undefined) => {
    let newTimelineString = "";
    if (range?.from) {
      newTimelineString = format(range.from, "yyyy-MM-dd");
      if (range.to && range.to !== range.from) {
        newTimelineString += ` - ${format(range.to, "yyyy-MM-dd")}`;
      }
    }
    onChange(newTimelineString);
    setCalendarOpen(false);
  };

  return (
    <div
      className={cn(
        "flex-grow min-w-0 border-r border-gray-200 dark:border-gray-700 text-center",
        isTimelinePast && status !== "Done" && "bg-red-500 text-white",
        (isDoneAndFuture || isDoneAndPast) && "bg-white text-black"
      )}
    >
      {disabled ? (
        <span className="text-sm truncate block px-2 py-2">{getFormattedTimeline(timeline)}</span>
      ) : (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <span
              className="text-sm truncate cursor-pointer block px-2 py-2"
              onClick={() => setCalendarOpen(true)}
            >
              {getFormattedTimeline(timeline)}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="range" selected={selectedDateRange} onSelect={handleDateSelect} initialFocus />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default TimelineCell;