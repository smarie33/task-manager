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

type GuidesTaxonomyEditorProps = {
  userId: string | null;
  entryId: string | null;
  canEdit: boolean;
  selectedTagIds: string[];
  setSelectedTagIds: (ids: string[]) => void;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: (ids: string[]) => void;
};

const GuidesTaxonomyEditor: React.FC<GuidesTaxonomyEditorProps> = ({
  userId,
  entryId,
  canEdit,
  selectedTagIds,
  setSelectedTagIds,
  selectedCategoryIds,
  setSelectedCategoryIds,
}) => {
  const { toast } = useToast();

  const [tags, setTags] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Item[]>([]);
  const [newTag, setNewTag] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("");

  React.useEffect(() => {
    if (!userId) return;

    supabase
      .from("guides_tags")
      .select("id,name")
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setTags(data || []);
      });

    supabase
      .from("guides_categories")
      .select("id,name")
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setCategories(data || []);
      });
  }, [userId]);

  React.useEffect(() => {
    if (!entryId || !userId) return;

    supabase
      .from("guides_entry_tags")
      .select("tag_id")
      .eq("entry_id", entryId)
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setSelectedTagIds((data || []).map((r: any) => r.tag_id));
      });

    supabase
      .from("guides_entry_categories")
      .select("category_id")
      .eq("entry_id", entryId)
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        setSelectedCategoryIds((data || []).map((r: any) => r.category_id));
      });
  }, [entryId, userId, setSelectedTagIds, setSelectedCategoryIds]);

  const toggleSelection = (current: string[], id: string, setter: (ids: string[]) => void) => {
    if (current.includes(id)) setter(current.filter((x) => x !== id));
    else setter([...current, id]);
  };

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

    const { data, error } = await supabase
      .from("guides_tags")
      .insert({ user_id: userId, name: newTag })
      .select("id,name")
      .single();

    if (error) throw new Error(error.message);
    setTags((prev) => [...prev, data]);
    setNewTag("");
    toast({ title: "Tag created", description: `Added "${data.name}"` });
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    if (!userId) {
      toast({ title: "Not signed in", description: "Please sign in to add categories." });
      return;
    }
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot create categories." });
      return;
    }

    const { data, error } = await supabase
      .from("guides_categories")
      .insert({ user_id: userId, name: newCategory })
      .select("id,name")
      .single();

    if (error) throw new Error(error.message);
    setCategories((prev) => [...prev, data]);
    setNewCategory("");
    toast({ title: "Category created", description: `Added "${data.name}"` });
  };

  const removeTag = async (id: string, name: string) => {
    if (!userId) {
      toast({ title: "Not signed in", description: "Please sign in to manage tags." });
      return;
    }
    if (!canEdit) {
      toast({ title: "Permission denied", description: "Viewers cannot delete tags." });
      return;
    }
    if (!window.confirm(`Delete tag "${name}"? This will unlink it from all guides.`)) return;

    const { error: linkErr } = await supabase
      .from("guides_entry_tags")
      .delete()
      .eq("user_id", userId)
      .eq("tag_id", id);
    if (linkErr) throw new Error(linkErr.message);

    const { error } = await supabase
      .from("guides_tags")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
    if (error) throw new Error(error.message);

    setTags((prev) => prev.filter((t) => t.id !== id));
    setSelectedTagIds(selectedTagIds.filter((tid) => tid !== id));
    toast({ title: "Tag deleted", description: `"${name}" was removed.` });
  };

  const removeCategory = async (id: string, name: string) => {
    if (!userId) {
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
      .eq("user_id", userId)
      .eq("category_id", id);
    if (linkErr) throw new Error(linkErr.message);

    const { error } = await supabase
      .from("guides_categories")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
    if (error) throw new Error(error.message);

    setCategories((prev) => prev.filter((c) => c.id !== id));
    setSelectedCategoryIds(selectedCategoryIds.filter((cid) => cid !== id));
    toast({ title: "Category deleted", description: `"${name}" was removed.` });
  };

  return (
    <div className="space-y-6">
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
            <Input id="newCategory" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" />
            <Button onClick={addCategory} disabled={!canEdit}>Add</Button>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
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
    </div>
  );
};

export default GuidesTaxonomyEditor;
