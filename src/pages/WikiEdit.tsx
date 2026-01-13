"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/context/user-profile-context";
import { useParams, Link, useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";

const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^a-z0-9\-]/g, "").replace(/\-+/g, "-");

const WikiEdit: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useUserProfile();
  const { slug } = useParams();
  const navigate = useNavigate();

  const { users: adminUsers } = useAdminUsers();

  type WikiTag = { id: string; name: string };
  type WikiCategory = { id: string; name: string };
  type WikiScript = { id: string; name: string };

  const [entryId, setEntryId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [currentSlug, setCurrentSlug] = useState("");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);

  const [tags, setTags] = useState<WikiTag[]>([]);
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const [scripts, setScripts] = useState<WikiScript[]>([]);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedScriptIds, setSelectedScriptIds] = useState<string[]>([]);

  // NEW: inputs to add taxonomy
  const [newTag, setNewTag] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newScript, setNewScript] = useState("");

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
        setEntryId(data.id);
        setTitle(data.title ?? "");
        setCurrentSlug(data.slug ?? "");
        setAuthor(data.author ?? "");
        setDate(data.entry_date ?? new Date().toISOString().slice(0, 10));
        setContent(data.content ?? "");
        setPublished(!!data.published);
      });
  }, [slug]);

  // Load taxonomy lists for current user
  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("wiki_tags")
      .select("id,name")
      .eq("user_id", profile.id)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setTags(data || []);
      });
    supabase
      .from("wiki_categories")
      .select("id,name")
      .eq("user_id", profile.id)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setCategories(data || []);
      });
    supabase
      .from("wiki_scripts")
      .select("id,name")
      .eq("user_id", profile.id)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setScripts(data || []);
      });
  }, [profile?.id]);

  // Load current entry's taxonomy selections
  useEffect(() => {
    if (!entryId || !profile?.id) return;
    supabase
      .from("wiki_entry_tags")
      .select("tag_id")
      .eq("entry_id", entryId)
      .eq("user_id", profile.id)
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setSelectedTagIds((data || []).map((r: any) => r.tag_id));
      });
    supabase
      .from("wiki_entry_categories")
      .select("category_id")
      .eq("entry_id", entryId)
      .eq("user_id", profile.id)
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setSelectedCategoryIds((data || []).map((r: any) => r.category_id));
      });
    supabase
      .from("wiki_entry_scripts")
      .select("script_id")
      .eq("entry_id", entryId)
      .eq("user_id", profile.id)
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setSelectedScriptIds((data || []).map((r: any) => r.script_id));
      });
  }, [entryId, profile?.id]);

  const authorOptions = React.useMemo(() => {
    const nonViewer = (adminUsers || []).filter((u) => u.role !== "Viewer" && u.status === "active");
    const list = nonViewer.map((u) => ({ id: u.id, name: u.name || u.email || "Unknown" }));
    const currentName = profile?.name || profile?.email || "Unknown";
    const exists = list.find((o) => o.name === currentName);
    const combined = exists ? list : [{ id: profile?.id || "me", name: currentName }, ...list];
    const seen = new Set<string>();
    return combined.filter((o) => {
      if (seen.has(o.name)) return false;
      seen.add(o.name);
      return true;
    });
  }, [adminUsers, profile?.name, profile?.email, profile?.id]);

  const toggleSelection = (list: string[], id: string, setter: (v: string[]) => void) => {
    if (list.includes(id)) {
      setter(list.filter((x) => x !== id));
    } else {
      setter([...list, id]);
    }
  };

  // NEW: add taxonomy helpers (RLS-safe)
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

  // NEW: delete taxonomy helpers (unlink from all entries for this user, then delete)
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

  // Quill modules and formats: simple toolbar (code-block enabled)
  const quillModules = {
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

  const saveChanges = async () => {
    if (!entryId) return;
    if (!profile?.id) {
      toast({ title: "Not signed in", description: "Please sign in to edit entries." });
      return;
    }
    if (profile.role === "Viewer") {
      toast({ title: "Permission denied", description: "Viewers cannot edit entries." });
      return;
    }
    const { error } = await supabase
      .from("wiki_entries")
      .update({
        title,
        slug: currentSlug || computedSlug,
        author,
        entry_date: date,
        content,
        published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId);
    if (error) throw new Error(error.message);

    // Rewrite taxonomy links for this entry
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

    toast({ title: "Saved", description: published ? "Entry updated and published." : "Entry saved as draft." });
    navigate(`/wiki/${currentSlug || computedSlug}`);
  };

  const publishNow = async () => {
    setPublished(true);
    await saveChanges();
  };

  const saveDraft = async () => {
    setPublished(false);
    await saveChanges();
  };

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

            {/* NEW: Add taxonomy rows */}
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="newTag">Add Tag</Label>
                <div className="flex gap-2">
                  <Input id="newTag" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag name" />
                  <Button onClick={addTag} disabled={profile?.role === "Viewer"}>Add</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newCategory">Add Category</Label>
                <div className="flex gap-2">
                  <Input id="newCategory" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" />
                  <Button onClick={addCategory} disabled={profile?.role === "Viewer"}>Add</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newScript">Add Script</Label>
                <div className="flex gap-2">
                  <Input id="newScript" value={newScript} onChange={(e) => setNewScript(e.target.value)} placeholder="New script word" />
                  <Button onClick={addScript} disabled={profile?.role === "Viewer"}>Add</Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={published} onCheckedChange={(v) => setPublished(!!v)} />
              <Label>Published</Label>
              <span className="text-xs text-muted-foreground">
                Turn off to save as draft (not visible on non-admin pages).
              </span>
            </div>

            {/* Taxonomy selection with delete actions */}
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
                        disabled={profile?.role === "Viewer"}
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
                        disabled={profile?.role === "Viewer"}
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
                        disabled={profile?.role === "Viewer"}
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
                modules={quillModules}
                formats={quillFormats}
              />
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