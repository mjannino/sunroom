// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { f } from "../../core/fields.js";
import type { FieldDescriptor } from "../../core/fields.js";
import { FieldControl } from "./FieldControl.js";

function renderControl(
  field: FieldDescriptor,
  value: unknown,
  onChange = vi.fn(),
) {
  render(
    <FieldControl
      name="fld"
      field={field}
      value={value}
      onChange={onChange}
      path="fld"
      issues={[]}
      depth={0}
    />,
  );
  return onChange;
}

describe("scalar controls", () => {
  it("number parses to a number and clears to undefined", () => {
    const onChange = renderControl(f.number(), 3);
    const input = screen.getByLabelText("fld") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "42" } });
    expect(onChange).toHaveBeenLastCalledWith(42);
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it("boolean toggles", () => {
    const onChange = renderControl(f.boolean(), false);
    fireEvent.click(screen.getByLabelText("fld"));
    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it("select changes value", () => {
    const onChange = renderControl(
      f.select({
        options: [
          { label: "A", value: "a" },
          { label: "B", value: "b" },
        ],
      }),
      "a",
    );
    fireEvent.change(screen.getByLabelText("fld"), { target: { value: "b" } });
    expect(onChange).toHaveBeenLastCalledWith("b");
  });

  it("link edits as a string", () => {
    const onChange = renderControl(f.link(), "");
    fireEvent.change(screen.getByLabelText("fld"), {
      target: { value: "https://x.com" },
    });
    expect(onChange).toHaveBeenLastCalledWith("https://x.com");
  });
});

describe("object control", () => {
  it("edits a nested sub-field without touching siblings", () => {
    const onChange = vi.fn();
    render(
      <FieldControl
        name="cta"
        field={f.object({ label: f.text(), href: f.link() })}
        value={{ label: "Go", href: "" }}
        onChange={onChange}
        path="cta"
        issues={[]}
        depth={0}
      />,
    );
    fireEvent.change(screen.getByLabelText("href"), {
      target: { value: "/x" },
    });
    expect(onChange).toHaveBeenLastCalledWith({ label: "Go", href: "/x" });
  });
});

describe("array control", () => {
  const field = f.array(f.object({ author: f.text() }));

  it("adds an item seeded from the element default", () => {
    const onChange = vi.fn();
    render(
      <FieldControl
        name="quotes"
        field={field}
        value={[]}
        onChange={onChange}
        path="quotes"
        issues={[]}
        depth={0}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(onChange).toHaveBeenLastCalledWith([{ author: "" }]);
  });

  it("removes and reorders items", () => {
    const onChange = vi.fn();
    const value = [{ author: "A" }, { author: "B" }];
    const { rerender } = render(
      <FieldControl
        name="quotes"
        field={field}
        value={value}
        onChange={onChange}
        path="quotes"
        issues={[]}
        depth={0}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /move down/i })[0]!);
    expect(onChange).toHaveBeenLastCalledWith([
      { author: "B" },
      { author: "A" },
    ]);
    // Realistic controlled round-trip: a real parent stores exactly what onChange
    // emitted and passes it back in as the next `value` (this is what fixes the
    // Slice-2 index-key footgun — see below).
    const reordered = onChange.mock.calls[0]![0];

    onChange.mockClear();
    rerender(
      <FieldControl
        name="quotes"
        field={field}
        value={reordered}
        onChange={onChange}
        path="quotes"
        issues={[]}
        depth={0}
      />,
    );
    // Index-key footgun fix: "remove index 0" now targets whichever ITEM is
    // actually at position 0 after the reorder (B), not whichever item happened
    // to be at index 0 in some earlier, stale render. With stable {id,value}
    // identity, removing index 0 post-reorder correctly drops "B" and keeps "A".
    fireEvent.click(screen.getAllByRole("button", { name: /remove/i })[0]!);
    expect(onChange).toHaveBeenLastCalledWith([{ author: "A" }]);
  });
});

describe("array control {id,value}", () => {
  const field = f.array(f.object({ author: f.text() }));

  it("emits a plain array on add/remove/reorder (not {id,value})", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FieldControl
        name="quotes"
        field={field}
        value={[{ author: "A" }]}
        onChange={onChange}
        path="quotes"
        issues={[]}
        depth={0}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(onChange).toHaveBeenLastCalledWith([
      { author: "A" },
      { author: "" },
    ]); // plain array out

    onChange.mockClear();
    rerender(
      <FieldControl
        name="quotes"
        field={field}
        value={[{ author: "A" }, { author: "B" }]}
        onChange={onChange}
        path="quotes"
        issues={[]}
        depth={0}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /move down/i })[0]!);
    expect(onChange).toHaveBeenLastCalledWith([
      { author: "B" },
      { author: "A" },
    ]);
  });

  it("keeps stable React keys across reorder (no key={index})", () => {
    // Render, edit item 0, reorder; the edited item's DOM identity should follow the item, not the index.
    // Assert by data-testid carrying the transient id: item order changes but ids persist.
    const onChange = vi.fn();
    render(
      <FieldControl
        name="quotes"
        field={field}
        value={[{ author: "A" }, { author: "B" }]}
        onChange={onChange}
        path="quotes"
        issues={[]}
        depth={0}
      />,
    );
    const rowsBefore = screen
      .getAllByTestId(/array-item-/)
      .map((el) => el.getAttribute("data-testid"));
    expect(rowsBefore.length).toBe(2);
    fireEvent.click(screen.getAllByRole("button", { name: /move down/i })[0]!);
    // The control's OWN reorder must not regenerate ids: same two ids, just swapped order.
    const rowsAfter = screen
      .getAllByTestId(/array-item-/)
      .map((el) => el.getAttribute("data-testid"));
    expect(new Set(rowsAfter)).toEqual(new Set(rowsBefore));
    expect(rowsAfter).toEqual([rowsBefore[1], rowsBefore[0]]);
  });

  it("reinitializes the working list when a fresh differing value prop arrives externally", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FieldControl
        name="quotes"
        field={field}
        value={[{ author: "A" }, { author: "B" }]}
        onChange={onChange}
        path="quotes"
        issues={[]}
        depth={0}
      />,
    );
    const idsBefore = screen
      .getAllByTestId(/array-item-/)
      .map((el) => el.getAttribute("data-testid"));
    expect(idsBefore.length).toBe(2);

    // A genuinely external value (different length, not something WE emitted) arrives.
    rerender(
      <FieldControl
        name="quotes"
        field={field}
        value={[{ author: "A" }, { author: "B" }, { author: "C" }]}
        onChange={onChange}
        path="quotes"
        issues={[]}
        depth={0}
      />,
    );
    const idsAfter = screen
      .getAllByTestId(/array-item-/)
      .map((el) => el.getAttribute("data-testid"));
    expect(idsAfter.length).toBe(3);
  });
});

describe("array Add depth guard", () => {
  it("does not throw / no-ops Add at max depth", () => {
    // A field whose array sits at MAX depth: Add must not throw (matches the render-side cap message).
    // Construct depth so that adding would call defaultForField(of, depth+1) beyond MAX_FIELD_DEPTH.
    const onChange = vi.fn();
    const field = f.array(f.text());
    render(
      <FieldControl
        name="a"
        field={field}
        value={[]}
        onChange={onChange}
        path="a"
        issues={[]}
        depth={5}
      />,
    );
    // At depth 5, Add would seed at depth 6 (> MAX 5): it must be disabled or a no-op, not a throw.
    const add = screen.getByRole("button", {
      name: /add/i,
    }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.click(add); // must not throw
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("placeholders + validation + depth", () => {
  it("renders a disabled placeholder for image", () => {
    renderControl(f.image(), "x");
    expect((screen.getByLabelText("fld") as HTMLInputElement).disabled).toBe(
      true,
    );
  });

  it("renders a live TipTap editor for richText (not the disabled placeholder)", () => {
    renderControl(f.richText(), "<p>x</p>");
    expect(document.querySelector('[contenteditable="true"]')).not.toBeNull();
    expect(screen.queryByRole("textbox", { name: "fld" })).not.toBeNull();
  });

  it("shows the issue whose path matches this control", () => {
    render(
      <FieldControl
        name="heading"
        field={f.text()}
        value=""
        onChange={vi.fn()}
        path="heading"
        issues={[{ path: "heading", message: "is required" }]}
        depth={0}
      />,
    );
    expect(screen.getByText("is required")).toBeTruthy();
  });

  it("renders a depth-cap message beyond MAX_FIELD_DEPTH instead of recursing", () => {
    render(
      <FieldControl
        name="x"
        field={f.text()}
        value=""
        onChange={vi.fn()}
        path="x"
        issues={[]}
        depth={6}
      />,
    );
    expect(screen.getByText(/too deep/i)).toBeTruthy();
  });
});
