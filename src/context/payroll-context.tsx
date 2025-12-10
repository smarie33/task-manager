"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type PaymentType = "hourly" | "salary";
export type SalaryFrequency = "weekly" | "monthly" | "yearly";

export type PaymentSettings = {
  type: PaymentType;
  hourlyRate?: number; // dollars per hour
  salaryAmount?: number; // dollars per period
  salaryFrequency?: SalaryFrequency;
};

type PayrollContextValue = {
  settings: Record<string, PaymentSettings>;
  setSettingsForPerson: (person: string, next: PaymentSettings) => void;
  updateSettingsForPerson: (person: string, partial: Partial<PaymentSettings>) => void;
};

const STORAGE_KEY = "payroll:settings";

const loadSettings = (): Record<string, PaymentSettings> => {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as Record<string, PaymentSettings>) : {};
  } catch {
    return {};
  }
};

const saveSettings = (data: Record<string, PaymentSettings>) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

const PayrollContext = createContext<PayrollContextValue | undefined>(undefined);

export const PayrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, PaymentSettings>>(() => loadSettings());

  const setSettingsForPerson = (person: string, next: PaymentSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, [person]: next };
      saveSettings(updated);
      return updated;
    });
  };

  const updateSettingsForPerson = (person: string, partial: Partial<PaymentSettings>) => {
    setSettings((prev) => {
      const prevSettings = prev[person] ?? { type: "hourly", hourlyRate: 0 };
      const updated = { ...prev, [person]: { ...prevSettings, ...partial } };
      saveSettings(updated);
      return updated;
    });
  };

  const value = useMemo(
    () => ({ settings, setSettingsForPerson, updateSettingsForPerson }),
    [settings]
  );

  return <PayrollContext.Provider value={value}>{children}</PayrollContext.Provider>;
};

export const usePayroll = () => {
  const ctx = useContext(PayrollContext);
  if (!ctx) throw new Error("usePayroll must be used within PayrollProvider");
  return ctx;
};