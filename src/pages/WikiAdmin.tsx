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
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { Trash2 } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
  const { users: adminUsers } = useAdminUsers();

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
  const [published, setPublished] = useState(false);

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

  const authorOptions = useMemo(() => {
    const nonViewer = (adminUsers || []).filter((u) => u.role !== "Viewer" && u.status === "active");
    const list = nonViewer.map((u) => ({ id: u.id, name: u.name || u.email || "Unknown" }));
    const currentName = profile?.name || profile?.email || "Unknown";
    const exists = list.find((o) => o.name === currentName);
    const combined = exists ? list : [{ id: profile?.id || "me", name: currentName }, ...list];
    // De-duplicate by name, keep order
    const seen = new Set<string>();
    return combined.filter((o) => {
      if (seen.has(o.name)) return false;
      seen.add(o.name);
      return true;
    });
  }, [adminUsers, profile?.name, profile?.email, profile?.id]);

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

  // Quill modules and formats to enable code blocks and inline code
  const quillModules = {
    syntax: {
      highlight: (text: string) => hljs.highlightAuto(text).value,
    },
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike", "blockquote", "code"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["code-block"],
      ["clean"],
    ],
  };

  const quillFormats = [
    "header",
    "bold", "italic", "underline", "strike", "blockquote", "code",
    "list", "bullet",
    "link", "image",
    "code-block",
  ];

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

  // Delete helpers (RLS-safe)
  const removeTag = async (id: string, name: string) => {
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to manage tags." });
      return;
    }
    if (profile.role === "Viewer") {
      toast({ title: "Permission denied", description: "Viewers cannot delete tags." });
      return;
    }
    if (!window.confirm(`Delete tag "${name}"? This will unlink it from all entries.`)) return;
    const { error: linkErr } = await supabase
      .from("wiki_entry_tags")
      .delete()
      .eq("user_id", profile.id)
      .eq("tag_id", id);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase
      .from("wiki_tags")
      .delete()
      .eq("user_id", profile.id)
      .eq("id", id);
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
    if (profile.role === "Viewer") {
      toast({ title: "Permission denied", description: "Viewers cannot delete categories." });
      return;
    }
    if (!window.confirm(`Delete category "${name}"? This will unlink it from all entries.`)) return;
    const { error: linkErr } = await supabase
      .from("wiki_entry_categories")
      .delete()
      .eq("user_id", profile.id)
      .eq("category_id", id);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase
      .from("wiki_categories")
      .delete()
      .eq("user_id", profile.id)
      .eq("id", id);
    if (error) throw new Error(error.message);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setSelectedCategoryIds((prev) => prev.filter((cid) => cid !== id));
    toast({ title: "Category deleted", description: `"${name}" was removed.` });
  };

  const removeScript = async (id: string, name: string) => {
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to manage scripts." });
      return;
    }
    if (profile.role === "Viewer") {
      toast({ title: "Permission denied", description: "Viewers cannot delete scripts." });
      return;
    }
    if (!window.confirm(`Delete script "${name}"? This will unlink it from all entries.`)) return;
    const { error: linkErr } = await supabase
      .from("wiki_entry_scripts")
      .delete()
      .eq("user_id", profile.id)
      .eq("script_id", id);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase
      .from("wiki_scripts")
      .delete()
      .eq("user_id", profile.id)
      .eq("id", id);
    if (error) throw new Error(error.message);
    setScripts((prev) => prev.filter((s) => s.id !== id));
    setSelectedScriptIds((prev) => prev.filter((sid) => sid !== id));
    toast({ title: "Script deleted", description: `"${name}" was removed.` });
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
        published,
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
                <Select value={author} onValueChange={(v) => setAuthor(v)}>
                  <SelectTrigger id="author">
                    <SelectValue placeholder="Select author" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorOptions.map((o) => (
                      <SelectItem key={o.id} value={o.name}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={published} onCheckedChange={(v) => setPublished(!!v)} />
              <Label>Published</Label>
              <span className="text-xs text-muted-foreground">
                Turn off to save as draft (not visible on non-admin pages).
              </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label>Tags</Label>
                <div className="flex flex-col gap-2 max-h-48 overflow-auto p-2 border rounded-md">
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
                <div className="flex flex-col gap-2 max-h-48 overflow-auto p-2 border rounded-md">
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
                        aria-label={`Delete category ${c.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Scripts</Label>
                <div className="flex flex-col gap-2 max-h-48 overflow-auto p-2 border rounded-md">
                  {scripts.length === 0 && <div className="text-sm text-muted-foreground">No scripts yet.</div>}
                  {scripts.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedScriptIds.includes(s.id)}
                        onCheckedChange={() => toggleSelection(selectedScriptIds, s.id, setSelectedScriptIds)}
                      />
                      <span className="flex-1">{s.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeScript(s.id, s.name)}
                        aria-label={`Delete script ${s.name}`}
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
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={createEntry}>{published ? "Publish Entry" : "Save Draft"}</Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default WikiAdmin;