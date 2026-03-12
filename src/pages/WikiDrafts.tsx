"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

const DraftsTable: React.FC<{
  kind: "wiki" | "guides";
  rows: DraftEntry[];
  loading: boolean;
  isViewer: boolean;
  onPublish: (id: string, slug: string) => void;
}> = ({ kind, rows, loading, isViewer, onPublish }) => {
  const titleLabel = kind === "wiki" ? "Draft Wiki Entries" : "Draft Guide Entries";
  const editPath = (slug: string) => (kind === "wiki" ? `/wiki/${slug}/edit` : `/guides/${slug}/edit`);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titleLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading drafts...</div>
        ) : rows.length === 0 ? (
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
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.title || "(Untitled)"}</TableCell>
                  <TableCell>{d.author || "-"}</TableCell>
                  <TableCell>{d.entry_date || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{d.slug}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={editPath(d.slug)}>
                        <Button variant="outline" size="sm" disabled={isViewer}>
                          Edit
                        </Button>
                      </Link>
                      <Button size="sm" onClick={() => onPublish(d.id, d.slug)} disabled={isViewer}>
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
  );
};

const WikiDrafts: React.FC = () => {
  const { session } = useSession();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const userId = session?.user?.id ?? null;
  const isAdmin = profile?.role === "Admin";

  const [loading, setLoading] = React.useState(true);
  const [wikiDrafts, setWikiDrafts] = React.useState<DraftEntry[]>([]);
  const [guideDrafts, setGuideDrafts] = React.useState<DraftEntry[]>([]);

  const loadDrafts = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    let wikiQ = supabase
      .from("wiki_entries")
      .select("id,title,slug,author,entry_date,created_at,updated_at,published")
      .eq("published", false)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });

    let guidesQ = supabase
      .from("guides_entries")
      .select("id,title,slug,author,entry_date,created_at,updated_at,published")
      .eq("published", false)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });

    if (!isAdmin) {
      wikiQ = wikiQ.eq("user_id", userId);
      guidesQ = guidesQ.eq("user_id", userId);
    }

    const [{ data: wikiRows, error: wikiErr }, { data: guideRows, error: guideErr }] = await Promise.all([wikiQ, guidesQ]);

    if (wikiErr) throw new Error(wikiErr.message);
    if (guideErr) throw new Error(guideErr.message);

    setWikiDrafts(wikiRows || []);
    setGuideDrafts(guideRows || []);
    setLoading(false);
  }, [userId, isAdmin]);

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

  const publishWikiDraft = async (id: string, slug: string) => {
    const { error } = await supabase
      .from("wiki_entries")
      .update({ published: true, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    setWikiDrafts((prev) => prev.filter((d) => d.id !== id));
    toast({ title: "Published", description: "Draft was published." });
    window.location.href = `/wiki/${slug}`;
  };

  const publishGuideDraft = async (id: string, slug: string) => {
    const { error } = await supabase
      .from("guides_entries")
      .update({ published: true, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    setGuideDrafts((prev) => prev.filter((d) => d.id !== id));
    toast({ title: "Published", description: "Draft was published." });
    window.location.href = `/guides/${slug}`;
  };

  const isViewer = profile?.role === "Viewer";

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-6xl flex-1 w-full">
        {isViewer && (
          <div className="text-sm text-red-600 mb-4">Viewers cannot manage drafts. Please contact an admin.</div>
        )}

        {!userId ? (
          <Card>
            <CardHeader>
              <CardTitle>Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Sign in to manage drafts.</div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="wiki" className="w-full">
            <TabsList>
              <TabsTrigger value="wiki">Wiki Drafts</TabsTrigger>
              <TabsTrigger value="guides">Guide Drafts</TabsTrigger>
            </TabsList>

            <TabsContent value="wiki" className="mt-4">
              <DraftsTable kind="wiki" rows={wikiDrafts} loading={loading} isViewer={isViewer} onPublish={publishWikiDraft} />
            </TabsContent>

            <TabsContent value="guides" className="mt-4">
              <DraftsTable kind="guides" rows={guideDrafts} loading={loading} isViewer={isViewer} onPublish={publishGuideDraft} />
            </TabsContent>
          </Tabs>
        )}
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default WikiDrafts;