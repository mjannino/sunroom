"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// Minimal allowlist to keep editor-authored links from becoming an XSS vector
// (e.g. `javascript:` or `data:` URLs). Only allow http(s), mailto, and
// same-origin relative links.
function isAllowedLinkUrl(url: string): boolean {
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("mailto:") ||
    url.startsWith("/")
  );
}

/** Toolbar button class, lit when its mark/node is active at the cursor. */
function tb(active: boolean | undefined): string {
  return active ? "sr-tb is-active" : "sr-tb";
}

export function RichTextControl({
  value,
  onChange,
  ariaLabel,
}: {
  value: unknown;
  onChange: (html: string) => void;
  ariaLabel: string;
}): React.ReactElement {
  const editor = useEditor({
    extensions: [StarterKit],
    content: typeof value === "string" ? value : "",
    immediatelyRender: false, // SSR/hydration safety
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { "aria-label": ariaLabel, role: "textbox" } },
  });

  return (
    <div>
      <div role="toolbar" aria-label="Formatting" className="sr-toolbar">
        <button
          type="button"
          className={tb(editor?.isActive("paragraph"))}
          aria-label="Normal text (paragraph)"
          aria-pressed={editor?.isActive("paragraph") ?? false}
          onClick={() => editor?.chain().focus().setParagraph().run()}
        >
          P
        </button>
        <button
          type="button"
          className={tb(editor?.isActive("bold"))}
          aria-label="Toggle bold"
          aria-pressed={editor?.isActive("bold") ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={tb(editor?.isActive("italic"))}
          aria-label="Toggle italic"
          aria-pressed={editor?.isActive("italic") ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          className={tb(editor?.isActive("heading", { level: 2 }))}
          aria-label="Heading 2"
          aria-pressed={editor?.isActive("heading", { level: 2 }) ?? false}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </button>
        <button
          type="button"
          className={tb(editor?.isActive("bulletList"))}
          aria-label="Toggle bullet list"
          aria-pressed={editor?.isActive("bulletList") ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
        <button
          type="button"
          className={tb(editor?.isActive("link"))}
          aria-label="Insert link"
          aria-pressed={editor?.isActive("link") ?? false}
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url && isAllowedLinkUrl(url)) {
              editor?.chain().focus().toggleLink({ href: url }).run();
            }
          }}
        >
          Link
        </button>
      </div>
      <EditorContent editor={editor} className="sr-rich" />
    </div>
  );
}
