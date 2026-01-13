"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/session-context";
import { Link } from "react-router-dom";

type EntryBrief = { id: string; title: string; slug: string };
type WikiTag = { id: string; name: string };
type WikiCategory = { id: string; name: string };
type WikiScript = { id: string; name: string };

const WikiSidebar: React.FC = () => {
  const { session } = useSession();
  const userId = session?.user?.id ?? null;

  const [searchTerm, setSearchTerm] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<EntryBrief[]>([]);
  const [tags, setTags] = React.useState<WikiTag[]>([]);
  const [categories, setCategories] = React.useState<WikiCategory[]>([]);
  const [scripts, setScripts] = React.useState<WikiScript[]>([]);

  React.useEffect(() => {
    if (!userId) return;
    // Load tags, categories, scripts for the current user
    supabase
      .from("wiki_tags")
      .select("id,name")
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setTags(data || []);
      });

    supabase
      .from("wiki_categories")
      .select("id,name")
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setCategories(data || []);
      });

    supabase
      .from("wiki_scripts")
      .select("id,name")
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setScripts(data || []);
      });
  }, [userId]);

  React.useEffect(() => {
    if (!userId) return;
    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const like = `%${term}%`;
      const { data, error } = await supabase
        .from("wiki_entries")
        .select("id,title,slug")
        .eq("user_id", userId)
        .or(`title.ilike.${like},content.ilike.${like},author.ilike.${like}`)
        .order("title", { ascending: true })
        .limit(25);
      if (error) throw new Error(error.message);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchTerm, userId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Search Wiki</CardTitle>
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
                    <Link to={`/wiki/${r.slug}`} className="text-sm text-blue-600 hover:underline">
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
                <Link key={t.id} to={`/wiki/tags/${encodeURIComponent(t.name)}`}>
                  <Badge variant="secondary" className="text-xs cursor-pointer">{t.name}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-sm text-muted-foreground">No categories yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link key={c.id} to={`/wiki/categories/${encodeURIComponent(c.name)}`}>
                  <Badge variant="outline" className="text-xs cursor-pointer">{c.name}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scripts</CardTitle>
        </CardHeader>
        <CardContent>
          {scripts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No scripts yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {scripts.map((s) => (
                <Link key={s.id} to={`/wiki/scripts/${encodeURIComponent(s.name)}`}>
                  <Badge variant="default" className="text-xs cursor-pointer">{s.name}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WikiSidebar;