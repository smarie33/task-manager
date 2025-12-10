"use client";

import React from "react";
import { useTaskData } from "@/context/task-data-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

type AggregatedLog = {
  taskContent: string;
  date: string;
  durationSeconds: number;
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

const TimeTracking: React.FC = () => {
  const { groups } = useTaskData();

  const owners = React.useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      for (const t of g.tasks) {
        const owner = (t.owner || "").trim();
        if (owner) set.add(owner);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [groups]);

  const [selectedOwner, setSelectedOwner] = React.useState<string | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  React.useEffect(() => {
    if (!selectedOwner && owners.length > 0) {
      setSelectedOwner(owners[0]);
    } else if (selectedOwner && !owners.includes(selectedOwner)) {
      // If current selection disappears, reset to first owner if available
      setSelectedOwner(owners[0] ?? null);
    }
  }, [owners, selectedOwner]);

  const logsForOwner = React.useMemo<AggregatedLog[]>(() => {
    if (!selectedOwner) return [];
    const result: AggregatedLog[] = [];
    for (const g of groups) {
      for (const t of g.tasks) {
        if ((t.owner || "").trim() === selectedOwner) {
          for (const log of t.timeLogs || []) {
            result.push({
              taskContent: t.content,
              date: log.date,
              durationSeconds: log.durationSeconds,
            });
          }
        }
      }
    }
    // Filter by date range if selected
    if (dateRange?.from || dateRange?.to) {
      const fromStr = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null;
      const toStr = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null;
      const inRange = (d: string) =>
        (!fromStr || d >= fromStr) && (!toStr || d <= toStr);
      result = result.filter((l) => inRange(l.date));
    }
    // sort by date descending
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [groups, selectedOwner, dateRange]);

  const totalSeconds = logsForOwner.reduce((sum, l) => sum + l.durationSeconds, 0);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Time Tracking</h1>
          <div className="flex items-center gap-3">
            <div className="w-48 sm:w-56">
              <Select
                value={selectedOwner ?? undefined}
                onValueChange={(val) => setSelectedOwner(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {owners.length > 0 ? (
                    owners.map((owner) => (
                      <SelectItem key={owner} value={owner}>
                        {owner}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1 text-sm text-gray-500">No people found</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[220px] justify-start text-left">
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
                    : "Select date range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
                <div className="flex justify-end gap-2 p-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
                    Clear
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Card className="p-4">
          {selectedOwner ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                  Showing logs for: <span className="font-semibold">{selectedOwner}</span>
                </div>
                <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                  Total: {formatDuration(totalSeconds)}
                </div>
              </div>

              {logsForOwner.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsForOwner.map((log, idx) => (
                        <TableRow key={`${log.taskContent}-${log.date}-${idx}`}>
                          <TableCell className="whitespace-nowrap">{log.date}</TableCell>
                          <TableCell className="min-w-[16rem]">{log.taskContent}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {formatDuration(log.durationSeconds)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400">No time logs yet for this person.</div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              No people available. Add owners and time logs from the Task Manager.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TimeTracking;