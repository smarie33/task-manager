"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/context/user-profile-context";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

type WikiTag = { id: string; name: string };
type WikiCategory = { id: string; name: string };
type WikiScript = { id: string; name: string };

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-");

const WikiAdmin: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useUserProfile();

  const [tags, setTags] = useState<WikiTag[]>([]);
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const [scripts, setScripts] = useState<WikiScript[]>([]);

  // Tag/category creation inputs
  const [newTag, setNewTag] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newScript, setNewScript] = useState("");

  // Entry form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [content, setContent] = useState("");

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedScriptIds, setSelectedScriptIds] = useState<string[]>([]);

  const computedSlug = useMemo(() => slugify(title), [title]);

  useEffect(() => {
    setSlug(computedSlug);
  }, [computedSlug]);

  useEffect(() => {
    // Default author from profile
    const defaultAuthor = profile?.name || profile?.email || "Unknown";
    setAuthor(defaultAuthor);
  }, [profile?.name, profile?.email]);

  useEffect(() => {
    // Load existing tags and categories
    supabase.from("wiki_tags").select("id,name").order("name", { ascending: true }).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setTags(data || []);
    });
    supabase.from("wiki_categories").select("id,name").order("name", { ascending: true }).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setCategories(data || []);
    });
    // Load scripts
    supabase.from("wiki_scripts").select("id,name").order("name", { ascending: true }).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setScripts(data || []);
    });
  }, []);

  const addTag = async () => {
    if (!newTag.trim()) return;
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to add tags." });
      return;
    }
    if (profile.role === "Viewer") {
      toast({ title: "Permission denied", description: "Viewers cannot create tags." });
      return;
    }
    const { data, error } = await supabase
      .from("wiki_tags")
      .insert({ user_id: profile.id, name: newTag })
      .select("id,name")
      .single();
    if (error) throw new Error(error.message);
    setTags((prev) => [...prev, data]);
    setNewTag("");
    toast({ title: "Tag created", description: `Added "${data.name}"` });
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to add categories." });
      return;
    }
    if (profile.role === "Viewer") {
      toast({ title: "Permission denied", description: "Viewers cannot create categories." });
      return;
    }
    const { data, error } = await supabase
      .from("wiki_categories")
      .insert({ user_id: profile.id, name: newCategory })
      .select("id,name")
      .single();
    if (error) throw new Error(error.message);
    setCategories((prev) => [...prev, data]);
    setNewCategory("");
    toast({ title: "Category created", description: `Added "${data.name}"` });
  };

  const addScript = async () => {
    if (!newScript.trim()) return;
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to add scripts." });
      return;
    }
    if (profile.role === "Viewer") {
      toast({ title: "Permission denied", description: "Viewers cannot create scripts." });
      return;
    }
    const { data, error } = await supabase
      .from("wiki_scripts")
      .insert({ user_id: profile.id, name: newScript })
      .select("id,name")
      .single();
    if (error) throw new Error(error.message);
    setScripts((prev) => [...prev, data]);
    setNewScript("");
    toast({ title: "Script created", description: `Added "${data.name}"` });
  };

  const toggleSelection = (list: string[], id: string, setter: (v: string[]) => void) => {
    if (list.includes(id)) {
      setter(list.filter((x) => x !== id));
    } else {
      setter([...list, id]);
    }
  };

  const createEntry = async () => {
    if (!title.trim()) {
      toast({ title: "Missing title", description: "Please enter a title for the entry." });
      return;
    }
    if (!slug) {
      toast({ title: "Invalid slug", description: "The slug derived from the title is empty." });
      return;
    }
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to create entries." });
      return;
    }
    if (profile.role === "Viewer") {
      toast({ title: "Permission denied", description: "Viewers cannot create entries." });
      return;
    }
    // Create the entry (include user_id to satisfy RLS)
    const { data: entry, error } = await supabase
      .from("wiki_entries")
      .insert({
        user_id: profile.id,
        title,
        slug,
        author,
        entry_date: date,
        content,
      })
      .select("id,slug")
      .single();
    if (error) throw new Error(error.message);

    // Link tags (include user_id to satisfy RLS)
    if (selectedTagIds.length) {
      const rows = selectedTagIds.map((tagId) => ({ user_id: profile.id, entry_id: entry.id, tag_id: tagId }));
      const { error: tagLinkError } = await supabase.from("wiki_entry_tags").insert(rows);
      if (tagLinkError) throw new Error(tagLinkError.message);
    }

    // Link categories
    if (selectedCategoryIds.length) {
      const rows = selectedCategoryIds.map((categoryId) => ({ entry_id: entry.id, category_id: categoryId, user_id: profile.id }));
      const { error: catLinkError } = await supabase.from("wiki_entry_categories").insert(rows);
      if (catLinkError) throw new Error(catLinkError.message);
    }

    // Link scripts
    if (selectedScriptIds.length) {
      const rows = selectedScriptIds.map((scriptId) => ({ entry_id: entry.id, script_id: scriptId, user_id: profile.id }));
      const { error: scriptLinkErr } = await supabase.from("wiki_entry_scripts").insert(rows);
      if (scriptLinkErr) throw new Error(scriptLinkErr.message);
    }

    toast({ title: "Entry created", description: "Your wiki entry was saved." });
    // Navigate to the new entry page
    window.location.href = `/wiki/${entry.slug}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-4xl flex-1 w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Wiki Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="newTag">Add Tag</Label>
                <div className="flex gap-2">
                  <Input id="newTag" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag name" />
                  <Button onClick={addTag}>Add</Button>
                </div>
                <div className="text-sm text-muted-foreground">Create tags to organize entries.</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newCategory">Add Category</Label>
                <div className="flex gap-2">
                  <Input id="newCategory" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" />
                  <Button onClick={addCategory}>Add</Button>
                </div>
                <div className="text-sm text-muted-foreground">Create categories to group entries.</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newScript">Add Script</Label>
                <div className="flex gap-2">
                  <Input id="newScript" value={newScript} onChange={(e) => setNewScript(e.target.value)} placeholder="New script word" />
                  <Button onClick={addScript}>Add</Button>
                </div>
                <div className="text-sm text-muted-foreground">Create scripts to classify entries.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Entry title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Route (auto)</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated-slug" />
                <div className="text-xs text-muted-foreground">Route will be /wiki/{slug || "your-slug"}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label>Tags</Label>
                <div className="flex flex-col gap-2 max-h-48 overflow-auto p-2 border rounded-md">
                  {tags.length === 0 && <div className="text-sm text-muted-foreground">No tags yet.</div>}
                  {tags.map((t) => (
                    <label key={t.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedTagIds.includes(t.id)}
                        onCheckedChange={() => toggleSelection(selectedTagIds, t.id, setSelectedTagIds)}
                      />
                      <span>{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Categories</Label>
                <div className="flex flex-col gap-2 max-h-48 overflow-auto p-2 border rounded-md">
                  {categories.length === 0 && <div className="text-sm text-muted-foreground">No categories yet.</div>}
                  {categories.map((c) => (
                    <label key={c.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedCategoryIds.includes(c.id)}
                        onCheckedChange={() => toggleSelection(selectedCategoryIds, c.id, setSelectedCategoryIds)}
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Scripts</Label>
                <div className="flex flex-col gap-2 max-h-48 overflow-auto p-2 border rounded-md">
                  {scripts.length === 0 && <div className="text-sm text-muted-foreground">No scripts yet.</div>}
                  {scripts.map((s) => (
                    <label key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedScriptIds.includes(s.id)}
                        onCheckedChange={() => toggleSelection(selectedScriptIds, s.id, setSelectedScriptIds)}
                      />
                      <span>{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <ReactQuill theme="snow" value={content} onChange={setContent} />
            </div>

            <div className="flex justify-end">
              <Button onClick={createEntry}>Create Entry</Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default WikiAdmin;