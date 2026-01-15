"use client";

import React, { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { CsvData } from "@/utils/csv";

export type CsvData = {
  headers: string[];
  rows: string[][];
};

type Props = {
  data: CsvData;
  removeHeaders?: string[];
  pageSize?: number;
  pageSizeOptions?: number[];
};

const CsvPreviewTable: React.FC<Props> = ({
  data,
  removeHeaders = [],
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [size, setSize] = useState(pageSize);

  // Compute visible headers by removing unwanted ones
  const visibleHeaderIndexes = useMemo(() => {
    return data.headers
      .map((h, idx) => ({ h, idx }))
      .filter(({ h }) => !removeHeaders.includes(h))
      .map(({ idx }) => idx);
  }, [data.headers, removeHeaders]);

  const visibleHeaders = useMemo(() => {
    return visibleHeaderIndexes.map((idx) => data.headers[idx]);
  }, [data.headers, visibleHeaderIndexes]);

  const filteredRows = useMemo(() => {
    return data.rows.map((row) =>
      visibleHeaderIndexes.map((idx) => (row[idx]?.value ?? ""))
    );
  }, [data.rows, visibleHeaderIndexes]);

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / size));
  const clampedPage = Math.min(currentPage, totalPages);

  const pageStart = (clampedPage - 1) * size;
  const pageEnd = pageStart + size;
  const pageRows = filteredRows.slice(pageStart, pageEnd);

  const gotoPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const gotoNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const onChangePageSize = (newSize: number) => {
    setSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {pageRows.length === 0 ? 0 : pageStart + 1}
          {"–"}
          {Math.min(pageEnd, totalRows)} of {totalRows}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page</span>
            <Select
              value={String(size)}
              onValueChange={(v) => onChangePageSize(Number(v))}
            >
              <SelectTrigger className="w-[90px] h-8">
                <SelectValue placeholder={`${size}`} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={gotoPrev}
              disabled={clampedPage <= 1}
            >
              Prev
            </Button>
            <div className="text-sm min-w-[80px] text-center">
              Page {clampedPage} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={gotoNext}
              disabled={clampedPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full overflow-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleHeaders.map((h) => (
                <TableHead key={h} className="whitespace-nowrap">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleHeaders.length}>
                  <div className="text-sm text-muted-foreground">No rows to display.</div>
                </TableCell>
              </TableRow>
            ) : (
              {pageRows.map((row, i) => (
                <TableRow key={`${pageStart + i}`}>
                  {row.map((cell, ci) => (
                    <TableCell key={ci} className="whitespace-nowrap">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CsvPreviewTable;