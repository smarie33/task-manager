"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  ListOrdered,
  List,
  CheckSquare,
  Link as LinkIcon,
  Palette,
  Type as TypeIcon,
  Image as ImageIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type NotesEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

const NotesEditor: React.FC<NotesEditorProps> = ({ value, onChange, disabled = false }) => {
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const [color, setColor] = React.useState<string>("#000000");
  const [fontSize, setFontSize] = React.useState<number>(14);
  const savedRangeRef = React.useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [imageOpen, setImageOpen] = React.useState(false);
  const [imageFile, setImageFile] = React.useState<File | null>(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range;
    }
  };

  const restoreSelection = () => {
    if (!savedRangeRef.current) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(savedRangeRef.current);
  };

  const applyStyleToSelection = (style: Partial<CSSStyleDeclaration>) => {
    if (disabled) return;
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let range = sel.getRangeAt(0);
    if (!editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) return;
    if (sel.isCollapsed) {
      const span = document.createElement("span");
      Object.assign(span.style, style);
      span.appendChild(document.createTextNode("\u200B"));
      range.insertNode(span);
      const newRange = document.createRange();
      if (span.firstChild) {
        newRange.setStart(span.firstChild, 1);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedRangeRef.current = newRange;
      }
    } else {
      const contents = range.extractContents();
      const span = document.createElement("span");
      Object.assign(span.style, style);
      span.appendChild(contents);
      range.insertNode(span);
      const newRange = document.createRange();
      newRange.selectNodeContents(span); // keep selection highlighted across the styled span
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      savedRangeRef.current = newRange;
    }
    onChange(editorRef.current?.innerHTML || "");
    editorRef.current?.focus();
  };

  React.useEffect(() => {
    // Keep editor content in sync when value changes from above.
    // IMPORTANT: don't overwrite while the user is actively editing (prevents wiping/cursor jumps,
    // especially for newly-created tasks with empty notes).
    if (!editorRef.current) return;
    if (document.activeElement === editorRef.current) return;

    const next = value || "";
    if (editorRef.current.innerHTML !== next) {
      editorRef.current.innerHTML = next;
    }
  }, [value]);

  const exec = (command: string, valueArg?: string) => {
    if (disabled) return;
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, valueArg);
    saveSelection();
    editorRef.current?.focus();
    onChange(editorRef.current?.innerHTML || "");
  };

  const insertChecklistItem = () => {
    if (disabled) return;
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let range = sel.getRangeAt(0);
    if (!editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) return;

    // If there's highlighted text, convert it into one or more checklist lines.
    const selectedText = sel.toString();
    if (selectedText && selectedText.trim().length > 0 && !sel.isCollapsed) {
      const lines = selectedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const nodes: HTMLElement[] = [];
      for (const line of lines) {
        const wrapper = document.createElement("div");
        wrapper.className = "flex items-center gap-2 leading-6";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "align-middle";
        const text = document.createElement("span");
        text.textContent = line || "Checklist item";
        wrapper.appendChild(cb);
        wrapper.appendChild(text);
        nodes.push(wrapper);
      }

      // Replace selection with the checklist items (preserving order)
      range.deleteContents();
      let lastNode: Node | null = null;
      for (const n of nodes) {
        range.insertNode(n);
        lastNode = n;
        // Move range after the inserted node to keep appending in order
        range.setStartAfter(n);
        range.setEndAfter(n);
      }

      // Place caret after the last inserted node
      const newRange = document.createRange();
      if (lastNode) {
        newRange.setStartAfter(lastNode);
        newRange.setEndAfter(lastNode);
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedRangeRef.current = newRange;
      }
      onChange(editorRef.current?.innerHTML || "");
      editorRef.current?.focus();
    } else {
      // No selection: insert a default checklist line at caret
      const html =
        '<div class="flex items-center gap-2 leading-6"><input type="checkbox" class="align-middle"/><span>Checklist item</span></div>';
      document.execCommand("insertHTML", false, html);
      saveSelection();
      onChange(editorRef.current?.innerHTML || "");
    }
  };

  const normalizeUrl = (u: string) => {
    const t = u.trim();
    if (!t) return "";
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
  };

  const openLinkDialog = () => {
    if (disabled) return;
    saveSelection();
    setLinkUrl("");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const url = normalizeUrl(linkUrl);
    if (!url) {
      setLinkOpen(false);
      return;
    }
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setLinkOpen(false);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) {
      setLinkOpen(false);
      return;
    }

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "underline text-blue-600";

    if (sel.isCollapsed) {
      a.textContent = url;
      range.insertNode(a);
      const newRange = document.createRange();
      newRange.setStartAfter(a);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedRangeRef.current = newRange;
    } else {
      const contents = range.extractContents();
      a.appendChild(contents);
      range.insertNode(a);
      const newRange = document.createRange();
      newRange.selectNode(a);
      sel.removeAllRanges();
      sel.addRange(newRange);
      savedRangeRef.current = newRange;
    }

    onChange(editorRef.current?.innerHTML || "");
    editorRef.current?.focus();
    setLinkOpen(false);
  };

  const openImageDialog = () => {
    if (disabled) return;
    saveSelection();
    setImageFile(null);
    setImageOpen(true);
  };

  const applyImage = async () => {
    if (disabled) return;
    if (!imageFile) {
      setImageOpen(false);
      return;
    }

    // Keep inserts reasonable; images are embedded as data URLs into notes HTML.
    if (imageFile.size > 2 * 1024 * 1024) {
      // eslint-disable-next-line no-alert
      alert("Please choose an image smaller than 2MB.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(imageFile);
    });

    const editor = editorRef.current;
    if (!editor) {
      setImageOpen(false);
      return;
    }

    restoreSelection();

    const sel = window.getSelection();
    let range = savedRangeRef.current;

    // If we can't restore a valid range inside the editor (common after dialogs), insert at end.
    if (!sel || !range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    const safeAlt = imageFile.name.replace(/"/g, "");

    // Build nodes (more reliable than execCommand for keeping typing inside the editor)
    const figure = document.createElement("figure");
    figure.className = "notes-inline-figure";

    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = safeAlt;
    img.className = "notes-inline-image";

    figure.appendChild(img);

    const p = document.createElement("p");
    p.appendChild(document.createElement("br"));

    const frag = document.createDocumentFragment();
    frag.appendChild(figure);
    frag.appendChild(p);

    range.deleteContents();
    range.insertNode(frag);

    // Place caret inside the trailing paragraph so typing stays inside the editor.
    editor.focus();
    const nextSel = window.getSelection();
    if (nextSel) {
      const caret = document.createRange();
      caret.setStart(p, 0);
      caret.collapse(true);
      nextSel.removeAllRanges();
      nextSel.addRange(caret);
      savedRangeRef.current = caret;
    }

    onChange(editor.innerHTML || "");
    setImageOpen(false);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const c = e.target.value;
    setColor(c);
    applyStyleToSelection({ color: c });
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value || "14", 10);
    setFontSize(size);
    applyStyleToSelection({ fontSize: `${size}px` });
  };

  return (
    <div className="border rounded-md">
      <div className="flex flex-wrap items-center gap-2 p-2 border-b bg-muted/40">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => exec("bold")} disabled={disabled} aria-label="Bold">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => exec("italic")} disabled={disabled} aria-label="Italic">
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => exec("underline")} disabled={disabled} aria-label="Underline">
            <Underline className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => exec("strikeThrough")} disabled={disabled} aria-label="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <Input
            type="color"
            value={color}
            onChange={handleColorChange}
            disabled={disabled}
            className="h-8 w-8 p-0 border-0 bg-transparent cursor-pointer"
            aria-label="Font color"
            onMouseDown={saveSelection}
          />
        </div>

        <div className="flex items-center gap-2">
          <TypeIcon className="h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            min={10}
            max={48}
            step={1}
            value={fontSize}
            onChange={handleFontSizeChange}
            disabled={disabled}
            className="h-8 w-20"
            aria-label="Font size"
            onMouseDown={saveSelection}
          />
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => exec("insertOrderedList")} disabled={disabled} aria-label="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => exec("insertUnorderedList")} disabled={disabled} aria-label="Bullet list">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={insertChecklistItem} disabled={disabled} aria-label="Checklist" onMouseDown={saveSelection}>
            <CheckSquare className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onMouseDown={saveSelection} onClick={openLinkDialog} disabled={disabled} aria-label="Add link">
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onMouseDown={saveSelection} onClick={openImageDialog} disabled={disabled} aria-label="Insert image">
            <ImageIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Link dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a link</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button onClick={applyLink}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image dialog */}
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
            {imageFile ? (
              <p className="text-xs text-muted-foreground">
                Selected: {imageFile.name} ({Math.round(imageFile.size / 1024)} KB)
              </p>
            ) : null}
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setImageOpen(false)}>Cancel</Button>
            <Button onClick={applyImage} disabled={!imageFile}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        className={`min-h-[160px] p-3 prose dark:prose-invert max-w-none outline-none notes-prose ${disabled ? "pointer-events-none opacity-70" : ""}`}
        onInput={() => onChange(editorRef.current?.innerHTML || "")}
        onBlur={() => onChange(editorRef.current?.innerHTML || "")}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onFocus={saveSelection}
      />
    </div>
  );
};

export default NotesEditor;