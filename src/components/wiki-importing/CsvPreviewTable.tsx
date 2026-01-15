"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CsvData } from "@/utils/csv";

type Props = {
  data: CsvData | null;
  maxRows?: number;
  removeHeaders?: string[];
};

const CsvPreviewTable: React.FC<Props> = ({ data, maxRows = 10, removeHeaders = [] }) => {
  if (!data) {
    return (
      <div className="w-full overflow-auto border rounded-md">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <div className="text-sm text-muted-foreground">No data to preview.</div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  const maxCols = Math.max(data.headers.length, ...data.rows.map((r) => r.length));
  const headers: string[] = Array.from({ length: maxCols }, (_, i) => data.headers[i] || `Column ${i + 1}`);

  const removed = new Set(removeHeaders);
  const displayColIndices = headers
    .map((h, idx) => ({ h, idx }))
    .filter(({ h }) => !removed.has(h))
    .map(({ idx }) => idx);

  const rowCount = Math.min(maxRows, data.rows.length);

  return (
    <div className="w-full overflow-auto border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {displayColIndices.map((idx) => (
              <TableHead key={idx}>{headers[idx]}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rowCount === 0 && (
            <TableRow>
              <TableCell colSpan={Math.max(1, displayColIndices.length)}>
                <div className="text-sm text-muted-foreground">No rows to preview.</div>
              </TableCell>
            </TableRow>
          )}
          {Array.from({ length: rowCount }, (_, rIdx) => rIdx).map((rIdx) => {
            const row = data.rows[rIdx];
            return (
              <TableRow key={rIdx}>
                {displayColIndices.map((cIdx) => (
                  <TableCell key={cIdx} className="whitespace-nowrap">
                    {row[cIdx]?.value ?? ""}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default CsvPreviewTable;