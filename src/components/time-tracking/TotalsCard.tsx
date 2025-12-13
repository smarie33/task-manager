"use client";

import React from "react";
import { Card } from "@/components/ui/card";

type TotalsCardProps = {
  selectedTimeframePayment: number;
  overallPayment: number;
  currency: (n: number) => string;
  messageWhenNoOwner?: string;
};

const TotalsCard: React.FC<TotalsCardProps> = ({
  selectedTimeframePayment,
  overallPayment,
  currency,
  messageWhenNoOwner,
}) => {
  return (
    <Card className="p-4 mb-4">
      {typeof selectedTimeframePayment === "number" ? (
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
      ) : (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {messageWhenNoOwner || "No data available."}
        </div>
      )}
    </Card>
  );
};

export default TotalsCard;