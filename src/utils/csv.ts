"use client";

export type CsvCell = { value: string; quoted: boolean };
export type CsvRow = CsvCell[];
export type CsvData = { headers: string[]; rows: CsvRow };

export const parseCSV = (text: string): CsvData => {
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

export const firstQuotedIndex = (row: CsvRow) => row.findIndex((c) => c.quoted);

export const extractFullMethodCode = (row: CsvRow): string => {
  const methodIdx = firstQuotedIndex(row);

  const isTerminator = (cell: CsvCell) => {
    const v = cell.value.trim();
    if (/,?\s*},\s*$/.test(v)) return true;
    if (/\};\s*$/.test(v)) return true;
    if (/},\s*$/.test(v)) return true;
    if (/^\}$/.test(v)) return true;
    return false;
  };

  let endIdx = -1;
  for (let i = row.length - 1; i > methodIdx; i--) {
    if (isTerminator(row[i])) {
      endIdx = i;
      break;
    }
  }

  const sliceStart = methodIdx >= 0 ? methodIdx + 1 : 0;
  const sliceEnd = endIdx >= sliceStart ? endIdx + 1 : row.length;
  return row.slice(sliceStart, sliceEnd).map((c) => c.value).join("\n").trim();
};

export const detectCsFileName = (row: CsvRow): string => {
  const found = row.find((c) => !c.quoted && /\.cs$/i.test(c.value.trim()));
  return found ? found.value.trim() : "";
};

export const getHeaderIndexInsensitive = (headers: string[], name: string): number =>
  headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());

export const getCellByHeader = (headers: string[], row: CsvRow, name: string): string => {
  const idx = getHeaderIndexInsensitive(headers, name);
  return idx >= 0 && row[idx] ? row[idx].value.trim() : "";
};

export const splitList = (val: string): string[] => {
  if (!val) return [];
  return val
    .split(/[;,]/g)
    .map((s) => s.trim())
    .filter(Boolean);
};