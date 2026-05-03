"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/session-context";
import WikiSidebar from "@/components/wiki/WikiSidebar";
import { Link } from "react-router-dom";
import { useUserProfile } from "@/context/user-profile-context";

type EntryListItem = { id: string; title: string; slug: string };

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

      console.log("[wiki] list loaded", {
        sessionUserId: userId,
        sessionEmail: session?.user?.email,
        profileId: profile?.id,
        profileEmail: profile?.email,
        profileRole: profile?.role,
        publishedEntries: (data || []).length,
      });

      setEntries(data || []);
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
                    <ul className="space-y-2">
                      {entries.map((entry) => (
                        <li key={entry.id}>
                          <Link to={`/wiki/${entry.slug}`} className="text-blue-600 hover:underline">
                            {entry.title}
                          </Link>
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
