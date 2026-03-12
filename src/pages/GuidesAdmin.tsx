"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/context/user-profile-context";
import { Trash2 } from "lucide-react";
import QuillEditor from "@/components/wiki/QuillEditor";

type GuidesTag = { id: string; name: string };
type GuidesCategory = { id: string; name: string };

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-");

const GuidesAdmin: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useUserProfile();

  const canEdit = !!profile && profile.role !== "Viewer";

  const [tags, setTags] = useState<GuidesTag[]>([]);
  const [categories, setCategories] = useState<GuidesCategory[]>([]);

  const [newTag, setNewTag] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const computedSlug = useMemo(() => slugify(title), [title]);

  useEffect(() => {
    setSlug(computedSlug);
  }, [computedSlug]);

  useEffect(() => {
    const defaultAuthor = profile?.name || profile?.email || "Unknown";
    setAuthor(defaultAuthor);
  }, [profile?.name, profile?.email]);

  useEffect(() => {
    supabase.from("guides_tags").select("id,name").order("name", { ascending: true }).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setTags(data || []);
    });

    supabase.from("guides_categories").select("id,name").order("name", { ascending: true }).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setCategories(data || []);
    });
  }, []);

  const toggleSelection = (list: string[], id: string, setter: (v: string[]) => void) => {
    if (list.includes(id)) setter(list.filter((x) => x !== id));
    else setter([...list, id]);
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to add tags." });
      return;
    }
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot create tags." });
      return;
    }

    const { data, error } = await supabase
      .from("guides_tags")
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
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot create categories." });
      return;
    }

    const { data, error } = await supabase
      .from("guides_categories")
      .insert({ user_id: profile.id, name: newCategory })
      .select("id,name")
      .single();

    if (error) throw new Error(error.message);
    setCategories((prev) => [...prev, data]);
    setNewCategory("");
    toast({ title: "Category created", description: `Added "${data.name}"` });
  };

  const removeTag = async (id: string, name: string) => {
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to manage tags." });
      return;
    }
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot delete tags." });
      return;
    }
    if (!window.confirm(`Delete tag "${name}"? This will unlink it from all guides.`)) return;

    const { error: linkErr } = await supabase.from("guides_entry_tags").delete().eq("user_id", profile.id).eq("tag_id", id);
    if (linkErr) throw new Error(linkErr.message);

    const { error } = await supabase.from("guides_tags").delete().eq("user_id", profile.id).eq("id", id);
    if (error) throw new Error(error.message);

    setTags((prev) => prev.filter((t) => t.id !== id));
    setSelectedTagIds((prev) => prev.filter((tid) => tid !== id));
    toast({ title: "Tag deleted", description: `"${name}" was removed.` });
  };

  const removeCategory = async (id: string, name: string) => {
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to manage categories." });
      return;
    }
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot delete categories." });
      return;
    }
    if (!window.confirm(`Delete category "${name}"? This will unlink it from all guides.`)) return;

    const { error: linkErr } = await supabase
      .from("guides_entry_categories")
      .delete()
      .eq("user_id", profile.id)
      .eq("category_id", id);
    if (linkErr) throw new Error(linkErr.message);

    const { error } = await supabase.from("guides_categories").delete().eq("user_id", profile.id).eq("id", id);
    if (error) throw new Error(error.message);

    setCategories((prev) => prev.filter((c) => c.id !== id));
    setSelectedCategoryIds((prev) => prev.filter((cid) => cid !== id));
    toast({ title: "Category deleted", description: `"${name}" was removed.` });
  };

  const createGuide = async () => {
    if (!title.trim()) {
      toast({ title: "Missing title", description: "Please enter a title." });
      return;
    }
    if (!slug) {
      toast({ title: "Invalid slug", description: "The slug derived from the title is empty." });
      return;
    }
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to create guides." });
      return;
    }
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot create guides." });
      return;
    }

    const { data: entry, error } = await supabase
      .from("guides_entries")
      .insert({
        user_id: profile.id,
        title,
        slug,
        author,
        entry_date: date,
        content,
        published,
      })
      .select("id,slug")
      .single();

    if (error) throw new Error(error.message);

    if (selectedTagIds.length) {
      const rows = selectedTagIds.map((tagId) => ({ user_id: profile.id, entry_id: entry.id, tag_id: tagId }));
      const { error: linkErr } = await supabase.from("guides_entry_tags").insert(rows);
      if (linkErr) throw new Error(linkErr.message);
    }

    if (selectedCategoryIds.length) {
      const rows = selectedCategoryIds.map((categoryId) => ({ user_id: profile.id, entry_id: entry.id, category_id: categoryId }));
      const { error: linkErr } = await supabase.from("guides_entry_categories").insert(rows);
      if (linkErr) throw new Error(linkErr.message);
    }

    toast({ title: "Guide created", description: "Your guide was saved." });
    window.location.href = `/guides/${entry.slug}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="p-4 container mx-auto max-w-4xl flex-1 w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Guides Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="newTag">Add Tag</Label>
                <div className="flex gap-2">
                  <Input id="newTag" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag name" />
                  <Button onClick={addTag} disabled={!canEdit}>Add</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newCategory">Add Category</Label>
                <div className="flex gap-2">
                  <Input
                    id="newCategory"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                  />
                  <Button onClick={addCategory} disabled={!canEdit}>Add</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Guide title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Route (auto)</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated-slug" />
                <div className="text-xs text-muted-foreground">Route will be /guides/{slug || "your-slug"}</div>
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

            <div className="flex items-center gap-3">
              <Switch checked={published} onCheckedChange={(v) => setPublished(!!v)} />
              <Label>Published</Label>
              <span className="text-xs text-muted-foreground">Turn off to save as draft.</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Tags</Label>
                <div className="flex flex-col gap-2 max-h-56 overflow-auto p-2 border rounded-md">
                  {tags.length === 0 && <div className="text-sm text-muted-foreground">No tags yet.</div>}
                  {tags.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedTagIds.includes(t.id)}
                        onCheckedChange={() => toggleSelection(selectedTagIds, t.id, setSelectedTagIds)}
                      />
                      <span className="flex-1">{t.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeTag(t.id, t.name)}
                        disabled={!canEdit}
                        aria-label={`Delete tag ${t.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Categories</Label>
                <div className="flex flex-col gap-2 max-h-56 overflow-auto p-2 border rounded-md">
                  {categories.length === 0 && <div className="text-sm text-muted-foreground">No categories yet.</div>}
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedCategoryIds.includes(c.id)}
                        onCheckedChange={() => toggleSelection(selectedCategoryIds, c.id, setSelectedCategoryIds)}
                      />
                      <span className="flex-1">{c.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeCategory(c.id, c.name)}
                        disabled={!canEdit}
                        aria-label={`Delete category ${c.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <QuillEditor value={content} onChange={setContent} />
            </div>

            <div className="flex justify-end">
              <Button onClick={createGuide} disabled={!canEdit}>
                {published ? "Publish Guide" : "Save Draft"}
              </Button>
            </div>

            {!canEdit && (
              <div className="text-sm text-muted-foreground">Viewers cannot create or edit guides.</div>
            )}
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default GuidesAdmin;
