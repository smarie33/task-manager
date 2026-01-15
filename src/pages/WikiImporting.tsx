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
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/context/user-profile-context";
import { slugify } from "@/utils/slugify";

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
  const { profile } = useUserProfile();
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

  // Helper: derive method name (first quoted cell) and full method code from a row
  const extractMethodAndCode = (row: CsvRow) => {
    const methodIdx = row.findIndex((c) => c.quoted);
    const methodName = methodIdx >= 0 ? row[methodIdx].value.trim() : "";
    // Use existing slice rule set earlier
    const isTerminator = (cell: CsvCell, idx: number) => {
      const v = cell.value.trim();
      if (/,?\s*},\s*$/.test(v) || /\};\s*$/.test(v) || /},\s*$/.test(v)) return true;
      if (/^\}$/.test(v)) return true;
      return false;
    };
    let endIdx = -1;
    for (let i = row.length - 1; i > methodIdx; i--) {
      if (isTerminator(row[i], i)) {
        endIdx = i;
        break;
      }
    }
    const sliceStart = methodIdx >= 0 ? methodIdx + 1 : 0;
    const sliceEnd = endIdx >= sliceStart ? endIdx + 1 : row.length;
    const fullMethodCode = row.slice(sliceStart, sliceEnd).map((c) => c.value).join("\n").trim();
    return { methodName, fullMethodCode };
  };

  const getHeaderIndex = React.useCallback(
    (name: string) => (csvPreview ? csvPreview.headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase()) : -1),
    [csvPreview]
  );

  const getCellValueByHeader = (row: CsvRow, headerName: string): string => {
    const idx = getHeaderIndex(headerName);
    return idx >= 0 && row[idx] ? row[idx].value.trim() : "";
  };

  const splitList = (val: string): string[] => {
    if (!val) return [];
    // split on semicolons or commas, trim parts
    return val
      .split(/[;,]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // Ensure-or-create helpers for taxonomy entities, returning id
  const ensureTag = async (name: string): Promise<string | null> => {
    if (!name || !profile?.id) return null;
    const { data: found, error: findErr } = await supabase
      .from("wiki_tags")
      .select("id")
      .eq("user_id", profile.id)
      .eq("name", name)
      .limit(1);
    if (findErr) throw new Error(findErr.message);
    if (found && found.length > 0) return found[0].id;
    const { data: created, error: createErr } = await supabase
      .from("wiki_tags")
      .insert({ user_id: profile.id, name })
      .select("id")
      .single();
    if (createErr) throw new Error(createErr.message);
    return created.id;
  };

  const ensureCategory = async (name: string): Promise<string | null> => {
    if (!name || !profile?.id) return null;
    const { data: found, error: findErr } = await supabase
      .from("wiki_categories")
      .select("id")
      .eq("user_id", profile.id)
      .eq("name", name)
      .limit(1);
    if (findErr) throw new Error(findErr.message);
    if (found && found.length > 0) return found[0].id;
    const { data: created, error: createErr } = await supabase
      .from("wiki_categories")
      .insert({ user_id: profile.id, name })
      .select("id")
      .single();
    if (createErr) throw new Error(createErr.message);
    return created.id;
  };

  const ensureScript = async (name: string): Promise<string | null> => {
    if (!name || !profile?.id) return null;
    const { data: found, error: findErr } = await supabase
      .from("wiki_scripts")
      .select("id")
      .eq("user_id", profile.id)
      .eq("name", name)
      .limit(1);
    if (findErr) throw new Error(findErr.message);
    if (found && found.length > 0) return found[0].id;
    const { data: created, error: createErr } = await supabase
      .from("wiki_scripts")
      .insert({ user_id: profile.id, name })
      .select("id")
      .single();
    if (createErr) throw new Error(createErr.message);
    return created.id;
  };

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

  const handleImport = async () => {
    if (!csvPreview || csvPreview.rows.length === 0) {
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

    // Destination: wiki
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to import into the wiki." });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const author = profile.name || profile.email || "Unknown";

    let success = 0;

    for (let i = 0; i < csvPreview.rows.length; i++) {
      const row = csvPreview.rows[i];

      // Prefer header-based extraction; fallback to previous detection if missing
      const headerMethodName = getCellValueByHeader(row, "Method Name");
      const headerFullCode = getCellValueByHeader(row, "Full Method Code");
      const { methodName: detectedMethod, fullMethodCode: detectedCode } = extractMethodAndCode(row);

      const methodName = (headerMethodName || detectedMethod).trim();
      const fullMethodCode = (headerFullCode || detectedCode).trim();

      if (!methodName || !fullMethodCode) {
        continue;
      }

      // Taxonomy source values
      const accessModifier = getCellValueByHeader(row, "Access Modifier");
      const returnType = getCellValueByHeader(row, "Return Type");
      let csFileName = getCellValueByHeader(row, "CS File Name");
      if (!csFileName) {
        const fallbackCs = row.find((c) => !c.quoted && /\.cs$/i.test(c.value.trim()));
        csFileName = fallbackCs ? fallbackCs.value.trim() : "";
      }
      const relatedMethodsRaw = getCellValueByHeader(row, "Related Methods");
      const relatedMethods = splitList(relatedMethodsRaw);

      // Wrap code for highlighting
      const contentHtml =
        `<pre><code class="language-csharp">${fullMethodCode
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</code></pre>`;

      let baseSlug = slugify(methodName);
      if (!baseSlug) {
        baseSlug = `imported-${Date.now()}-${i + 1}`;
      }

      // Ensure slug uniqueness for this user
      let slug = baseSlug;
      let attempt = 1;
      while (true) {
        const { data: existing, error: checkErr } = await supabase
          .from("wiki_entries")
          .select("id")
          .eq("user_id", profile.id)
          .eq("slug", slug)
          .limit(1);
        if (checkErr) throw new Error(checkErr.message);
        if (!existing || existing.length === 0) break;
        attempt += 1;
        slug = `${baseSlug}-${attempt}`;
      }

      // Create entry and retrieve id
      const { data: inserted, error: insertErr } = await supabase
        .from("wiki_entries")
        .insert({
          user_id: profile.id,
          title: methodName,
          slug,
          author,
          entry_date: today,
          content: contentHtml,
          published: true,
        })
        .select("id")
        .single();

      if (insertErr) throw new Error(insertErr.message);
      const entryId = inserted.id as string;

      // Build taxonomy links
      // Tags: access modifier + return type (unique)
      const tagNames = Array.from(new Set([accessModifier, returnType].map((s) => s.trim()).filter(Boolean)));
      const tagIds: string[] = [];
      for (const t of tagNames) {
        const id = await ensureTag(t);
        if (id) tagIds.push(id);
      }
      if (tagIds.length > 0) {
        const rows = tagIds.map((tagId) => ({ user_id: profile.id, entry_id: entryId, tag_id: tagId }));
        const { error: linkErr } = await supabase.from("wiki_entry_tags").insert(rows);
        if (linkErr) throw new Error(linkErr.message);
      }

      // Scripts: cs file name (single)
      if (csFileName) {
        const scriptId = await ensureScript(csFileName);
        if (scriptId) {
          const { error: sErr } = await supabase
            .from("wiki_entry_scripts")
            .insert({ user_id: profile.id, entry_id: entryId, script_id: scriptId });
          if (sErr) throw new Error(sErr.message);
        }
      }

      // Categories: related methods (list)
      const categoryNames = Array.from(new Set(relatedMethods));
      const categoryIds: string[] = [];
      for (const c of categoryNames) {
        const id = await ensureCategory(c);
        if (id) categoryIds.push(id);
      }
      if (categoryIds.length > 0) {
        const rows = categoryIds.map((category_id) => ({ user_id: profile.id, entry_id: entryId, category_id }));
        const { error: cErr } = await supabase.from("wiki_entry_categories").insert(rows);
        if (cErr) throw new Error(cErr.message);
      }

      success += 1;
    }

    toast({
      title: "Wiki import complete",
      description: `Created ${success} published entr${success === 1 ? "y" : "ies"} with taxonomies.`,
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