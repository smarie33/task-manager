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
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^a-z0-9\-]/g, "").replace(/\-+/g, "-");

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

  // Quill modules and formats (code block support)
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
                <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={published} onCheckedChange={(v) => setPublished(!!v)} />
              <Label>Published</Label>
              <span className="text-xs text-muted-foreground">
                Turn off to save as draft (not visible on non-admin pages).
              </span>
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