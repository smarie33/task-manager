"use client";

import React, { useEffect, useState, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import hljs from "highlight.js";
import "highlight.js/styles/monokai.css";
// Register C# explicitly (ensures language is available even in minimal builds)
import csharp from "highlight.js/lib/languages/csharp";
import WikiSidebar from "@/components/wiki/WikiSidebar";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/context/user-profile-context";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

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
type Script = { id: string; name: string };

// Normalize literal backslash-n sequences to real newlines for correct rendering in <pre><code>
const normalizeEntryHtml = (html: string) => {
  if (!html) return "";
  // Replace literal "\n" with actual newline, and normalize CRLF/CR to LF
  return html.replace(/\\n/g, "\n").replace(/\r\n?/g, "\n");
};

const WikiEntry: React.FC = () => {
  const { slug } = useParams();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
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
      .from("wiki_entries")
      .select("id,title,slug,content,author,entry_date,published")
      .eq("slug", slug)
      .single()
      .then(async ({ data, error }) => {
        if (error) throw new Error(error.message);
        setEntry(data);
        // Load tags
        const { data: tagLinks, error: tagsErr } = await supabase
          .from("wiki_entry_tags")
          .select("tag_id, wiki_tags(name,id)")
          .eq("entry_id", data.id);
        if (tagsErr) throw new Error(tagsErr.message);
        if (tagLinks) {
          const list: Tag[] = tagLinks
            .map((l: any) => l.wiki_tags)
            .filter(Boolean);
          setTags(list);
        }
        // Load categories
        const { data: catLinks, error: catsErr } = await supabase
          .from("wiki_entry_categories")
          .select("category_id, wiki_categories(name,id)")
          .eq("entry_id", data.id);
        if (catsErr) throw new Error(catsErr.message);
        if (catLinks) {
          const list: Category[] = catLinks
            .map((l: any) => l.wiki_categories)
            .filter(Boolean);
          setCategories(list);
        }

        // Load scripts
        const { data: scriptLinks, error: scriptsErr } = await supabase
          .from("wiki_entry_scripts")
          .select("script_id, wiki_scripts(name,id)")
          .eq("entry_id", data.id);
        if (scriptsErr) throw new Error(scriptsErr.message);
        if (scriptLinks) {
          const list: Script[] = scriptLinks
            .map((l: any) => l.wiki_scripts)
            .filter(Boolean);
          setScripts(list);
        }
      });
  }, [slug]);

  // Highlight code blocks when content changes
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // Ensure the C# language is registered
    hljs.registerLanguage("csharp", csharp);

    // Normalize pre/code
    el.querySelectorAll("pre").forEach((pre) => {
      let code = pre.querySelector("code");
      if (!code) {
        code = document.createElement("code");
        code.textContent = pre.textContent ?? "";
        pre.innerHTML = "";
        pre.appendChild(code);
      }
      // Map 'language-cs' to 'language-csharp' if present
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
                  <CardTitle>{entry?.title || "Wiki Entry"}</CardTitle>
                  {profile?.role && profile.role !== "Viewer" && entry?.slug && (
                    <Button variant="outline" size="sm" onClick={() => (window.location.href = `/wiki/${entry.slug}/edit`)}>
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(entry?.entry_date || entry?.author) && (
                  <div className="text-sm text-muted-foreground flex items-center justify-between">
                    {entry?.entry_date ? (
                      <span>{formatDate(entry.entry_date)}</span>
                    ) : (
                      <span />
                    )}
                    {entry?.author ? (
                      <span>Author: {entry.author}</span>
                    ) : (
                      <span />
                    )}
                  </div>
                )}

                {/* Render HTML with highlighted code */}
                <div
                  ref={contentRef}
                  className="prose dark:prose-invert wiki-prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: normalizeEntryHtml(entry?.content || "") }}
                />

                {/* Associated taxonomy with links */}
                {(categories.length > 0 || tags.length > 0 || scripts.length > 0) && (
                  <div className="pt-6 mt-4 border-t space-y-4">
                    {categories.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">Categories</div>
                        <div className="flex flex-wrap gap-2">
                          {categories.map((c) => (
                            <Link key={c.id} to={`/wiki/categories/${encodeURIComponent(c.name)}`}>
                              <Badge variant="outline" className="cursor-pointer">{c.name}</Badge>
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
                            <Link key={t.id} to={`/wiki/tags/${encodeURIComponent(t.name)}`}>
                              <Badge variant="secondary" className="cursor-pointer">{t.name}</Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {scripts.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">Scripts</div>
                        <div className="flex flex-wrap gap-2">
                          {scripts.map((s) => (
                            <Link key={s.id} to={`/wiki/scripts/${encodeURIComponent(s.name)}`}>
                              <Badge className="cursor-pointer">{s.name}</Badge>
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
              <WikiSidebar />
            </div>
          ) : null}
        </div>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default WikiEntry;