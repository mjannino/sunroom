"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

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
      <div role="toolbar" style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        <button
          type="button"
          aria-label="bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          aria-label="italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          aria-label="heading"
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </button>
        <button
          type="button"
          aria-label="bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
        <button
          type="button"
          aria-label="link"
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) editor?.chain().focus().toggleLink({ href: url }).run();
          }}
        >
          Link
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
