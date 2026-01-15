"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/context/user-profile-context";

export type TaxRow = {
  id: string;
  name: string;
  created_at: string | null;
};

export function useWikiTaxonomyBulkDelete() {
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(false);

  const [tagRows, setTagRows] = useState<TaxRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<TaxRow[]>([]);
  const [scriptRows, setScriptRows] = useState<TaxRow[]>([]);

  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedScriptIds, setSelectedScriptIds] = useState<Set<string>>(new Set());

  const canManage = !!profile && profile.role !== "Viewer";

  const fetchTaxonomy = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const [{ data: tags, error: tErr }, { data: cats, error: cErr }, { data: scripts, error: sErr }] = await Promise.all([
      supabase.from("wiki_tags").select("id,name,created_at").eq("user_id", profile.id).order("name", { ascending: true }),
      supabase.from("wiki_categories").select("id,name,created_at").eq("user_id", profile.id).order("name", { ascending: true }),
      supabase.from("wiki_scripts").select("id,name,created_at").eq("user_id", profile.id).order("name", { ascending: true }),
    ]);
    if (tErr) throw new Error(tErr.message);
    if (cErr) throw new Error(cErr.message);
    if (sErr) throw new Error(sErr.message);
    setTagRows(tags || []);
    setCategoryRows(cats || []);
    setScriptRows(scripts || []);
    setSelectedTagIds(new Set());
    setSelectedCategoryIds(new Set());
    setSelectedScriptIds(new Set());
    setLoading(false);
  };

  useEffect(() => {
    fetchTaxonomy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleScript = (id: string) => {
    setSelectedScriptIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllTags = () => setSelectedTagIds(new Set(tagRows.map((r) => r.id)));
  const clearTags = () => setSelectedTagIds(new Set());
  const selectAllCategories = () => setSelectedCategoryIds(new Set(categoryRows.map((r) => r.id)));
  const clearCategories = () => setSelectedCategoryIds(new Set());
  const selectAllScripts = () => setSelectedScriptIds(new Set(scriptRows.map((r) => r.id)));
  const clearScripts = () => setSelectedScriptIds(new Set());

  const anyTagsSelected = useMemo(() => selectedTagIds.size > 0, [selectedTagIds]);
  const anyCategoriesSelected = useMemo(() => selectedCategoryIds.size > 0, [selectedCategoryIds]);
  const anyScriptsSelected = useMemo(() => selectedScriptIds.size > 0, [selectedScriptIds]);

  const allTagsSelected = useMemo(() => tagRows.length > 0 && selectedTagIds.size === tagRows.length, [tagRows, selectedTagIds]);
  const allCategoriesSelected = useMemo(() => categoryRows.length > 0 && selectedCategoryIds.size === categoryRows.length, [categoryRows, selectedCategoryIds]);
  const allScriptsSelected = useMemo(() => scriptRows.length > 0 && selectedScriptIds.size === scriptRows.length, [scriptRows, selectedScriptIds]);

  const deleteTagsByIds = async (ids: string[]) => {
    if (!profile?.id || ids.length === 0) return;
    setLoading(true);
    const { error: linkErr } = await supabase.from("wiki_entry_tags").delete().eq("user_id", profile.id).in("tag_id", ids);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_tags").delete().eq("user_id", profile.id).in("id", ids);
    if (error) throw new Error(error.message);
    setLoading(false);
  };
  const deleteCategoriesByIds = async (ids: string[]) => {
    if (!profile?.id || ids.length === 0) return;
    setLoading(true);
    const { error: linkErr } = await supabase.from("wiki_entry_categories").delete().eq("user_id", profile.id).in("category_id", ids);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_categories").delete().eq("user_id", profile.id).in("id", ids);
    if (error) throw new Error(error.message);
    setLoading(false);
  };
  const deleteScriptsByIds = async (ids: string[]) => {
    if (!profile?.id || ids.length === 0) return;
    setLoading(true);
    const { error: linkErr } = await supabase.from("wiki_entry_scripts").delete().eq("user_id", profile.id).in("script_id", ids);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_scripts").delete().eq("user_id", profile.id).in("id", ids);
    if (error) throw new Error(error.message);
    setLoading(false);
  };

  const deleteAllTagsForUser = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { error: linkErr } = await supabase.from("wiki_entry_tags").delete().eq("user_id", profile.id);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_tags").delete().eq("user_id", profile.id);
    if (error) throw new Error(error.message);
    setLoading(false);
  };
  const deleteAllCategoriesForUser = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { error: linkErr } = await supabase.from("wiki_entry_categories").delete().eq("user_id", profile.id);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_categories").delete().eq("user_id", profile.id);
    if (error) throw new Error(error.message);
    setLoading(false);
  };
  const deleteAllScriptsForUser = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { error: linkErr } = await supabase.from("wiki_entry_scripts").delete().eq("user_id", profile.id);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_scripts").delete().eq("user_id", profile.id);
    if (error) throw new Error(error.message);
    setLoading(false);
  };

  return {
    loading,
    canManage,
    // data
    tagRows,
    categoryRows,
    scriptRows,
    // selections
    selectedTagIds,
    selectedCategoryIds,
    selectedScriptIds,
    anyTagsSelected,
    anyCategoriesSelected,
    anyScriptsSelected,
    allTagsSelected,
    allCategoriesSelected,
    allScriptsSelected,
    // actions
    fetchTaxonomy,
    toggleTag,
    toggleCategory,
    toggleScript,
    selectAllTags,
    clearTags,
    selectAllCategories,
    clearCategories,
    selectAllScripts,
    clearScripts,
    deleteTagsByIds,
    deleteCategoriesByIds,
    deleteScriptsByIds,
    deleteAllTagsForUser,
    deleteAllCategoriesForUser,
    deleteAllScriptsForUser,
  };
}