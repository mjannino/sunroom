// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SortableList, SortableRow } from "./Sortable.js";

describe("SortableList", () => {
  it("renders its rows and exposes a drag handle per row", () => {
    render(
      <SortableList ids={["a", "b"]} onReorder={vi.fn()}>
        {["a", "b"].map((id) => (
          <SortableRow key={id} id={id}>
            <span>{id}</span>
          </SortableRow>
        ))}
      </SortableList>,
    );
    expect(screen.getByText("a")).toBeTruthy();
    expect(screen.getAllByLabelText(/drag/i).length).toBe(2);
  });
});
