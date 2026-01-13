"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/session-context";
import { useUserProfile } from "@/context/user-profile-context";
import { Link } from "react-router-dom";

type DraftEntry = {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  entry_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  published: boolean | null;
};

const WikiDrafts: React.FC = () => {
  const { session } = useSession();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const userId = session?.user?.id ?? null;

  const [loading, setLoading] = React.useState(true);
  const [drafts, setDrafts] = React.useState<DraftEntry[]>([]);

  const loadDrafts = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("wiki_entries")
      .select("id,title,slug,author,entry_date,created_at,updated_at,published")
      .eq("user_id", userId)
      .eq("published", false)
      .order("updated_at", { ascending: false, nullsLast: true })
      .order("created_at", { ascending: false, nullsLast: true });
    if (error) throw new Error(error.message);
    setDrafts(data || []);
    setLoading(false);
  }, [userId]);

  React.useEffect(() => {
    if (userId) {
      loadDrafts().catch((err) => {
        toast({ title: "Error loading drafts", description: err.message });
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [userId, loadDrafts, toast]);

  const publishDraft = async (id: string, slug: string) => {
    const { error } = await supabase
      .from("wiki_entries")
      .update({ published: true, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    // Optimistically remove from list
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    toast({ title: "Published", description: "Draft was published." });
    // Optional: navigate to the entry
    window.location.href = `/wiki/${slug}`;
  };

  const isViewer = profile?.role === "Viewer";

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-6xl flex-1 w-full">
        <Card>
          <CardHeader>
            <CardTitle>Draft Wiki Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {isViewer && (
              <div className="text-sm text-red-600 mb-4">
                Viewers cannot manage drafts. Please contact an admin.
              </div>
            )}
            {!userId ? (
              <div className="text-sm text-muted-foreground">Sign in to manage drafts.</div>
            ) : loading ? (
              <div className="text-sm text-muted-foreground">Loading drafts...</div>
            ) : drafts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No drafts found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.title || "(Untitled)"}</TableCell>
                      <TableCell>{d.author || "-"}</TableCell>
                      <TableCell>{d.entry_date || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{d.slug}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/wiki/${d.slug}/edit`}>
                            <Button variant="outline" size="sm" disabled={isViewer}>Edit</Button>
                          </Link>
                          <Button
                            size="sm"
                            onClick={() => publishDraft(d.id, d.slug)}
                            disabled={isViewer}
                          >
                            Publish
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default WikiDrafts;