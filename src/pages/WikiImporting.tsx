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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setCsvPreview(null);
      setFileName("");
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCSV(text);

    // Normalize: .cs -> CS File Name, quoted fields -> Full Method Code
    const normalized = parsed.rows.map((row) => {
      const csCell = row.find((c) => /\.cs$/i.test(c.value.trim()));
      const quotedCells = row.filter((c) => c.quoted).map((c) => c.value);
      const nonCsCells = row.filter((c) => !/\.cs$/i.test(c.value.trim())).map((c) => c.value);

      return {
        csFileName: csCell?.value ?? "",
        fullMethodCode: quotedCells.length ? quotedCells.join(" ") : nonCsCells.join(" "),
      };
    });

    setCsvPreview(parsed);
    setNormalizedPreview(normalized);
    toast({ title: "CSV loaded", description: `Parsed ${parsed.rows.length} rows from ${file.name}.` });
  };

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

  const previewRows = normalizedPreview ? normalizedPreview.slice(0, 10) : [];

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
                    Previewing first {previewRows.length} of {csvPreview.rows.length} rows
                  </div>
                  <Button onClick={handleImport}>Import</Button>
                </div>
                <div className="w-full overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CS File Name</TableHead>
                        <TableHead>Full Method Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2}>
                            <div className="text-sm text-muted-foreground">No rows to preview.</div>
                          </TableCell>
                        </TableRow>
                      )}
                      {previewRows.map((row, rIdx) => (
                        <TableRow key={rIdx}>
                          <TableCell className="whitespace-nowrap">{row.csFileName}</TableCell>
                          <TableCell className="whitespace-pre-wrap break-words">{row.fullMethodCode}</TableCell>
                        </TableRow>
                      ))}
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