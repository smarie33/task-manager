"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";

type Item = { id: string; name: string };

type TaxonomyEditorProps = {
  userId: string | null;
  entryId: string | null;
  canEdit: boolean;
  selectedTagIds: string[];
  setSelectedTagIds: (ids: string[]) => void;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: (ids: string[]) => void;
  selectedScriptIds: string[];
  setSelectedScriptIds: (ids: string[]) => void;
};

const TaxonomyEditor: React.FC<TaxonomyEditorProps> = ({
  userId,
  entryId,
  canEdit,
  selectedTagIds,
  setSelectedTagIds,
  selectedCategoryIds,
  setSelectedCategoryIds,
  selectedScriptIds,
  setSelectedScriptIds,
}) => {
  const { toast } = useToast();
  const [tags, setTags] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Item[]>([]);
  const [scripts, setScripts] = React.useState<Item[]>([]);
  const [newTag, setNewTag] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("");
  const [newScript, setNewScript] = React.useState("");

  // Load lists
  React.useEffect(() => {
    if (!userId) return;
    supabase.from("wiki_tags").select("id,name").eq("user_id", userId).order("name", { ascending: true }).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setTags(data || []);
    });
    supabase.from("wiki_categories").select("id,name").eq("user_id", userId).order("name", { ascending: true }).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setCategories(data || []);
    });
    supabase.from("wiki_scripts").select("id,name").eq("user_id", userId).order("name", { ascending: true }).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setScripts(data || []);
    });
  }, [userId]);

  // Load current selections
  React.useEffect(() => {
    if (!entryId || !userId) return;
    supabase.from("wiki_entry_tags").select("tag_id").eq("entry_id", entryId).eq("user_id", userId).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setSelectedTagIds((data || []).map((r: any) => r.tag_id));
    });
    supabase.from("wiki_entry_categories").select("category_id").eq("entry_id", entryId).eq("user_id", userId).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setSelectedCategoryIds((data || []).map((r: any) => r.category_id));
    });
    supabase.from("wiki_entry_scripts").select("script_id").eq("entry_id", entryId).eq("user_id", userId).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      setSelectedScriptIds((data || []).map((r: any) => r.script_id));
    });
  }, [entryId, userId, setSelectedTagIds, setSelectedCategoryIds, setSelectedScriptIds]);

  const toggleSelection = (current: string[], id: string, setter: (ids: string[]) => void) => {
    if (current.includes(id)) setter(current.filter((x) => x !== id));
    else setter([...current, id]);
  };

  // Add helpers
  const addTag = async () => {
    if (!newTag.trim()) return;
    if (!userId) {
      toast({ title: "Not signed in", description: "Please sign in to add tags." });
      return;
    }
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot create tags." });
      return;
    }
    const { data, error } = await supabase.from("wiki_tags").insert({ user_id: userId, name: newTag }).select("id,name").single();
    if (error) throw new Error(error.message);
    setTags((prev) => [...prev, data]);
    setNewTag("");
    toast({ title: "Tag created", description: `Added "${data.name}"` });
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    if (!userId) {
      toast({ title: "Not signed in", description: "Please sign in to add methods." });
      return;
    }
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot create methods." });
      return;
    }
    const { data, error } = await supabase.from("wiki_categories").insert({ user_id: userId, name: newCategory }).select("id,name").single();
    if (error) throw new Error(error.message);
    setCategories((prev) => [...prev, data]);
    setNewCategory("");
    toast({ title: "Method created", description: `Added "${data.name}"` });
  };

  const addScript = async () => {
    if (!newScript.trim()) return;
    if (!userId) {
      toast({ title: "Not signed in", description: "Please sign in to add scripts." });
      return;
    }
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot create scripts." });
      return;
    }
    const { data, error } = await supabase.from("wiki_scripts").insert({ user_id: userId, name: newScript }).select("id,name").single();
    if (error) throw new Error(error.message);
    setScripts((prev) => [...prev, data]);
    setNewScript("");
    toast({ title: "Script created", description: `Added "${data.name}"` });
  };

  // Delete helpers
  const removeTag = async (id: string, name: string) => {
    if (!userId) {
      toast({ title: "Not signed in", description: "Please sign in to manage tags." });
      return;
    }
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot delete tags." });
      return;
    }
    if (!window.confirm(`Delete tag "${name}"? This will unlink it from all entries.`)) return;
    const { error: linkErr } = await supabase.from("wiki_entry_tags").delete().eq("user_id", userId).eq("tag_id", id);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_tags").delete().eq("user_id", userId).eq("id", id);
    if (error) throw new Error(error.message);
    setTags((prev) => prev.filter((t) => t.id !== id));
    setSelectedTagIds(selectedTagIds.filter((tid) => tid !== id));
    toast({ title: "Tag deleted", description: `"${name}" was removed.` });
  };

  const removeCategory = async (id: string, name: string) => {
    if (!userId) {
      toast({ title: "Not signed in", description: "Please sign in to manage methods." });
      return;
    }
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot delete methods." });
      return;
    }
    if (!window.confirm(`Delete method "${name}"? This will unlink it from all entries.`)) return;
    const { error: linkErr } = await supabase.from("wiki_entry_categories").delete().eq("user_id", userId).eq("category_id", id);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_categories").delete().eq("user_id", userId).eq("id", id);
    if (error) throw new Error(error.message);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setSelectedCategoryIds(selectedCategoryIds.filter((cid) => cid !== id));
    toast({ title: "Method deleted", description: `"${name}" was removed.` });
  };

  const removeScript = async (id: string, name: string) => {
    if (!userId) {
      toast({ title: "Not signed in", description: "Please sign in to manage scripts." });
      return;
    }
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot delete scripts." });
      return;
    }
    if (!window.confirm(`Delete script "${name}"? This will unlink it from all entries.`)) return;
    const { error: linkErr } = await supabase.from("wiki_entry_scripts").delete().eq("user_id", userId).eq("script_id", id);
    if (linkErr) throw new Error(linkErr.message);
    const { error } = await supabase.from("wiki_scripts").delete().eq("user_id", userId).eq("id", id);
    if (error) throw new Error(error.message);
    setScripts((prev) => prev.filter((s) => s.id !== id));
    setSelectedScriptIds(selectedScriptIds.filter((sid) => sid !== id));
    toast({ title: "Script deleted", description: `"${name}" was removed.` });
  };

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="newTag">Add Tag</Label>
          <div className="flex gap-2">
            <Input id="newTag" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New tag name" />
            <Button onClick={addTag} disabled={!canEdit}>Add</Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="newCategory">Add Method</Label>
          <div className="flex gap-2">
            <Input id="newCategory" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New method name" />
            <Button onClick={addCategory} disabled={!canEdit}>Add</Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="newScript">Add Script</Label>
          <div className="flex gap-2">
            <Input id="newScript" value={newScript} onChange={(e) => setNewScript(e.target.value)} placeholder="New script word" />
            <Button onClick={addScript} disabled={!canEdit}>Add</Button>
          </div>
        </div>
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
          <Label>Methods</Label>
          <div className="flex flex-col gap-2 max-h-48 overflow-auto p-2 border rounded-md">
            {categories.length === 0 && <div className="text-sm text-muted-foreground">No methods yet.</div>}
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
                  aria-label={`Delete method ${c.name}`}
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
                  disabled={!canEdit}
                  aria-label={`Delete script ${s.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxonomyEditor;