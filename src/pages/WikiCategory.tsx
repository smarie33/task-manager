"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/session-context";
import WikiSidebar from "@/components/wiki/WikiSidebar";
import { useUserProfile } from "@/context/user-profile-context";

type EntryBrief = { id: string; title: string; slug: string };

const WikiCategory: React.FC = () => {
  const { categoryName } = useParams();
  const { session } = useSession();
  const userId = session?.user?.id ?? null;
  const { profile } = useUserProfile();
  const isAdmin = profile?.role === "Admin";

  const [entries, setEntries] = React.useState<EntryBrief[]>([]);

  React.useEffect(() => {
    if (!userId || !categoryName) {
      setEntries([]);
      return;
    }
    (async () => {
      let catQ = supabase.from("wiki_categories").select("id,name").eq("name", categoryName).limit(1);
      if (!isAdmin) catQ = catQ.eq("user_id", userId);
      const { data: catRows, error: catErr } = await catQ;
      if (catErr) throw new Error(catErr.message);
      const category = catRows && catRows[0];
      if (!category) {
        setEntries([]);
        return;
      }

      let linkQ = supabase.from("wiki_entry_categories").select("entry_id").eq("category_id", category.id);
      if (!isAdmin) linkQ = linkQ.eq("user_id", userId);
      const { data: links, error: linkErr } = await linkQ;
      if (linkErr) throw new Error(linkErr.message);

      const entryIds = (links || []).map((l: any) => l.entry_id);
      if (entryIds.length === 0) {
        setEntries([]);
        return;
      }

      let entryQ = supabase
        .from("wiki_entries")
        .select("id,title,slug")
        .in("id", entryIds)
        .eq("published", true)
        .order("title", { ascending: true });
      if (!isAdmin) entryQ = entryQ.eq("user_id", userId);

      const { data: rows, error: eErr } = await entryQ;
      if (eErr) throw new Error(eErr.message);
      setEntries(rows || []);
    })();
  }, [userId, categoryName, isAdmin]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-6xl flex-1 w-full">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Entries in "{categoryName}"</CardTitle>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No entries found for this category.</div>
                ) : (
                  <ul className="space-y-2">
                    {entries.map((e) => (
                      <li key={e.id}>
                        <Link to={`/wiki/${e.slug}`} className="text-blue-600 hover:underline">
                          {e.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
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

export default WikiCategory;