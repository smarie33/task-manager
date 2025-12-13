"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

type DateRangePickerProps = {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
};

const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[220px] justify-start text-left">
          {value?.from && value?.to
            ? `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`
            : "Select date range"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
        />
        <div className="flex justify-end gap-2 p-2 border-t">
          <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangePicker;