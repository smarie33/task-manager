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
} from "lucide-react";

type NotesEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

const NotesEditor: React.FC<NotesEditorProps> = ({ value, onChange, disabled = false }) => {
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const [color, setColor] = React.useState<string>("#000000");
  const [fontSize, setFontSize] = React.useState<number>(14);

  React.useEffect(() => {
    // Keep editor content in sync when value changes from above
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (command: string, valueArg?: string) => {
    if (disabled) return;
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, valueArg);
    editorRef.current?.focus();
    // Notify caller of change
    onChange(editorRef.current?.innerHTML || "");
  };

  const insertChecklistItem = () => {
    if (disabled) return;
    const html =
      '<div class="flex items-start gap-2"><input type="checkbox"/><span>Checklist item</span></div>';
    document.execCommand("insertHTML", false, html);
    onChange(editorRef.current?.innerHTML || "");
  };

  const handleCreateLink = () => {
    if (disabled) return;
    const url = window.prompt("Enter URL");
    if (!url) return;
    exec("createLink", url);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const c = e.target.value;
    setColor(c);
    exec("foreColor", c);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value || "14", 10);
    setFontSize(size);
    // Wrap selection in span with font-size style
    if (!disabled) {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("fontSize", false, "7"); // sets a span we can then restyle
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const ancestor = range.commonAncestorContainer as HTMLElement;
        const spans = (ancestor.nodeType === 1 ? (ancestor as HTMLElement) : ancestor.parentElement)?.querySelectorAll("span[style*='font-size']");
        // Best effort: set the last span's font-size
        if (spans && spans.length > 0) {
          const last = spans[spans.length - 1] as HTMLElement;
          last.style.fontSize = `${size}px`;
        }
      }
      onChange(editorRef.current?.innerHTML || "");
    }
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
          />
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => exec("insertOrderedList")} disabled={disabled} aria-label="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => exec("insertUnorderedList")} disabled={disabled} aria-label="Bullet list">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={insertChecklistItem} disabled={disabled} aria-label="Checklist">
            <CheckSquare className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleCreateLink} disabled={disabled} aria-label="Add link">
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        className={`min-h-[160px] p-3 prose dark:prose-invert max-w-none outline-none ${disabled ? "pointer-events-none opacity-70" : ""}`}
        onInput={() => onChange(editorRef.current?.innerHTML || "")}
        onBlur={() => onChange(editorRef.current?.innerHTML || "")}
      />
    </div>
  );
};

export default NotesEditor;