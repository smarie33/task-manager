"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useWikiTaxonomyBulkDelete } from "@/hooks/wiki/useWikiTaxonomyBulkDelete";

type TabKey = "tags" | "categories" | "scripts";

const TaxonomyBulkDeleteSection: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("tags");

  const {
    loading,
    canManage,
    // data
    tagRows, categoryRows, scriptRows,
    // selections
    selectedTagIds, selectedCategoryIds, selectedScriptIds,
    anyTagsSelected, anyCategoriesSelected, anyScriptsSelected,
    allTagsSelected, allCategoriesSelected, allScriptsSelected,
    // actions
    fetchTaxonomy,
    toggleTag, toggleCategory, toggleScript,
    selectAllTags, clearTags,
    selectAllCategories, clearCategories,
    selectAllScripts, clearScripts,
    deleteTagsByIds, deleteCategoriesByIds, deleteScriptsByIds,
    deleteAllTagsForUser, deleteAllCategoriesForUser, deleteAllScriptsForUser,
  } = useWikiTaxonomyBulkDelete();

  const activeRows = useMemo(() => {
    if (activeTab === "tags") return tagRows;
    if (activeTab === "categories") return categoryRows;
    return scriptRows;
  }, [activeTab, tagRows, categoryRows, scriptRows]);

  const activeSelectedSet = useMemo(() => {
    if (activeTab === "tags") return selectedTagIds;
    if (activeTab === "categories") return selectedCategoryIds;
    return selectedScriptIds;
  }, [activeTab, selectedTagIds, selectedCategoryIds, selectedScriptIds]);

  const activeAnySelected = useMemo(() => {
    if (activeTab === "tags") return anyTagsSelected;
    if (activeTab === "categories") return anyCategoriesSelected;
    return anyScriptsSelected;
  }, [activeTab, anyTagsSelected, anyCategoriesSelected, anyScriptsSelected]);

  const activeAllSelected = useMemo(() => {
    if (activeTab === "tags") return allTagsSelected;
    if (activeTab === "categories") return allCategoriesSelected;
    return allScriptsSelected;
  }, [activeTab, allTagsSelected, allCategoriesSelected, allScriptsSelected]);

  const toggleOne = (id: string) => {
    if (activeTab === "tags") toggleTag(id);
    else if (activeTab === "categories") toggleCategory(id);
    else toggleScript(id);
  };

  const toggleAll = () => {
    if (activeTab === "tags") {
      if (allTagsSelected) clearTags();
      else selectAllTags();
    } else if (activeTab === "categories") {
      if (allCategoriesSelected) clearCategories();
      else selectAllCategories();
    } else {
      if (allScriptsSelected) clearScripts();
      else selectAllScripts();
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(activeSelectedSet);
    if (ids.length === 0) return;
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

  const handleDeleteAll = async () => {
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

  return (
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

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
            <TabsList className="h-9">
              <TabsTrigger value="tags">Tags</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="scripts">Scripts</TabsTrigger>
            </TabsList>
          </Tabs>

          <Checkbox id="selectAllTax" checked={activeAllSelected} onCheckedChange={toggleAll} disabled={activeRows.length === 0} />
          <label htmlFor="selectAllTax" className="text-sm">Select all</label>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!activeAnySelected || !canManage || loading}>Delete selected</Button>
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
                <AlertDialogAction onClick={handleDeleteSelected}>
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
                <AlertDialogAction onClick={handleDeleteAll}>
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
              {activeRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <div className="text-sm text-muted-foreground">No {activeTab} found.</div>
                  </TableCell>
                </TableRow>
              )}
              {activeRows.map((r) => (
                <TableRow key={r.id} className={activeSelectedSet.has(r.id) ? "bg-muted/40" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={activeSelectedSet.has(r.id)}
                      onCheckedChange={() => toggleOne(r.id)}
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
  );
};

export default TaxonomyBulkDeleteSection;