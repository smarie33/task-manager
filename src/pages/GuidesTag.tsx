"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/session-context";
import GuidesSidebar from "@/components/guides/GuidesSidebar";

type EntryBrief = { id: string; title: string; slug: string };

const GuidesTag: React.FC = () => {
  const { tagName } = useParams();
  const { session } = useSession();
  const userId = session?.user?.id ?? null;

  const [entries, setEntries] = React.useState<EntryBrief[]>([]);

  React.useEffect(() => {
    if (!userId || !tagName) {
      setEntries([]);
      return;
    }

    (async () => {
      const { data: tagRows, error: tagErr } = await supabase.from("guides_tags").select("id,name").eq("name", tagName).limit(1);
      if (tagErr) throw new Error(tagErr.message);
      const tag = tagRows && tagRows[0];
      if (!tag) {
        setEntries([]);
        return;
      }

      const { data: links, error: linkErr } = await supabase.from("guides_entry_tags").select("entry_id").eq("tag_id", tag.id);
      if (linkErr) throw new Error(linkErr.message);

      const entryIds = (links || []).map((l: any) => l.entry_id);
      if (entryIds.length === 0) {
        setEntries([]);
        return;
      }

      const { data: rows, error: eErr } = await supabase
        .from("guides_entries")
        .select("id,title,slug")
        .in("id", entryIds)
        .eq("published", true)
        .order("title", { ascending: true });

      if (eErr) throw new Error(eErr.message);
      setEntries(rows || []);
    })();
  }, [userId, tagName]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-6xl flex-1 w-full">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Guides tagged "{tagName}"</CardTitle>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No guides found for this tag.</div>
                ) : (
                  <ul className="space-y-2">
                    {entries.map((e) => (
                      <li key={e.id}>
                        <Link to={`/guides/${e.slug}`} className="text-blue-600 hover:underline">
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
            <GuidesSidebar />
          </div>
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default GuidesTag;