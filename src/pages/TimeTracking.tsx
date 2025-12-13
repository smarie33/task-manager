"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { useTaskData } from "@/context/task-data-context";
import { usePayroll, type PaymentSettings } from "@/context/payroll-context";
import { useAuth } from "@/context/auth-context";
import { useSession } from "@/context/session-context";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import OwnerSelect from "@/components/time-tracking/OwnerSelect";
import DateRangePicker from "@/components/time-tracking/DateRangePicker";
import AddHoursForm from "@/components/time-tracking/AddHoursForm";
import PaymentSettingsCard from "@/components/time-tracking/PaymentSettingsCard";
import TotalsCard from "@/components/time-tracking/TotalsCard";
import LogsTable, { type AggregatedLog } from "@/components/time-tracking/LogsTable";
import { loadProfile } from "@/utils/profile-storage";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { insertTimeLog, updateTaskRow } from "@/services/db";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdge } from "@/utils/invokeEdge";

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

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

type AdminListUser = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Editor" | "Viewer";
  status: "pending" | "active";
};

const TimeTracking: React.FC = () => {
  const { groups, setGroups } = useTaskData();
  const { settings, updateSettingsForPerson } = usePayroll();
  const { role } = useAuth();
  const { session } = useSession();

  // Owners derived from tasks
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

  // Selected owner and date range
  const [selectedOwner, setSelectedOwner] = React.useState<string | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  // Admin users list for owner->user mapping (email preferred)
  const [adminUsers, setAdminUsers] = React.useState<AdminListUser[] | null>(null);
  React.useEffect(() => {
    if (role !== "Admin") return;
    invokeEdge<{ users: AdminListUser[] }>("admin-users", { action: "list" })
      .then(({ data }) => {
        const list = (data as any)?.users as AdminListUser[] | undefined;
        setAdminUsers(list ?? []);
      })
      .catch(() => setAdminUsers([]));
  }, [role]);

  // NEW: Build owner options for dropdown:
  // - Admin: all active users (name if present, otherwise email)
  // - Others: owners derived from tasks (unchanged)
  const ownersOptions = React.useMemo(() => {
    if (role === "Admin" && Array.isArray(adminUsers)) {
      const labels = adminUsers
        .filter(u => u.status === "active")
        .map(u => (u.name && u.name.trim().length > 0 ? u.name : (u.email || "")))
        .filter(Boolean) as string[];
      return Array.from(new Set(labels)).sort((a, b) => a.localeCompare(b));
    }
    return owners;
  }, [role, adminUsers, owners]);

  // Profile/session-based guess for non-admins
  const profile = React.useMemo(() => (typeof window !== "undefined" ? loadProfile() : null), []);
  const currentOwnerGuess = React.useMemo(() => {
    const name = profile?.name?.trim();
    const email = session?.user?.email?.trim();
    const candidates = [name, email].filter(Boolean) as string[];
    for (const c of candidates) {
      if (c && ownersOptions.includes(c)) return c;
    }
    // For non-admins, do not fall back to someone else
    return null;
  }, [ownersOptions, profile, session]);

  React.useEffect(() => {
    if (role !== "Admin") {
      setSelectedOwner(currentOwnerGuess);
      return;
    }
    if (!selectedOwner && ownersOptions.length > 0) {
      setSelectedOwner(ownersOptions[0]);
    } else if (selectedOwner && !ownersOptions.includes(selectedOwner)) {
      setSelectedOwner(ownersOptions[0] ?? null);
    }
  }, [ownersOptions, selectedOwner, role, currentOwnerGuess]);

  // Owner tasks for AddHoursForm
  const ownerTasks = React.useMemo(() => {
    if (!selectedOwner) return [];
    const list: { id: string; content: string }[] = [];
    for (const g of groups) {
      for (const t of g.tasks) {
        if ((t.owner || "").trim() === selectedOwner) {
          list.push({ id: t.id, content: t.content });
        }
      }
    }
    return list.sort((a, b) => a.content.localeCompare(b.content));
  }, [groups, selectedOwner]);

  // Aggregated logs for selected owner with date filtering
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
              adminEdit: !!log.adminEdit,
            });
          }
        }
      }
    }
    if (dateRange?.from || dateRange?.to) {
      const fromStr = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null;
      const toStr = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null;
      const inRange = (d: string) =>
        (!fromStr || d >= fromStr) && (!toStr || d <= toStr);
      result = result.filter((l) => inRange(l.date));
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [groups, selectedOwner, dateRange]);

  // Overall logs for owner for totals
  const allLogsForOwner = React.useMemo<AggregatedLog[]>(() => {
    if (!selectedOwner) return [];
    const res: AggregatedLog[] = [];
    for (const g of groups) {
      for (const t of g.tasks) {
        if ((t.owner || "").trim() === selectedOwner) {
          for (const log of t.timeLogs || []) {
            res.push({ taskContent: t.content, date: log.date, durationSeconds: log.durationSeconds, adminEdit: !!log.adminEdit });
          }
        }
      }
    }
    return res.sort((a, b) => a.date.localeCompare(b.date));
  }, [groups, selectedOwner]);

  const totalSeconds = logsForOwner.reduce((sum, l) => sum + l.durationSeconds, 0);

  // Selected range days and overall days for salary calculations
  const selectedRangeDays = React.useMemo(() => {
    if (logsForOwner.length === 0) {
      if (dateRange?.from && dateRange?.to) {
        return Math.max(0, differenceInCalendarDays(dateRange.to, dateRange.from) + 1);
      }
      return 0;
    }
    if (dateRange?.from && dateRange?.to) {
      return Math.max(0, differenceInCalendarDays(dateRange.to, dateRange.from) + 1);
    }
    const minDate = parseISO(logsForOwner[logsForOwner.length - 1].date);
    const maxDate = parseISO(logsForOwner[0].date);
    return Math.max(0, differenceInCalendarDays(maxDate, minDate) + 1);
  }, [logsForOwner, dateRange]);

  const overallDays = React.useMemo(() => {
    if (allLogsForOwner.length === 0) return 0;
    const minDate = parseISO(allLogsForOwner[0].date);
    const maxDate = parseISO(allLogsForOwner[allLogsForOwner.length - 1].date);
    return Math.max(0, differenceInCalendarDays(maxDate, minDate) + 1);
  }, [allLogsForOwner]);

  // Payments
  const ownerSettings: PaymentSettings | undefined = selectedOwner ? settings[selectedOwner] : undefined;

  const selectedTimeframePayment = React.useMemo(() => {
    if (!ownerSettings) return 0;
    if (ownerSettings.type === "hourly") {
      const hours = totalSeconds / 3600;
      const rate = ownerSettings.hourlyRate ?? 0;
      return Math.max(0, hours * rate);
    }
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

  // Save manual log handler
  const handleSaveManualLog = async (taskId: string, date: string, seconds: number) => {
    const isAdmin = role === "Admin";
    const targetUserId = isAdmin ? resolveOwnerToUserId(selectedOwner ?? null) : null;
    const usingAdminEdge = isAdmin && targetUserId && session?.user?.id && targetUserId !== session.user.id;

    // Immutably update the task's logs and timeTracking with setGroups
    setGroups((prev) =>
      prev.map((g) => {
        const taskIndex = g.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return g;
        const newTasks = g.tasks.map((t, idx) => {
          if (idx !== taskIndex) return t;
          const newLogs = [...(t.timeLogs || []), { durationSeconds: seconds, date, adminEdit: !!usingAdminEdge }];
          const newHoursTotal = (t.timeTracking || 0) + seconds / 3600;
          return { ...t, timeLogs: newLogs, timeTracking: newHoursTotal };
        });
        return { ...g, tasks: newTasks };
      })
    );

    // Persist: insert log (either as self or on behalf) + update task timeTracking
    if (session?.user) {
      if (usingAdminEdge) {
        await invokeEdge("time-logs", {
          action: "insert",
          payload: { userId: targetUserId, taskId, date, durationSeconds: seconds },
        });
      } else {
        await insertTimeLog(session.user.id, taskId, date, seconds);
      }
      // Update task row with new timeTracking value (UI state is the source of truth here)
      const task = groups.flatMap(g => g.tasks).find(t => t.id === taskId);
      const currentHours = (task?.timeTracking || 0) + seconds / 3600;
      await updateTaskRow(taskId, { timeTracking: currentHours });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Time Tracking</h1>
          <div className="flex items-center gap-3">
            {role === "Admin" && (
              <OwnerSelect owners={ownersOptions} value={selectedOwner} onChange={setSelectedOwner} />
            )}
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {/* Admins: Show Payment Settings above Add Hours */}
        {selectedOwner && role === "Admin" && (
          <PaymentSettingsCard
            owner={selectedOwner}
            ownerSettings={ownerSettings}
            currency={currency}
            selectedTimeframePayment={selectedTimeframePayment}
            overallPayment={overallPayment}
            onUpdate={updateSettingsForPerson}
          />
        )}

        <Card className="p-4 mb-4">
          {selectedOwner ? (
            <AddHoursForm
              ownerTasks={ownerTasks}
              onSave={handleSaveManualLog}
            />
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {role === "Admin"
                ? "Select a person to add hours."
                : "No tasks are assigned to you yet. Ask an admin to assign you to tasks before logging time."}
            </div>
          )}
        </Card>

        {/* Non-admins or no owner: show totals here (admins already saw payment settings above) */}
        {selectedOwner ? (
          role === "Admin" ? null : (
            <TotalsCard
              selectedTimeframePayment={selectedTimeframePayment}
              overallPayment={overallPayment}
              currency={currency}
              messageWhenNoOwner="No logs available for your account yet."
            />
          )
        ) : (
          <TotalsCard
            selectedTimeframePayment={0}
            overallPayment={0}
            currency={currency}
            messageWhenNoOwner={role === "Admin"
              ? "Select a person to manage payment settings and view totals."
              : "No logs available for your account yet."
            }
          />
        )}

        <Card className="mb-4">
          <LogsTable logs={logsForOwner} selectedOwner={selectedOwner} totalSeconds={totalSeconds} />
        </Card>
      </div>
    </div>
  );
};

export default TimeTracking;