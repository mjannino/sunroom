// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  shouldStartRowDrag,
  SortableList,
  SortableRow,
  startsFromInteractiveTarget,
} from "./Sortable.js";

describe("SortableRow", () => {
  it("makes the whole row a drag handle (aria-label per row)", () => {
    render(
      <SortableList ids={["a", "b"]} onReorder={vi.fn()}>
        {["a", "b"].map((id) => (
          <SortableRow key={id} id={id} label={`Row ${id}`}>
            <span>{id}</span>
          </SortableRow>
        ))}
      </SortableList>,
    );
    expect(screen.getAllByLabelText(/drag/i).length).toBe(2);
  });

  it("keeps inner buttons clickable (buttons are not the drag activator)", () => {
    const onClick = vi.fn();
    render(
      <SortableList ids={["a"]} onReorder={vi.fn()}>
        <SortableRow id="a" label="Row A">
          <button onClick={onClick}>act</button>
        </SortableRow>
      </SortableList>,
    );
    fireEvent.click(screen.getByText("act"));
    expect(onClick).toHaveBeenCalled();
  });
});

describe("startsFromInteractiveTarget", () => {
  it.each(["input", "button", "textarea", "select", "a"])(
    "returns true for a %s element",
    (tag) => {
      const el = document.createElement(tag);
      document.body.appendChild(el);
      expect(startsFromInteractiveTarget(el)).toBe(true);
      el.remove();
    },
  );

  it("returns true for a descendant of an interactive element", () => {
    const button = document.createElement("button");
    const span = document.createElement("span");
    button.appendChild(span);
    document.body.appendChild(button);
    expect(startsFromInteractiveTarget(span)).toBe(true);
    button.remove();
  });

  it("returns false for a plain div", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    expect(startsFromInteractiveTarget(el)).toBe(false);
    el.remove();
  });

  it("returns false for null", () => {
    expect(startsFromInteractiveTarget(null)).toBe(false);
  });
});

describe("shouldStartRowDrag", () => {
  // PointerEvent isn't fully implemented in jsdom, so we pass a minimal
  // plain object cast to the type.
  const ev = (over: Partial<PointerEvent>) =>
    ({
      isPrimary: true,
      button: 0,
      target: document.createElement("div"),
      ...over,
    }) as unknown as PointerEvent;

  it("returns true for a primary left-button press on a div", () => {
    expect(shouldStartRowDrag(ev({}))).toBe(true);
  });

  it("returns false for a right-click", () => {
    expect(shouldStartRowDrag(ev({ button: 2 }))).toBe(false);
  });

  it("returns false for a non-primary pointer", () => {
    expect(shouldStartRowDrag(ev({ isPrimary: false }))).toBe(false);
  });

  it("returns false for an interactive target", () => {
    expect(
      shouldStartRowDrag(ev({ target: document.createElement("input") })),
    ).toBe(false);
  });
});
