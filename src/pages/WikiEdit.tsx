"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/context/user-profile-context";
import { useParams, Link, useNavigate } from "react-router-dom";
import AuthorSelect from "@/components/wiki/AuthorSelect";
import PublishedSwitch from "@/components/wiki/PublishedSwitch";
import QuillEditor from "@/components/wiki/QuillEditor";
import TaxonomyEditor from "@/components/wiki/TaxonomyEditor";

const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^a-z0-9\\-]/g, "").replace(/\\-+/g, "-");

type EntryRow = {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string | null;
  entry_date: string | null;
  published: boolean | null;
};

const WikiEdit: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useUserProfile();
  const { slug } = useParams();
  const navigate = useNavigate();

  const [entryId, setEntryId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [currentSlug, setCurrentSlug] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedScriptIds, setSelectedScriptIds] = useState<string[]>([]);

  const computedSlug = useMemo(() => slugify(title), [title]);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("wiki_entries")
      .select("id,title,slug,content,author,entry_date,published")
      .eq("slug", slug)
      .single()
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        const row = data as EntryRow;
        setEntryId(row.id);
        setTitle(row.title ?? "");
        setCurrentSlug(row.slug ?? "");
        setAuthor(row.author ?? "");
        setDate(row.entry_date ?? new Date().toISOString().slice(0, 10));
        setContent(row.content ?? "");
        setPublished(!!row.published);
      });
  }, [slug]);

  if (profile?.role === "Viewer") {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="p-4 container mx-auto max-w-4xl flex-1 w-full">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Viewers cannot edit wiki entries.</div>
              <div className="mt-4">
                <Link to={`/wiki/${slug}`} className="text-blue-600 hover:underline">Back to entry</Link>
              </div>
            </CardContent>
          </Card>
        </main>
        <MadeWithDyad />
      </div>
    );
  }

  const saveChanges = async (publishedOverride?: boolean) => {
    if (!entryId) return;
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to edit entries." });
      return;
    }
    if (profile.role === "Viewer") {
      toast({ title: "Permission denied", description: "Viewers cannot edit entries." });
      return;
    }
    const targetSlug = currentSlug || computedSlug;

    const { error } = await supabase
      .from("wiki_entries")
      .update({
        title,
        slug: targetSlug,
        author,
        entry_date: date,
        content,
        published: publishedOverride ?? published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId);
    if (error) throw new Error(error.message);

    // Rewrite taxonomy links
    await supabase.from("wiki_entry_tags").delete().eq("entry_id", entryId).eq("user_id", profile.id);
    await supabase.from("wiki_entry_categories").delete().eq("entry_id", entryId).eq("user_id", profile.id);
    await supabase.from("wiki_entry_scripts").delete().eq("entry_id", entryId).eq("user_id", profile.id);

    if (selectedTagIds.length) {
      const tagRows = selectedTagIds.map((tagId) => ({ entry_id: entryId, tag_id: tagId, user_id: profile.id }));
      const { error: tagErr } = await supabase.from("wiki_entry_tags").insert(tagRows);
      if (tagErr) throw new Error(tagErr.message);
    }
    if (selectedCategoryIds.length) {
      const catRows = selectedCategoryIds.map((categoryId) => ({ entry_id: entryId, category_id: categoryId, user_id: profile.id }));
      const { error: catErr } = await supabase.from("wiki_entry_categories").insert(catRows);
      if (catErr) throw new Error(catErr.message);
    }
    if (selectedScriptIds.length) {
      const scriptRows = selectedScriptIds.map((scriptId) => ({ entry_id: entryId, script_id: scriptId, user_id: profile.id }));
      const { error: scriptErr } = await supabase.from("wiki_entry_scripts").insert(scriptRows);
      if (scriptErr) throw new Error(scriptErr.message);
    }

    toast({ title: "Saved", description: (publishedOverride ?? published) ? "Entry updated and published." : "Entry saved as draft." });
    navigate(`/wiki/${targetSlug}`);
  };

  const publishNow = async () => {
    setPublished(true);
    await saveChanges(true);
  };

  const saveDraft = async () => {
    setPublished(false);
    await saveChanges(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-4xl flex-1 w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Wiki Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Entry title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Route</Label>
                <Input id="slug" value={currentSlug} onChange={(e) => setCurrentSlug(e.target.value)} placeholder={computedSlug || "auto-generated-slug"} />
                <div className="text-xs text-muted-foreground">Route will be /wiki/{currentSlug || computedSlug || "your-slug"}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Author</Label>
                <AuthorSelect value={author} onChange={setAuthor} />
              </div>
            </div>

            <PublishedSwitch checked={published} onChange={setPublished} />

            <TaxonomyEditor
              userId={profile?.id ?? null}
              entryId={entryId}
              canEdit={profile?.role !== "Viewer"}
              selectedTagIds={selectedTagIds}
              setSelectedTagIds={setSelectedTagIds}
              selectedCategoryIds={selectedCategoryIds}
              setSelectedCategoryIds={setSelectedCategoryIds}
              selectedScriptIds={selectedScriptIds}
              setSelectedScriptIds={setSelectedScriptIds}
            />

            <div className="space-y-2">
              <Label>Content</Label>
              <QuillEditor value={content} onChange={setContent} />
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={saveDraft}>Save Draft</Button>
              <Button onClick={saveChanges}>Save Changes</Button>
              <Button variant="secondary" onClick={publishNow}>Publish</Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default WikiEdit;