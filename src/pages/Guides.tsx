"use client";

import React from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/session-context";
import GuidesSidebar from "@/components/guides/GuidesSidebar";
import { Link } from "react-router-dom";
import { useUserProfile } from "@/context/user-profile-context";

const Guides: React.FC = () => {
  const { session } = useSession();
  const userId = session?.user?.id ?? null;
  const { profile } = useUserProfile();
  const isAdmin = profile?.role !== "Viewer";
  const canEdit = !!profile && profile.role !== "Viewer";

  const [entries, setEntries] = React.useState<{ id: string; title: string; slug: string }[]>([]);

  React.useEffect(() => {
    if (!userId) {
      setEntries([]);
      return;
    }

    let q = supabase
      .from("guides_entries")
      .select("id,title,slug")
      .eq("published", true)
      .order("title", { ascending: true });

    if (!isAdmin) q = q.eq("user_id", userId);

    q.then(({ data, error }) => {
      if (error) {
        console.error("[guides] list load failed", error);
        setEntries([]);
        return;
      }
      setEntries(data || []);
    });
  }, [userId, isAdmin]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-6xl flex-1 w-full">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Guides (A–Z)</CardTitle>
                  {canEdit && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/guides/admin">Create Guide Page</Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {userId ? (
                  entries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No published guides yet.</div>
                  ) : (
                    <ul className="space-y-2">
                      {entries.map((e) => (
                        <li key={e.id} className="flex items-center justify-between">
                          <Link to={`/guides/${e.slug}`} className="text-blue-600 hover:underline">
                            {e.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <div className="text-sm text-muted-foreground">Sign in to view guides.</div>
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

export default Guides;