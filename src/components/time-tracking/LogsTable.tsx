"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export type AggregatedLog = {
  id?: string;
  taskId: string;
  taskContent: string;
  date: string;
  durationSeconds: number;
  adminEdit?: boolean;
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
  canDeleteLogs?: boolean;
  deletingLogId?: string | null;
  onDeleteLog?: (log: AggregatedLog) => void;
};

const LogsTable: React.FC<LogsTableProps> = ({
  logs,
  selectedOwner,
  totalSeconds,
  canDeleteLogs = false,
  deletingLogId = null,
  onDeleteLog,
}) => {
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
                    {canDeleteLogs ? <TableHead className="w-[72px] text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, idx) => (
                    <TableRow key={log.id ?? `${log.taskContent}-${log.date}-${idx}`}>
                      <TableCell className="whitespace-nowrap">{log.date}</TableCell>
                      <TableCell className="min-w-[16rem]">{log.taskContent}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span>{formatDuration(log.durationSeconds)}</span>
                        {log.adminEdit ? (
                          <Badge variant="destructive" className="ml-2 align-middle">Admin Edit</Badge>
                        ) : null}
                      </TableCell>
                      {canDeleteLogs ? (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!log.id || deletingLogId === log.id}
                            onClick={() => onDeleteLog?.(log)}
                            aria-label="Delete time log"
                            title={!log.id ? "Saved log id unavailable" : "Delete time log"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      ) : null}
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
