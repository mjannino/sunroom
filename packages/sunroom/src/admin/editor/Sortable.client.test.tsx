// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
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
