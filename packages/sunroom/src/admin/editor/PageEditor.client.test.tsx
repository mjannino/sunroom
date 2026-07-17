// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Page } from "../../store/types.js";
import { PageEditor } from "./PageEditor.js";
import type {
  ActionResult,
  EditorActions,
  SerializedRegistry,
} from "./types.js";

const registry: SerializedRegistry = {
  hero: {
    label: "Hero",
    fields: { heading: { type: "text" }, body: { type: "richText" } },
  },
};
const page: Page = {
  slug: "about",
  title: "About",
  position: 1,
  seo: {},
  sections: [
    { id: "s1", type: "hero", props: { heading: "Hi", body: "<p>x</p>" } },
  ],
};
function actionsMock(over: Partial<EditorActions> = {}): EditorActions {
  return {
    savePage: vi.fn(async (): Promise<ActionResult> => ({
      ok: true,
      version: "v2",
    })),
    createPage: vi.fn(async (): Promise<ActionResult> => ({ ok: true })),
    deletePage: vi.fn(async (): Promise<ActionResult> => ({ ok: true })),
    reorderPages: vi.fn(async (): Promise<ActionResult> => ({ ok: true })),
    ...over,
  };
}

describe("PageEditor", () => {
  it("Save is disabled until an edit is made", () => {
    render(
      <PageEditor
        page={page}
        version="v1"
        registry={registry}
        actions={actionsMock()}
      />,
    );
    expect(
      (screen.getByRole("button", { name: /save/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("edits a text field and saves the whole page with the base version", async () => {
    const actions = actionsMock();
    render(
      <PageEditor
        page={page}
        version="v1"
        registry={registry}
        actions={actions}
      />,
    );
    fireEvent.click(screen.getByText(/Hero/)); // select the section
    fireEvent.change(screen.getByLabelText("heading"), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(actions.savePage).toHaveBeenCalledTimes(1);
      const [savedPage, baseVersion] = (
        actions.savePage as ReturnType<typeof vi.fn>
      ).mock.calls[0]!;
      expect(baseVersion).toBe("v1");
      expect(savedPage.sections[0].props.heading).toBe("Hello");
      expect(savedPage.sections[0].props.body).toBe("<p>x</p>"); // non-text field preserved untouched
    });
  });

  it("renders a disabled placeholder for non-text fields", () => {
    render(
      <PageEditor
        page={page}
        version="v1"
        registry={registry}
        actions={actionsMock()}
      />,
    );
    fireEvent.click(screen.getByText(/Hero/));
    const body = screen.getByLabelText("body") as HTMLInputElement;
    expect(body.disabled).toBe(true);
  });

  it("refreshes baseVersion after a successful save so a second save uses it", async () => {
    const savePage = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, version: "v2" } satisfies ActionResult)
      .mockResolvedValueOnce({
        ok: true,
        version: "v3",
      } satisfies ActionResult);
    const actions = actionsMock({ savePage });
    render(
      <PageEditor
        page={page}
        version="v1"
        registry={registry}
        actions={actions}
      />,
    );
    fireEvent.click(screen.getByText(/Hero/));

    fireEvent.change(screen.getByLabelText("heading"), {
      target: { value: "First edit" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(savePage).toHaveBeenCalledTimes(1));
    expect(savePage.mock.calls[0]![1]).toBe("v1");

    fireEvent.change(screen.getByLabelText("heading"), {
      target: { value: "Second edit" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(savePage).toHaveBeenCalledTimes(2));
    expect(savePage.mock.calls[1]![1]).toBe("v2");
  });

  it("shows a conflict message when save returns a conflict", async () => {
    const actions = actionsMock({
      savePage: vi.fn(async (): Promise<ActionResult> => ({
        ok: false,
        reason: "conflict",
        message: "changed elsewhere",
      })),
    });
    render(
      <PageEditor
        page={page}
        version="v1"
        registry={registry}
        actions={actions}
      />,
    );
    fireEvent.click(screen.getByText(/Hero/));
    fireEvent.change(screen.getByLabelText("heading"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(screen.getByText(/changed elsewhere/)).toBeTruthy(),
    );
  });
});

describe("validation gating", () => {
  const registryReq: SerializedRegistry = {
    hero: {
      label: "Hero",
      fields: { heading: { type: "text", required: true } },
    },
  };
  function pageWith(headingValue: string): Page {
    return {
      slug: "p",
      title: "P",
      position: 1,
      seo: {},
      sections: [{ id: "s1", type: "hero", props: { heading: headingValue } }],
    };
  }

  it("disables Save while dirty and invalid, and re-enables it once the required field is filled", () => {
    // Start VALID so the page is not dirty and Save is disabled by !dirty alone.
    render(
      <PageEditor
        page={pageWith("Hi")}
        version="v1"
        registry={registryReq}
        actions={actionsMock()}
      />,
    );
    fireEvent.click(screen.getByText(/Hero/));
    expect(
      (screen.getByRole("button", { name: /save/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    // Emptying the required field both dirties the page AND makes it invalid.
    // If Save were still disabled only, this assertion proves anyInvalid is doing the work,
    // since dirty is now true.
    fireEvent.change(screen.getByLabelText("heading"), {
      target: { value: "" },
    });
    expect(
      (screen.getByRole("button", { name: /save/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getAllByText("is required").length).toBeGreaterThan(0);

    // Fixing the field keeps the page dirty but clears the invalidity -> Save enables.
    fireEvent.change(screen.getByLabelText("heading"), {
      target: { value: "Hi again" },
    });
    expect(
      (screen.getByRole("button", { name: /save/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("disables Save while dirty when the page title is emptied", () => {
    // Start with a fully valid page so Save is disabled only by !dirty initially.
    render(
      <PageEditor
        page={pageWith("Hi")}
        version="v1"
        registry={registryReq}
        actions={actionsMock()}
      />,
    );
    expect(
      (screen.getByRole("button", { name: /save/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    // Emptying the title both dirties the page AND makes titleEmpty true.
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "" } });
    expect(
      (screen.getByRole("button", { name: /save/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("marks an invalid section in the rail", () => {
    render(
      <PageEditor
        page={pageWith("")}
        version="v1"
        registry={registryReq}
        actions={actionsMock()}
      />,
    );
    expect(screen.getByLabelText(/has errors/i)).toBeTruthy();
  });
});
