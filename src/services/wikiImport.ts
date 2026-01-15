"use client";

import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/utils/slugify";
import { CsvData, CsvRow, detectCsFileName, extractFullMethodCode, getCellByHeader, splitList } from "@/utils/csv";

type EnsureIdFn = (name: string) => Promise<string | null>;

const ensureByName = async (table: "wiki_tags" | "wiki_categories" | "wiki_scripts", userId: string, name: string) => {
  if (!name) return null;
  const { data: found, error: findErr } = await supabase
    .from(table)
    .select("id")
    .eq("user_id", userId)
    .eq("name", name)
    .limit(1);
  if (findErr) throw new Error(findErr.message);
  if (found && found.length > 0) return found[0].id as string;
  const { data: created, error: createErr } = await supabase
    .from(table)
    .insert({ user_id: userId, name })
    .select("id")
    .single();
  if (createErr) throw new Error(createErr.message);
  return (created.id as string) ?? null;
};

const ensureTag = (userId: string): EnsureIdFn => (name: string) => ensureByName("wiki_tags", userId, name);
const ensureCategory = (userId: string): EnsureIdFn => (name: string) => ensureByName("wiki_categories", userId, name);
const ensureScript = (userId: string): EnsureIdFn => (name: string) => ensureByName("wiki_scripts", userId, name);

const unique = (arr: string[]) => Array.from(new Set(arr.filter(Boolean).map((s) => s.trim())));

const extractMethodName = (headers: string[], row: CsvRow) => {
  const headerMethodName = getCellByHeader(headers, row, "Method Name");
  if (headerMethodName) return headerMethodName;
  const firstQuoted = row.find((c) => c.quoted)?.value?.trim() ?? "";
  return firstQuoted;
};

const extractFullCode = (headers: string[], row: CsvRow) => {
  const headerFull = getCellByHeader(headers, row, "Full Method Code");
  return headerFull || extractFullMethodCode(row);
};

const extractCsFileNameFromRow = (headers: string[], row: CsvRow) => {
  const headerVal = getCellByHeader(headers, row, "CS File Name");
  return headerVal || detectCsFileName(row);
};

export type WikiImportResult = { created: number };

export const importWikiFromCsv = async (userId: string, author: string, data: CsvData): Promise<WikiImportResult> => {
  const ensureTagId = ensureTag(userId);
  const ensureCategoryId = ensureCategory(userId);
  const ensureScriptId = ensureScript(userId);

  const today = new Date().toISOString().slice(0, 10);
  let created = 0;

  for (const row of data.rows) {
    const methodName = extractMethodName(data.headers, row).trim();
    const fullMethodCode = extractFullCode(data.headers, row).trim();
    if (!methodName || !fullMethodCode) continue;

    // Taxonomies from headers
    const accessModifier = getCellByHeader(data.headers, row, "Access Modifier");
    const returnType = getCellByHeader(data.headers, row, "Return Type");
    const tagNames = unique([accessModifier, returnType]);

    const csFileName = extractCsFileNameFromRow(data.headers, row);
    const relatedMethodsRaw = getCellByHeader(data.headers, row, "Related Methods");
    const categoryNames = unique(splitList(relatedMethodsRaw));

    const contentHtml =
      `<pre><code class="language-csharp">${fullMethodCode
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</code></pre>`;

    let baseSlug = slugify(methodName) || `imported-${Date.now()}`;
    let slug = baseSlug;
    let attempt = 1;

    // ensure slug unique per user
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: existing, error: checkErr } = await supabase
        .from("wiki_entries")
        .select("id")
        .eq("user_id", userId)
        .eq("slug", slug)
        .limit(1);
      if (checkErr) throw new Error(checkErr.message);
      if (!existing || existing.length === 0) break;
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("wiki_entries")
      .insert({
        user_id: userId,
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

    // Link tags
    if (tagNames.length > 0) {
      const tagIds: string[] = [];
      for (const t of tagNames) {
        const id = await ensureTagId(t);
        if (id) tagIds.push(id);
      }
      if (tagIds.length) {
        const rows = tagIds.map((tag_id) => ({ user_id: userId, entry_id: entryId, tag_id }));
        const { error } = await supabase.from("wiki_entry_tags").insert(rows);
        if (error) throw new Error(error.message);
      }
    }

    // Link script
    if (csFileName) {
      const scriptId = await ensureScriptId(csFileName);
      if (scriptId) {
        const { error } = await supabase
          .from("wiki_entry_scripts")
          .insert({ user_id: userId, entry_id: entryId, script_id: scriptId });
        if (error) throw new Error(error.message);
      }
    }

    // Link categories
    if (categoryNames.length > 0) {
      const categoryIds: string[] = [];
      for (const c of categoryNames) {
        const id = await ensureCategoryId(c);
        if (id) categoryIds.push(id);
      }
      if (categoryIds.length) {
        const rows = categoryIds.map((category_id) => ({ user_id: userId, entry_id: entryId, category_id }));
        const { error } = await supabase.from("wiki_entry_categories").insert(rows);
        if (error) throw new Error(error.message);
      }
    }

    created += 1;
  }

  return { created };
};