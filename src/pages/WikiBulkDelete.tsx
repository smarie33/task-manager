"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/context/user-profile-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type WikiEntryRow = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  created_at: string | null;
};

// ADDED: taxonomy row type
type TaxRow = {
  id: string;
  name: string;
  created_at: string | null;
};

const WikiBulkDelete: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<WikiEntryRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ADDED: taxonomy state
  const [tagRows, setTagRows] = useState<TaxRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<TaxRow[]>([]);
  const [scriptRows, setScriptRows] = useState<TaxRow[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedScriptIds, setSelectedScriptIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"tags" | "categories" | "scripts">("tags");

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

  // ADDED: fetch taxonomy rows for current user
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
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // ADDED: load taxonomy on profile change
  useEffect(() => {
    fetchTaxonomy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const allSelected = useMemo(() => rows.length > 0 && selected.size === rows.length, [rows, selected]);
  const anySelected = selected.size > 0;

  // ADDED: helpers for taxonomy selection based on active tab
  const activeTaxRows = activeTab === "tags" ? tagRows : activeTab === "categories" ? categoryRows : scriptRows;
  const activeSelectedSet = activeTab === "tags" ? selectedTagIds : activeTab === "categories" ? selectedCategoryIds : selectedScriptIds;
  const setActiveSelectedSet = (setterInput: Set<string>) => {
    if (activeTab === "tags") setSelectedTagIds(new Set(setterInput));
    else if (activeTab === "categories") setSelectedCategoryIds(new Set(setterInput));
    else setSelectedScriptIds(new Set(setterInput));
  };
  const taxAllSelected = useMemo(() => activeTaxRows.length > 0 && activeSelectedSet.size === activeTaxRows.length, [activeTaxRows, activeSelectedSet]);
  const taxAnySelected = activeSelectedSet.size > 0;

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

  // ADDED: toggle for taxonomy selections
  const toggleOneTax = (id: string) => {
    const next = new Set(activeSelectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setActiveSelectedSet(next);
  };

  const toggleAllTax = () => {
    if (taxAllSelected) {
      setActiveSelectedSet(new Set());
    } else {
      setActiveSelectedSet(new Set(activeTaxRows.map((r) => r.id)));
    }
  };

  // Deletes link tables first, then entries for provided ids
  const deleteByIds = async (ids: string[]) => {
    if (!profile?.id || ids.length === 0) return;
    // Remove links
    const linkTables = ["wiki_entry_tags", "wiki_entry_categories", "wiki_entry_scripts"] as const;
    for (const table of linkTables) {
      const { error: linkErr } = await supabase
        .from(table)
        .delete()
        .eq("user_id", profile.id)
        .in("entry_id", ids);
      if (linkErr) throw new Error(linkErr.message);
    }
    // Remove entries
    const { error: entryErr } = await supabase
      .from("wiki_entries")
      .delete()
      .eq("user_id", profile.id)
      .in("id", ids);
    if (entryErr) throw new Error(entryErr.message);
  };

  // Deletes ALL for current user (faster path)
  const deleteAllForUser = async () => {
    if (!profile?.id) return;
    // Remove links
    const linkTables = ["wiki_entry_tags", "wiki_entry_categories", "wiki_entry_scripts"] as const;
    for (const table of linkTables) {
      const { error: linkErr } = await supabase
        .from(table)
        .delete()
        .eq("user_id", profile.id);
      if (linkErr) throw new Error(linkErr.message);
    }
    // Remove entries
    const { error: entryErr } = await supabase
      .from("wiki_entries")
      .delete()
      .eq("user_id", profile.id);
    if (entryErr) throw new Error(entryErr.message);
  };

  // ADDED: taxonomy delete helpers (by ids)
  const deleteTagsByIds = async (ids: string[]) => {
    if (!profile?.id || ids.length === 0) return;
    const { error: linkErr } = await supabase.from("wiki_entry_tags").delete().eq("user_id", profile.id).in("tag_id", ids);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_tags").delete().eq("user_id", profile.id).in("id", ids);
    if (error) throw new Error(error.message);
  };
  const deleteCategoriesByIds = async (ids: string[]) => {
    if (!profile?.id || ids.length === 0) return;
    const { error: linkErr } = await supabase.from("wiki_entry_categories").delete().eq("user_id", profile.id).in("category_id", ids);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_categories").delete().eq("user_id", profile.id).in("id", ids);
    if (error) throw new Error(error.message);
  };
  const deleteScriptsByIds = async (ids: string[]) => {
    if (!profile?.id || ids.length === 0) return;
    const { error: linkErr } = await supabase.from("wiki_entry_scripts").delete().eq("user_id", profile.id).in("script_id", ids);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_scripts").delete().eq("user_id", profile.id).in("id", ids);
    if (error) throw new Error(error.message);
  };

  // ADDED: taxonomy delete ALL for current user
  const deleteAllTagsForUser = async () => {
    if (!profile?.id) return;
    const { error: linkErr } = await supabase.from("wiki_entry_tags").delete().eq("user_id", profile.id);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_tags").delete().eq("user_id", profile.id);
    if (error) throw new Error(error.message);
  };
  const deleteAllCategoriesForUser = async () => {
    if (!profile?.id) return;
    const { error: linkErr } = await supabase.from("wiki_entry_categories").delete().eq("user_id", profile.id);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_categories").delete().eq("user_id", profile.id);
    if (error) throw new Error(error.message);
  };
  const deleteAllScriptsForUser = async () => {
    if (!profile?.id) return;
    const { error: linkErr } = await supabase.from("wiki_entry_scripts").delete().eq("user_id", profile.id);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_scripts").delete().eq("user_id", profile.id);
    if (error) throw new Error(error.message);
  };

  // ADDED: handlers bound to current tab
  const handleDeleteSelectedTax = async () => {
    const ids = Array.from(activeSelectedSet);
    if (ids.length === 0) return;
    setLoading(true);
    if (activeTab === "tags") {
      await deleteTagsByIds(ids);
      toast({ title: "Deleted", description: `Removed ${ids.length} tag${ids.length === 1 ? "" : "s"}.` });
    } else if (activeTab === "categories") {
      await deleteCategoriesByIds(ids);
      toast({ title: "Deleted", description: `Removed ${ids.length} categor${ids.length === 1 ? "y" : "ies"}.` });
    } else {
      await deleteScriptsByIds(ids);
      toast({ title: "Deleted", description: `Removed ${ids.length} script${ids.length === 1 ? "" : "s"}.` });
    }
    await fetchTaxonomy();
  };

  const handleDeleteAllTax = async () => {
    setLoading(true);
    if (activeTab === "tags") {
      await deleteAllTagsForUser();
      toast({ title: "Deleted", description: "Removed all tags." });
    } else if (activeTab === "categories") {
      await deleteAllCategoriesForUser();
      toast({ title: "Deleted", description: "Removed all categories." });
    } else {
      await deleteAllScriptsForUser();
      toast({ title: "Deleted", description: "Removed all scripts." });
    }
    await fetchTaxonomy();
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setLoading(true);
    await deleteByIds(ids);
    toast({ title: "Deleted", description: `Removed ${ids.length} entr${ids.length === 1 ? "y" : "ies"}.` });
    await fetchRows();
  };

  const handleDeleteAll = async () => {
    setLoading(true);
    await deleteAllForUser();
    toast({ title: "Deleted", description: "Removed all wiki entries." });
    await fetchRows();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-5xl flex-1 w-full space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Wiki Bulk Delete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canManage && (
              <div className="text-sm text-muted-foreground">
                You do not have permission to delete wiki entries.
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={fetchRows} disabled={loading}>Refresh</Button>
              <Checkbox id="selectAll" checked={allSelected} onCheckedChange={toggleAll} disabled={rows.length === 0} />
              <label htmlFor="selectAll" className="text-sm">Select all</label>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={!anySelected || !canManage || loading}>Delete selected</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete selected entries?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {selected.size} entr{selected.size === 1 ? "y" : "ies"} and their tag/category/script links. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await handleDeleteSelected();
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={!canManage || loading}>Delete ALL</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete ALL your wiki entries?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all of your wiki entries and their links. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await handleDeleteAll();
                      }}
                    >
                      Delete all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="w-full overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="text-sm text-muted-foreground">No wiki entries found.</div>
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((r) => (
                    <TableRow key={r.id} className={selected.has(r.id) ? "bg-muted/40" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(r.id)}
                          onCheckedChange={() => toggleOne(r.id)}
                          disabled={!canManage}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{r.title}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.slug}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.published ? "Published" : "Draft"}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wiki Taxonomy Bulk Delete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canManage && (
              <div className="text-sm text-muted-foreground">
                You do not have permission to delete wiki taxonomies.
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={fetchTaxonomy} disabled={loading}>Refresh</Button>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="h-9">
                  <TabsTrigger value="tags">Tags</TabsTrigger>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="scripts">Scripts</TabsTrigger>
                </TabsList>
              </Tabs>

              <Checkbox id="selectAllTax" checked={taxAllSelected} onCheckedChange={toggleAllTax} disabled={activeTaxRows.length === 0} />
              <label htmlFor="selectAllTax" className="text-sm">Select all</label>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={!taxAnySelected || !canManage || loading}>Delete selected</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete selected {activeTab}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {activeSelectedSet.size} {activeTab} and unlink them from all entries. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await handleDeleteSelectedTax();
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={!canManage || loading}>Delete ALL</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete ALL {activeTab}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your {activeTab} and unlink them from all entries. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await handleDeleteAllTax();
                      }}
                    >
                      Delete all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="w-full overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTaxRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <div className="text-sm text-muted-foreground">No {activeTab} found.</div>
                      </TableCell>
                    </TableRow>
                  )}
                  {activeTaxRows.map((r) => (
                    <TableRow key={r.id} className={activeSelectedSet.has(r.id) ? "bg-muted/40" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={activeSelectedSet.has(r.id)}
                          onCheckedChange={() => toggleOneTax(r.id)}
                          disabled={!canManage}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{r.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default WikiBulkDelete;