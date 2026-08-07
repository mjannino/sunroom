// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SortableList, SortableRow } from "./Sortable.js";

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
