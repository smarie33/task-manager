"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/session-context";
import WikiSidebar from "@/components/wiki/WikiSidebar";
import { Link } from "react-router-dom";
import { useUserProfile } from "@/context/user-profile-context";

type EntryMethod = { id: string; name: string };
type EntryListItem = { id: string; title: string; slug: string; methods: EntryMethod[] };

const Wiki: React.FC = () => {
  const { session } = useSession();
  const userId = session?.user?.id ?? null;
  const { profile } = useUserProfile();
  const canEdit = !!profile && profile.role !== "Viewer";
  const [entries, setEntries] = React.useState<EntryListItem[]>([]);

  React.useEffect(() => {
    if (!userId) {
      setEntries([]);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("wiki_entries")
        .select("id,title,slug")
        .eq("published", true)
        .order("title", { ascending: true });

      if (error) {
        console.error("[wiki] list load failed", error);
        setEntries([]);
        return;
      }

      const baseEntries = (data || []).map((entry) => ({ ...entry, methods: [] as EntryMethod[] }));
      const entryIds = baseEntries.map((entry) => entry.id);

      if (entryIds.length === 0) {
        setEntries(baseEntries);
        return;
      }

      const { data: methodLinks, error: methodsError } = await supabase
        .from("wiki_entry_categories")
        .select("entry_id, wiki_categories(id,name)")
        .in("entry_id", entryIds);

      if (methodsError) {
        console.error("[wiki] methods load failed", methodsError);
        setEntries(baseEntries);
        return;
      }

      const methodsByEntryId = new Map<string, EntryMethod[]>();
      for (const row of methodLinks || []) {
        const method = (row as any).wiki_categories as EntryMethod | null;
        if (!method?.id || !method?.name) continue;
        const current = methodsByEntryId.get((row as any).entry_id) ?? [];
        current.push(method);
        methodsByEntryId.set((row as any).entry_id, current);
      }

      console.log("[wiki] list loaded", {
        sessionUserId: userId,
        sessionEmail: session?.user?.email,
        profileId: profile?.id,
        profileEmail: profile?.email,
        profileRole: profile?.role,
        publishedEntries: baseEntries.length,
      });

      setEntries(
        baseEntries.map((entry) => ({
          ...entry,
          methods: methodsByEntryId.get(entry.id) ?? [],
        }))
      );
    })();
  }, [userId, session?.user?.email, profile?.id, profile?.email, profile?.role]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-6xl flex-1 w-full">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Wiki Entries (A–Z)</CardTitle>
                  {canEdit && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/wiki/admin">Create Wiki Page</Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {userId ? (
                  entries.length === 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">No published entries yet.</div>
                      {profile?.role && profile.role !== "Viewer" ? (
                        <div className="text-xs text-muted-foreground">
                          If you expected drafts, open <Link className="underline" to="/wiki/admin/drafts">Wiki Drafts</Link>.
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {entries.map((e) => (
                        <li key={e.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Link to={`/wiki/${e.slug}`} className="text-blue-600 hover:underline">
                              {e.title}
                            </Link>
                          </div>
                          {e.methods.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {e.methods.map((method) => (
                                <Link key={`${e.id}-${method.id}`} to={`/wiki/categories/${encodeURIComponent(method.name)}`}>
                                  <Badge variant="outline" className="cursor-pointer">
                                    {method.name}
                                  </Badge>
                                </Link>
                              ))}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <div className="text-sm text-muted-foreground">Sign in to view wiki entries.</div>
                )}
              </CardContent>
            </Card>
          </div>
          <div>
            <WikiSidebar />
          </div>
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Wiki;