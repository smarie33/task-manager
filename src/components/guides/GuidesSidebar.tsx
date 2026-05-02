"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/session-context";
import { Link } from "react-router-dom";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useUserProfile } from "@/context/user-profile-context";

type EntryBrief = { id: string; title: string; slug: string };
type GuidesTag = { id: string; name: string };
type GuidesCategory = { id: string; name: string };

const GuidesSidebar: React.FC = () => {
  const { session } = useSession();
  const userId = session?.user?.id ?? null;
  const { profile } = useUserProfile();
  const isAdmin = profile?.role !== "Viewer";

  const [searchTerm, setSearchTerm] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<EntryBrief[]>([]);
  const [tags, setTags] = React.useState<GuidesTag[]>([]);
  const [categories, setCategories] = React.useState<GuidesCategory[]>([]);

  const groupedCategories = React.useMemo(() => {
    const map: Record<string, GuidesCategory[]> = {};
    for (const c of categories) {
      const first = c.name?.trim()?.charAt(0) ?? "";
      const key = /^[A-Za-z]/.test(first) ? first.toUpperCase() : "#";
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    const keys = Object.keys(map).sort((a, b) => {
      if (a === "#" && b !== "#") return 1;
      if (b === "#" && a !== "#") return -1;
      return a.localeCompare(b);
    });
    keys.forEach((k) => map[k].sort((a, b) => a.name.localeCompare(b.name)));
    return keys.map((k) => [k, map[k]] as [string, GuidesCategory[]]);
  }, [categories]);

  React.useEffect(() => {
    if (!userId) return;

    let tagQ = supabase.from("guides_tags").select("id,name").order("name", { ascending: true });
    let catQ = supabase.from("guides_categories").select("id,name").order("name", { ascending: true });

    if (!isAdmin) {
      tagQ = tagQ.eq("user_id", userId);
      catQ = catQ.eq("user_id", userId);
    }

    tagQ.then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setTags(data || []);
    });

    catQ.then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setCategories(data || []);
    });
  }, [userId, isAdmin]);

  React.useEffect(() => {
    if (!userId) return;
    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const like = `%${term}%`;
      let q = supabase
        .from("guides_entries")
        .select("id,title,slug")
        .eq("published", true)
        .or(`title.ilike.${like},content.ilike.${like},author.ilike.${like}`)
        .order("title", { ascending: true })
        .limit(25);

      if (!isAdmin) q = q.eq("user_id", userId);

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      setSearchResults(data || []);
    }, 300);

    return () => clearTimeout(handle);
  }, [searchTerm, userId, isAdmin]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Search Guides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search titles, content, authors..."
          />
          <ScrollArea className="max-h-64">
            {searchResults.length === 0 ? (
              <div className="text-sm text-muted-foreground">No results yet.</div>
            ) : (
              <ul className="space-y-2">
                {searchResults.map((r) => (
                  <li key={r.id}>
                    <Link to={`/guides/${r.slug}`} className="text-sm text-blue-600 hover:underline">
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <div className="text-sm text-muted-foreground">No tags yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link key={t.id} to={`/guides/tags/${encodeURIComponent(t.name)}`}>
                  <Badge variant="secondary" className="text-xs cursor-pointer">
                    {t.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories (A–Z)</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-sm text-muted-foreground">No categories yet.</div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {groupedCategories.map(([letter, cats]) => (
                <AccordionItem key={letter} value={letter}>
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center">
                      <span className="mr-2">{letter}</span>
                      <span className="text-xs text-muted-foreground">({cats.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-2">
                      {cats.map((c) => (
                        <Link key={c.id} to={`/guides/categories/${encodeURIComponent(c.name)}`}>
                          <Badge variant="outline" className="text-xs cursor-pointer">
                            {c.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GuidesSidebar;