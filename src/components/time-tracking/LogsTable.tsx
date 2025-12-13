"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type AggregatedLog = {
  taskContent: string;
  date: string;
  durationSeconds: number;
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

type LogsTableProps = {
  logs: AggregatedLog[];
  selectedOwner: string | null;
  totalSeconds: number;
};

const LogsTable: React.FC<LogsTableProps> = ({ logs, selectedOwner, totalSeconds }) => {
  return (
    <div className="p-4">
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

          {logs.length > 0 ? (
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
                  {logs.map((log, idx) => (
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
    </div>
  );
};

export default LogsTable;