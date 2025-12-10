"use client";

import React from "react";
import { useTaskData } from "@/context/task-data-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { usePayroll, PaymentSettings } from "@/context/payroll-context";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import AppHeader from "@/components/AppHeader";

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
  const { settings, updateSettingsForPerson } = usePayroll();

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
    let result: AggregatedLog[] = [];
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

  // Compute all logs for owner (overall)
  const allLogsForOwner = React.useMemo<AggregatedLog[]>(() => {
    if (!selectedOwner) return [];
    const res: AggregatedLog[] = [];
    for (const g of groups) {
      for (const t of g.tasks) {
        if ((t.owner || "").trim() === selectedOwner) {
          for (const log of t.timeLogs || []) {
            res.push({ taskContent: t.content, date: log.date, durationSeconds: log.durationSeconds });
          }
        }
      }
    }
    return res.sort((a, b) => a.date.localeCompare(b.date));
  }, [groups, selectedOwner]);

  const totalSeconds = logsForOwner.reduce((sum, l) => sum + l.durationSeconds, 0);

  // Helpers for payment calculation
  const getPeriodDays = (freq?: PaymentSettings["salaryFrequency"]): number => {
    switch (freq) {
      case "weekly":
        return 7;
      case "monthly":
        return 30;
      case "yearly":
        return 365;
      default:
        return 30;
    }
  };

  const ownerSettings: PaymentSettings | undefined = selectedOwner ? settings[selectedOwner] : undefined;

  const selectedRangeDays = React.useMemo(() => {
    if (logsForOwner.length === 0) {
      // If no logs are shown, derive range from dateRange if set
      if (dateRange?.from && dateRange?.to) {
        return Math.max(0, differenceInCalendarDays(dateRange.to, dateRange.from) + 1);
      }
      return 0;
    }
    // If dateRange is set, compute days between its endpoints; otherwise, use min/max of filtered logs
    if (dateRange?.from && dateRange?.to) {
      return Math.max(0, differenceInCalendarDays(dateRange.to, dateRange.from) + 1);
    }
    const minDate = parseISO(logsForOwner[logsForOwner.length - 1].date); // since logsForOwner sorted desc
    const maxDate = parseISO(logsForOwner[0].date);
    return Math.max(0, differenceInCalendarDays(maxDate, minDate) + 1);
  }, [logsForOwner, dateRange]);

  const overallDays = React.useMemo(() => {
    if (allLogsForOwner.length === 0) return 0;
    const minDate = parseISO(allLogsForOwner[0].date);
    const maxDate = parseISO(allLogsForOwner[allLogsForOwner.length - 1].date);
    return Math.max(0, differenceInCalendarDays(maxDate, minDate) + 1);
  }, [allLogsForOwner]);

  const selectedTimeframePayment = React.useMemo(() => {
    if (!ownerSettings) return 0;
    if (ownerSettings.type === "hourly") {
      const hours = totalSeconds / 3600;
      const rate = ownerSettings.hourlyRate ?? 0;
      return Math.max(0, hours * rate);
    }
    // salary
    const amount = ownerSettings.salaryAmount ?? 0;
    const periodDays = getPeriodDays(ownerSettings.salaryFrequency);
    const dailyRate = periodDays > 0 ? amount / periodDays : 0;
    return Math.max(0, dailyRate * selectedRangeDays);
  }, [ownerSettings, totalSeconds, selectedRangeDays]);

  const overallPayment = React.useMemo(() => {
    if (!ownerSettings) return 0;
    if (ownerSettings.type === "hourly") {
      const hours = allLogsForOwner.reduce((sum, l) => sum + l.durationSeconds, 0) / 3600;
      const rate = ownerSettings.hourlyRate ?? 0;
      return Math.max(0, hours * rate);
    }
    const amount = ownerSettings.salaryAmount ?? 0;
    const periodDays = getPeriodDays(ownerSettings.salaryFrequency);
    const dailyRate = periodDays > 0 ? amount / periodDays : 0;
    return Math.max(0, dailyRate * overallDays);
  }, [ownerSettings, allLogsForOwner, overallDays]);

  const currency = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <AppHeader />
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

        <Card className="p-4 mb-4">
          {selectedOwner ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-semibold mb-2">Payment Settings</div>
                <RadioGroup
                  value={ownerSettings?.type ?? "hourly"}
                  onValueChange={(val) =>
                    updateSettingsForPerson(selectedOwner, { type: val as PaymentSettings["type"] })
                  }
                  className="flex gap-4 mb-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hourly" id="type-hourly" />
                    <Label htmlFor="type-hourly">Hourly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="salary" id="type-salary" />
                    <Label htmlFor="type-salary">Salary</Label>
                  </div>
                </RadioGroup>

                {ownerSettings?.type === "hourly" || !ownerSettings ? (
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="hourly-rate">Hourly Rate (USD)</Label>
                      <input
                        id="hourly-rate"
                        type="number"
                        className="mt-1 w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm dark:bg-gray-800 dark:border-gray-700"
                        value={String(ownerSettings?.hourlyRate ?? 0)}
                        onChange={(e) =>
                          updateSettingsForPerson(selectedOwner, {
                            hourlyRate: Math.max(0, parseFloat(e.target.value || "0")),
                          })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="salary-amount">Salary Amount (USD)</Label>
                      <input
                        id="salary-amount"
                        type="number"
                        className="mt-1 w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm dark:bg-gray-800 dark:border-gray-700"
                        value={String(ownerSettings?.salaryAmount ?? 0)}
                        onChange={(e) =>
                          updateSettingsForPerson(selectedOwner, {
                            salaryAmount: Math.max(0, parseFloat(e.target.value || "0")),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Frequency</Label>
                      <Select
                        value={ownerSettings?.salaryFrequency ?? "monthly"}
                        onValueChange={(val) =>
                          updateSettingsForPerson(selectedOwner, {
                            salaryFrequency: val as PaymentSettings["salaryFrequency"],
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">Totals</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Selected timeframe total
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {currency(selectedTimeframePayment)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Overall total
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {currency(overallPayment)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Select a person to manage payment settings and view totals.
            </div>
          )}
        </Card>

        <Card className="p-4">
          {selectedOwner ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                  Showing logs for: <span className="font-semibold">{selectedOwner}</span>
                </div>
                <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                  Total Time: {formatDuration(totalSeconds)}
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