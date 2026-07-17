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
      <div
        role="toolbar"
        aria-label="Formatting"
        style={{ display: "flex", gap: 4, marginBottom: 4 }}
      >
        <button
          type="button"
          aria-label="Toggle bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          aria-label="Toggle italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          aria-label="Heading 2"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </button>
        <button
          type="button"
          aria-label="Toggle bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
        <button
          type="button"
          aria-label="Insert link"
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
      <EditorContent editor={editor} />
    </div>
  );
}
