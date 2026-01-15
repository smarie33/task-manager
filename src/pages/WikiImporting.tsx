"use client";

import React, { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CsvCell = { value: string; quoted: boolean };
type CsvRow = CsvCell[];
type CsvDataRich = { headers: string[]; rows: CsvRow };

const parseCSV = (text: string): CsvDataRich => {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): CsvRow => {
    const cells: CsvRow = [];
    let current = "";
    let inQuotes = false;
    let fieldWasQuoted = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
          fieldWasQuoted = true;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push({ value: current.trim(), quoted: fieldWasQuoted });
        current = "";
        fieldWasQuoted = false;
      } else {
        current += ch;
      }
    }
    cells.push({ value: current.trim(), quoted: fieldWasQuoted });
    return cells;
  };

  const headerCells = parseLine(lines[0]);
  const headers = headerCells.map((c) => c.value);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
};

const WikiImporting: React.FC = () => {
  const { toast } = useToast();
  const [destination, setDestination] = useState<"task" | "wiki">("task");
  const [csvPreview, setCsvPreview] = useState<CsvDataRich | null>(null);
  const [normalizedPreview, setNormalizedPreview] = useState<{ csFileName: string; fullMethodCode: string }[] | null>(null);
  const [fileName, setFileName] = useState<string>("");

  // Compute headers to display: original CSV headers (or Column N fallbacks)
  const origHeaders = React.useMemo(() => {
    if (!csvPreview) return [];
    const maxCols = Math.max(
      csvPreview.headers.length,
      ...csvPreview.rows.map((r) => r.length)
    );
    const headers: string[] = [];
    for (let i = 0; i < maxCols; i++) {
      headers.push(csvPreview.headers[i] || `Column ${i + 1}`);
    }
    return headers;
  }, [csvPreview]);

  // New: headers to remove (case sensitive)
  const removedHeaders = React.useMemo(
    () =>
      new Set([
        "Column 7",
        "Column 8",
        "Column 9",
        "Column 10",
        "Column 11",
        "Column 12",
        "CS File Name",
        "Full Method Code",
      ]),
    []
  );

  // New: indices of columns to display, preserving order
  const displayColIndices = React.useMemo(() => {
    return origHeaders
      .map((h, idx) => ({ h, idx }))
      .filter(({ h }) => !removedHeaders.has(h))
      .map(({ idx }) => idx);
  }, [origHeaders, removedHeaders]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setCsvPreview(null);
      setNormalizedPreview(null);
      setFileName("");
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCSV(text);

    // Normalize per rules:
    // - Method name: first quoted cell
    // - CS File Name: first non-quoted cell ending with ".cs"
    // - Full Method Code: everything strictly after the method name cell up to and including a cell that ends with '},' or equals '}' and is followed by a comma
    const normalized = parsed.rows.map((row) => {
      const methodIdx = row.findIndex((c) => c.quoted);
      const csCell = row.find((c) => !c.quoted && /\.cs$/i.test(c.value.trim()))?.value ?? "";

      // Find the end index: a cell that contains a closing brace followed by a comma
      // We consider matches like '},', '};', or a standalone '}' cell that is followed by a comma in the next field
      const isTerminator = (cell: CsvCell, idx: number) => {
        const v = cell.value.trim();
        if (/,?\s*},\s*$/.test(v) || /\};\s*$/.test(v) || /},\s*$/.test(v)) return true;
        // Handle a standalone '}' possibly followed by a comma in the next field
        if (/^\}$/.test(v)) {
          // if next cell exists and is empty (common when trailing comma is split), count current as terminator
          const next = row[idx + 1];
          if (next && next.value.trim() === "") return true;
          // If the current cell literally ends with '},' but parser split, still treat it as terminator
          return true;
        }
        return false;
      };

      let endIdx = -1;
      for (let i = row.length - 1; i > methodIdx; i--) {
        if (isTerminator(row[i], i)) {
          endIdx = i;
          break;
        }
      }

      // Build Full Method Code slice: from methodIdx+1 to endIdx (inclusive if found), otherwise to end of row
      const sliceStart = methodIdx >= 0 ? methodIdx + 1 : 0;
      const sliceEnd = endIdx >= sliceStart ? endIdx + 1 : row.length;
      const fullMethodCode = row.slice(sliceStart, sliceEnd).map((c) => c.value).join("\n").trim();

      return {
        csFileName: csCell,
        fullMethodCode,
      };
    });

    setCsvPreview(parsed);
    setNormalizedPreview(normalized);
    toast({ title: "CSV loaded", description: `Parsed ${parsed.rows.length} rows from ${file.name}.` });
  };

  // Prepare preview indices
  const previewCount = Math.min(
    10,
    csvPreview ? csvPreview.rows.length : 0
  );
  const previewIndices = Array.from({ length: previewCount }, (_, i) => i);

  const handleImport = () => {
    if (!csvPreview || csvPreview.rows.length === 0) {
      toast({ title: "No data", description: "Please select a CSV file with at least one data row." });
      return;
    }
    const destLabel = destination === "task" ? "Task Manager" : "Wiki";
    toast({
      title: "Import complete",
      description: `Ready to import ${csvPreview.rows.length} rows to ${destLabel}.`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-5xl flex-1 w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Importing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Select value={destination} onValueChange={(v) => setDestination(v as "task" | "wiki")}>
                  <SelectTrigger id="destination">
                    <SelectValue placeholder="Choose destination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task Manager</SelectItem>
                    <SelectItem value="wiki">Wiki</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  Choose where to import your CSV data.
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="csvFile">CSV File</Label>
                <Input id="csvFile" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
                <div className="text-xs text-muted-foreground">
                  {fileName ? `Selected: ${fileName}` : "Upload a .csv file"}
                </div>
              </div>
            </div>

            {csvPreview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Previewing first {previewIndices.length} of {csvPreview.rows.length} rows
                  </div>
                  <Button onClick={handleImport}>Import</Button>
                </div>
                <div className="w-full overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {displayColIndices.map((idx) => (
                          <TableHead key={idx}>{origHeaders[idx]}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewIndices.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={Math.max(1, displayColIndices.length)}>
                            <div className="text-sm text-muted-foreground">No rows to preview.</div>
                          </TableCell>
                        </TableRow>
                      )}
                      {previewIndices.map((rIdx) => {
                        const origRow = csvPreview!.rows[rIdx];
                        return (
                          <TableRow key={rIdx}>
                            {displayColIndices.map((cIdx) => (
                              <TableCell key={cIdx} className="whitespace-nowrap">
                                {(origRow[cIdx]?.value ?? "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default WikiImporting;