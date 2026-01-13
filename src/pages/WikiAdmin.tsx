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

  // Tag/category creation inputs
  const [newTag, setNewTag] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // Entry form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [content, setContent] = useState("");

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

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

  // Create a default taxonomy: "Scripts"
  const createScriptsTaxonomy = async () => {
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to create taxonomies." });
      return;
    }
    if (profile.role === "Viewer") {
      toast({ title: "Permission denied", description: "Viewers cannot create taxonomies." });
      return;
    }
    // Check if "Scripts" already exists for this user
    const { data: existing, error: checkErr } = await supabase
      .from("wiki_categories")
      .select("id,name")
      .eq("user_id", profile.id)
      .eq("name", "Scripts")
      .limit(1);
    if (checkErr) throw new Error(checkErr.message);
    if (existing && existing.length > 0) {
      toast({ title: "Already exists", description: `"Scripts" taxonomy is already created.` });
      return;
    }
    // Insert "Scripts" category
    const { data, error } = await supabase
      .from("wiki_categories")
      .insert({ user_id: profile.id, name: "Scripts" })
      .select("id,name")
      .single();
    if (error) throw new Error(error.message);
    setCategories((prev) => [...prev, data]);
    toast({ title: "Taxonomy created", description: `Created "Scripts" category.` });
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

    // Link categories (include user_id to satisfy RLS)
    if (selectedCategoryIds.length) {
      const rows = selectedCategoryIds.map((categoryId) => ({ user_id: profile.id, entry_id: entry.id, category_id: categoryId }));
      const { error: catLinkError } = await supabase.from("wiki_entry_categories").insert(rows);
      if (catLinkError) throw new Error(catLinkError.message);
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
            <div className="grid sm:grid-cols-2 gap-6">
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
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={createScriptsTaxonomy}>
                    Create "Scripts" taxonomy
                  </Button>
                </div>
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

            <div className="grid sm:grid-cols-2 gap-6">
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