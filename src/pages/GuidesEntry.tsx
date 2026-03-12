"use client";

import React, { useEffect, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import hljs from "highlight.js";
import "highlight.js/styles/monokai.css";
import csharp from "highlight.js/lib/languages/csharp";
import GuidesSidebar from "@/components/guides/GuidesSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/context/user-profile-context";

type Entry = {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string | null;
  entry_date: string | null;
  published?: boolean | null;
};

type Tag = { id: string; name: string };
type Category = { id: string; name: string };

const normalizeEntryHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/\\n/g, "\n").replace(/\r\n?/g, "\n");
};

const GuidesEntry: React.FC = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { profile } = useUserProfile();

  const formatDate = (d?: string | null) => {
    if (!d) return null;
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return d;
    return parsed.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  };

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("guides_entries")
      .select("id,title,slug,content,author,entry_date,published")
      .eq("slug", slug)
      .single()
      .then(async ({ data, error }) => {
        if (error) throw new Error(error.message);
        setEntry(data);

        const { data: tagLinks, error: tagsErr } = await supabase
          .from("guides_entry_tags")
          .select("tag_id, guides_tags(name,id)")
          .eq("entry_id", data.id);
        if (tagsErr) throw new Error(tagsErr.message);
        setTags((tagLinks || []).map((l: any) => l.guides_tags).filter(Boolean));

        const { data: catLinks, error: catsErr } = await supabase
          .from("guides_entry_categories")
          .select("category_id, guides_categories(name,id)")
          .eq("entry_id", data.id);
        if (catsErr) throw new Error(catsErr.message);
        setCategories((catLinks || []).map((l: any) => l.guides_categories).filter(Boolean));
      });
  }, [slug]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    hljs.registerLanguage("csharp", csharp);

    el.querySelectorAll("pre").forEach((pre) => {
      let code = pre.querySelector("code");
      if (!code) {
        code = document.createElement("code");
        code.textContent = pre.textContent ?? "";
        pre.innerHTML = "";
        pre.appendChild(code);
      }
      if (code.classList.contains("language-cs")) {
        code.classList.remove("language-cs");
        code.classList.add("language-csharp");
      }
    });

    el.querySelectorAll("pre code").forEach((codeEl) => {
      hljs.highlightElement(codeEl as HTMLElement);
    });
  }, [entry?.content]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-6xl flex-1 w-full">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{entry?.title || "Guide"}</CardTitle>
                  {profile?.role && profile.role !== "Viewer" && entry?.slug && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/guides/${entry.slug}/edit`}>Edit</Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(entry?.entry_date || entry?.author) && (
                  <div className="text-sm text-muted-foreground flex items-center justify-between">
                    {entry?.entry_date ? <span>{formatDate(entry.entry_date)}</span> : <span />}
                    {entry?.author ? <span>Author: {entry.author}</span> : <span />}
                  </div>
                )}

                <div
                  ref={contentRef}
                  className="prose dark:prose-invert wiki-prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: normalizeEntryHtml(entry?.content || "") }}
                />

                {(categories.length > 0 || tags.length > 0) && (
                  <div className="pt-6 mt-4 border-t space-y-4">
                    {categories.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">Categories</div>
                        <div className="flex flex-wrap gap-2">
                          {categories.map((c) => (
                            <Link key={c.id} to={`/guides/categories/${encodeURIComponent(c.name)}`}>
                              <Badge variant="outline" className="cursor-pointer">
                                {c.name}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">Tags</div>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((t) => (
                            <Link key={t.id} to={`/guides/tags/${encodeURIComponent(t.name)}`}>
                              <Badge variant="secondary" className="cursor-pointer">
                                {t.name}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {entry?.published ? (
            <div>
              <GuidesSidebar />
            </div>
          ) : null}
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default GuidesEntry;