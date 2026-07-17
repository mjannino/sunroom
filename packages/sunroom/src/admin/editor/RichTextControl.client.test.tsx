// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichTextControl } from "./RichTextControl.js";

describe("RichTextControl", () => {
  it("renders an editable region and a toolbar (not the disabled placeholder)", () => {
    render(
      <RichTextControl value="<p>Hi</p>" onChange={vi.fn()} ariaLabel="body" />,
    );
    // A TipTap ProseMirror editor renders a contenteditable element.
    const editable = document.querySelector('[contenteditable="true"]');
    expect(editable).not.toBeNull();
    // toolbar has a Bold control
    expect(screen.getByRole("button", { name: /bold/i })).toBeTruthy();
  });

  it("loads the initial HTML content", () => {
    render(
      <RichTextControl
        value="<p>Hello world</p>"
        onChange={vi.fn()}
        ariaLabel="body"
      />,
    );
    expect(document.body.textContent).toContain("Hello world");
  });
});
