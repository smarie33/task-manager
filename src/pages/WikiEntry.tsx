"use client";

import React, { useEffect, useState, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import WikiSidebar from "@/components/wiki/WikiSidebar";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/context/user-profile-context";

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
type Script = { id: string; name: string };

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
      .select("id,title,slug,content,author,entry_date")
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

    // Ensure each <pre> has a <code> child for highlight.js
    el.querySelectorAll("pre").forEach((pre) => {
      const hasCode = !!pre.querySelector("code");
      if (!hasCode) {
        const code = document.createElement("code");
        code.textContent = pre.textContent ?? "";
        code.className = "language-plaintext";
        pre.innerHTML = "";
        pre.appendChild(code);
      }
    });

    // Apply highlighting
    el.querySelectorAll("pre code").forEach((code) => {
      hljs.highlightElement(code as HTMLElement);
    });
  }, [entry?.content]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-4xl flex-1 w-full">
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
            {entry?.entry_date && (
              <div className="text-sm text-muted-foreground">Date: {formatDate(entry.entry_date)}</div>
            )}
            {entry?.author && (
              <div className="text-sm text-muted-foreground">Author: {entry.author}</div>
            )}

            {/* Render HTML with highlighted code */}
            <div
              ref={contentRef}
              className="prose dark:prose-invert wiki-prose max-w-none"
              dangerouslySetInnerHTML={{ __html: entry?.content || "" }}
            />
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default WikiEntry;