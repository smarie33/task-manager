"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/context/user-profile-context";

export type WikiEntryRow = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  created_at: string | null;
};

export function useWikiEntriesBulkDelete() {
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<WikiEntryRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const canManage = !!profile && profile.role !== "Viewer";

  const fetchRows = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("wiki_entries")
      .select("id,title,slug,published,created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    setRows(data || []);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const allSelected = useMemo(() => rows.length > 0 && selected.size === rows.length, [rows, selected]);
  const anySelected = selected.size > 0;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  };

  // Deletes link tables first, then entries for provided ids
  const deleteByIds = async (ids: string[]) => {
    if (!profile?.id || ids.length === 0) return;
    setLoading(true);
    const linkTables = ["wiki_entry_tags", "wiki_entry_categories", "wiki_entry_scripts"] as const;
    for (const table of linkTables) {
      const { error: linkErr } = await supabase
        .from(table)
        .delete()
        .eq("user_id", profile.id)
        .in("entry_id", ids);
      if (linkErr) throw new Error(linkErr.message);
    }
    const { error: entryErr } = await supabase
      .from("wiki_entries")
      .delete()
      .eq("user_id", profile.id)
      .in("id", ids);
    if (entryErr) throw new Error(entryErr.message);
    setLoading(false);
  };

  // Deletes ALL for current user
  const deleteAllForUser = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const linkTables = ["wiki_entry_tags", "wiki_entry_categories", "wiki_entry_scripts"] as const;
    for (const table of linkTables) {
      const { error: linkErr } = await supabase
        .from(table)
        .delete()
        .eq("user_id", profile.id);
      if (linkErr) throw new Error(linkErr.message);
    }
    const { error: entryErr } = await supabase
      .from("wiki_entries")
      .delete()
      .eq("user_id", profile.id);
    if (entryErr) throw new Error(entryErr.message);
    setLoading(false);
  };

  return {
    rows,
    selected,
    loading,
    canManage,
    allSelected,
    anySelected,
    toggleOne,
    toggleAll,
    fetchRows,
    deleteByIds,
    deleteAllForUser,
  };
}