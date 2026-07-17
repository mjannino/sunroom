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

    onChange.mockClear();
    rerender(
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
    fireEvent.click(screen.getAllByRole("button", { name: /remove/i })[0]!);
    expect(onChange).toHaveBeenLastCalledWith([{ author: "B" }]);
  });
});

describe("placeholders + validation + depth", () => {
  it("renders a disabled placeholder for richText and image", () => {
    renderControl(f.richText(), "x");
    expect((screen.getByLabelText("fld") as HTMLInputElement).disabled).toBe(
      true,
    );
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
