"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PaymentSettings } from "@/context/payroll-context";

type PaymentSettingsCardProps = {
  owner: string;
  ownerSettings?: PaymentSettings;
  currency: (n: number) => string;
  selectedTimeframePayment: number;
  overallPayment: number;
  onUpdate: (person: string, partial: Partial<PaymentSettings>) => void;
};

const PaymentSettingsCard: React.FC<PaymentSettingsCardProps> = ({
  owner,
  ownerSettings,
  currency,
  selectedTimeframePayment,
  overallPayment,
  onUpdate,
}) => {
  return (
    <Card className="p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-semibold mb-2">Payment Settings</div>
          <RadioGroup
            value={ownerSettings?.type ?? "hourly"}
            onValueChange={(val) =>
              onUpdate(owner, { type: val as PaymentSettings["type"] })
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
                    onUpdate(owner, {
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
                    onUpdate(owner, {
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
                    onUpdate(owner, {
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
    </Card>
  );
};

export default PaymentSettingsCard;