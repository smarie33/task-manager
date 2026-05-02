"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useWikiEntriesBulkDelete } from "@/hooks/wiki/useWikiEntriesBulkDelete";

const EntriesBulkDeleteSection: React.FC = () => {
  const { toast } = useToast();
  const {
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
  } = useWikiEntriesBulkDelete();

  const handleDeleteSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    await deleteByIds(ids);
    toast({ title: "Deleted", description: `Removed ${ids.length} entr${ids.length === 1 ? "y" : "ies"}.` });
    await fetchRows();
  };

  const handleDeleteAll = async () => {
    await deleteAllForUser();
    toast({ title: "Deleted", description: "Removed all wiki entries." });
    await fetchRows();
  };

  return (
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
                  This will permanently delete {selected.size} entr{selected.size === 1 ? "y" : "ies"} and their tag/method/script links. This action cannot be undone.
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
                <AlertDialogTitle>Delete ALL your wiki entries?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all of your wiki entries and their links. This cannot be undone.
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
  );
};

export default EntriesBulkDeleteSection;