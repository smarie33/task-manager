"use client";

import React, { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import CsvPreviewTable from "@/components/wiki-importing/CsvPreviewTable";
import { CsvData, parseCSV } from "@/utils/csv";
import { useUserProfile } from "@/context/user-profile-context";
import { importWikiFromCsv } from "@/services/wikiImport";

type Destination = "task" | "wiki";

const REMOVED_HEADERS = [
  "Column 7",
  "Column 8",
  "Column 9",
  "Column 10",
  "Column 11",
  "Column 12",
  "CS File Name",
  "Full Method Code",
];

const WikiImporting: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useUserProfile();

  const [destination, setDestination] = useState<Destination>("task");
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const hasRows = csvData && csvData.rows.length > 0;

  const previewInfo = useMemo(() => {
    if (!csvData) return "";
    return `Previewing first ${Math.min(10, csvData.rows.length)} of ${csvData.rows.length} rows`;
  }, [csvData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setCsvData(null);
      setFileName("");
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCSV(text);
    setCsvData(parsed);
    toast({ title: "CSV loaded", description: `Parsed ${parsed.rows.length} rows from ${file.name}.` });
  };

  const handleImport = async () => {
    if (!csvData || csvData.rows.length === 0) {
      toast({ title: "No data", description: "Please select a CSV file with at least one data row." });
      return;
    }

    if (destination === "task") {
      toast({
        title: "Import not configured",
        description: "Task Manager import isn't set up yet on this page.",
      });
      return;
    }

    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to import into the wiki." });
      return;
    }

    const author = profile.name || profile.email || "Unknown";
    const { created } = await importWikiFromCsv(profile.id, author, csvData);

    toast({
      title: "Wiki import complete",
      description: `Created ${created} published entr${created === 1 ? "y" : "ies"} with taxonomies.`,
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
                <Select value={destination} onValueChange={(v) => setDestination(v as Destination)}>
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

            {csvData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {previewInfo}
                  </div>
                  <Button onClick={handleImport} disabled={!hasRows}>Import</Button>
                </div>

                <CsvPreviewTable data={csvData} pageSize={10} removeHeaders={REMOVED_HEADERS} />
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