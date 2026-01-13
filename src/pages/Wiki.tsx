"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/session-context";
import WikiSidebar from "@/components/wiki/WikiSidebar";
import { Link } from "react-router-dom";

const Wiki: React.FC = () => {
  const { session } = useSession();
  const userId = session?.user?.id ?? null;
  const [entries, setEntries] = React.useState<{ id: string; title: string; slug: string }[]>([]);

  React.useEffect(() => {
    if (!userId) {
      setEntries([]);
      return;
    }
    supabase
      .from("wiki_entries")
      .select("id,title,slug")
      .eq("user_id", userId)
      .eq("published", true)
      .order("title", { ascending: true })
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setEntries(data || []);
      });
  }, [userId]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-6xl flex-1 w-full">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Wiki Entries (A–Z)</CardTitle>
              </CardHeader>
              <CardContent>
                {userId ? (
                  entries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No entries yet.</div>
                  ) : (
                    <ul className="space-y-2">
                      {entries.map((e) => (
                        <li key={e.id} className="flex items-center justify-between">
                          <Link to={`/wiki/${e.slug}`} className="text-blue-600 hover:underline">
                            {e.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <div className="text-sm text-muted-foreground">Sign in to view your wiki entries.</div>
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