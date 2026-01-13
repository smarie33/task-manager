"use client";

import React, { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import WikiSidebar from "@/components/wiki/WikiSidebar";

type Entry = {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string | null;
  entry_date: string | null;
};

type Tag = { id: string; name: string };
type Category = { id: string; name: string };

const WikiEntry: React.FC = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("wiki_entries")
      .select("id,title,slug,content,author,entry_date")
      .eq("slug", slug)
      .single()
      .then(async ({ data, error }) => {
        if (error) throw new Error(error.message);
        setEntry(data);
        const { data: tagLinks, error: tagsErr } = await supabase
          .from("wiki_entry_tags")
          .select("tag_id, wiki_tags(name,id)")
          .eq("entry_id", data.id);
        if (tagsErr) throw new Error(tagsErr.message);
        if (tagLinks) {
          const list: Tag[] = tagLinks.map((l: any) => l.wiki_tags).filter(Boolean);
          setTags(list);
        }
        const { data: catLinks, error: catsErr } = await supabase
          .from("wiki_entry_categories")
          .select("category_id, wiki_categories(name,id)")
          .eq("entry_id", data.id);
        if (catsErr) throw new Error(catsErr.message);
        if (catLinks) {
          const list: Category[] = catLinks.map((l: any) => l.wiki_categories).filter(Boolean);
          setCategories(list);
        }
      });
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-6xl flex-1 w-full">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{entry?.title || "Wiki Entry"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {entry?.entry_date && (
                  <div className="text-sm text-muted-foreground">Date: {entry.entry_date}</div>
                )}
                {entry?.author && (
                  <div className="text-sm text-muted-foreground">Author: {entry.author}</div>
                )}
                {(tags.length > 0 || categories.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span key={t.id} className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">
                        {t.name}
                      </span>
                    ))}
                    {categories.map((c) => (
                      <span key={c.id} className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs">
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: entry?.content || "" }} />
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

export default WikiEntry;