// @vitest-environment jsdom
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Page } from "../../store/types.js";
import { PageEditor } from "./PageEditor.js";
import type {
  ActionResult,
  EditorActions,
  MediaActions,
  MediaResult,
  SerializedRegistry,
} from "./types.js";

// The "hero" registry below includes an `image` field, so the fields tree
// renders an <ImagePicker>, backed by the <MediaProvider> that PageEditor
// wraps its tree in. This helper stands in for the real media actions
// (server actions in production) so these tests can render the fields tree.
function mediaActions(over: Partial<MediaActions> = {}): MediaActions {
  return {
    // `as const` keeps `ok` a literal `true` (not widened to `boolean`) so
    // these structurally satisfy `MediaResult<T>`, which requires `ok: true`.
    requestUpload: vi.fn(
      async () =>
        ({
          ok: true,
          uploadUrl: "https://put",
          storageKey: "uploads/x.jpg",
        }) as const,
    ),
    commitMedia: vi.fn(
      async () =>
        ({
          ok: true,
          id: "new",
          url: "https://cdn/new.png",
        }) as const,
    ),
    // `{ ok: true }` alone doesn't structurally satisfy `{ ok: true } &
    // Record<string, never>` (the `ok` property gets checked against the
    // index signature too); the cast is safe since there is no payload here
    // (see actions.ts's deleteMediaAction for the same pattern).
    deleteMedia: vi.fn(
      async () => ({ ok: true }) as MediaResult<Record<string, never>>,
    ),
    ...over,
  };
}

const registry: SerializedRegistry = {
  hero: {
    label: "Hero",
    fields: {
      heading: { type: "text" },
      body: { type: "richText" },
      img: { type: "image" },
    },
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

describe("PageEditor", () => {
  it("Save is disabled until an edit is made", () => {
    render(
      <PageEditor
        page={page}
        version="v1"
        registry={registry}
        actions={actionsMock()}
        media={[]}
        mediaActions={mediaActions()}
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
        media={[]}
        mediaActions={mediaActions()}
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

  it("renders an image picker for image fields (Choose image when unset)", () => {
    render(
      <PageEditor
        page={page}
        version="v1"
        registry={registry}
        actions={actionsMock()}
        media={[]}
        mediaActions={mediaActions()}
      />,
    );
    fireEvent.click(screen.getByText(/Hero/));
    expect(screen.getByRole("button", { name: /choose image/i })).toBeTruthy();
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
        media={[]}
        mediaActions={mediaActions()}
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
        media={[]}
        mediaActions={mediaActions()}
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
  it("disables Save while dirty and invalid, and re-enables it once the required field is filled", () => {
    // Start VALID so the page is not dirty and Save is disabled by !dirty alone.
    render(
      <PageEditor
        page={pageWith("Hi")}
        version="v1"
        registry={registryReq}
        actions={actionsMock()}
        media={[]}
        mediaActions={mediaActions()}
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
        media={[]}
        mediaActions={mediaActions()}
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
        media={[]}
        mediaActions={mediaActions()}
      />,
    );
    expect(screen.getByLabelText(/has errors/i)).toBeTruthy();
  });
});

describe("section switching (content-corruption regression)", () => {
  const registryRichText: SerializedRegistry = {
    hero: { label: "Hero", fields: { body: { type: "richText" } } },
  };
  const twoRichTextSectionsPage: Page = {
    slug: "about",
    title: "About",
    position: 1,
    seo: {},
    sections: [
      { id: "s1", type: "hero", props: { body: "<p>Alpha</p>" } },
      { id: "s2", type: "hero", props: { body: "<p>Bravo</p>" } },
    ],
  };

  it("shows each section's own richText content when switching selection, not the previously selected section's", async () => {
    render(
      <PageEditor
        page={twoRichTextSectionsPage}
        version="v1"
        registry={registryRichText}
        actions={actionsMock()}
        media={[]}
        mediaActions={mediaActions()}
      />,
    );
    const rows = screen.getAllByRole("listitem");

    fireEvent.click(within(rows[0]!).getByRole("button", { name: "Hero" }));
    await waitFor(() => expect(document.body.textContent).toContain("Alpha"));

    fireEvent.click(within(rows[1]!).getByRole("button", { name: "Hero" }));
    await waitFor(() => {
      expect(document.body.textContent).toContain("Bravo");
      expect(document.body.textContent).not.toContain("Alpha");
    });
  });
});

describe("section reorder rail", () => {
  const registryTwo: SerializedRegistry = {
    hero: { label: "Hero", fields: { heading: { type: "text" } } },
    testimonial: {
      label: "Testimonial",
      fields: { heading: { type: "text" } },
    },
  };
  const twoSectionPage: Page = {
    slug: "about",
    title: "About",
    position: 1,
    seo: {},
    sections: [
      { id: "s1", type: "hero", props: { heading: "H" } },
      { id: "s2", type: "testimonial", props: { heading: "T" } },
    ],
  };

  it("renders the rail inside a sortable container", () => {
    const { container } = render(
      <PageEditor
        page={twoSectionPage}
        version="v1"
        registry={registryTwo}
        actions={actionsMock()}
        media={[]}
        mediaActions={mediaActions()}
      />,
    );
    expect(container.querySelector("[data-sortable-list]")).toBeTruthy();
  });

  it("still reorders sections via the up/down buttons", () => {
    render(
      <PageEditor
        page={twoSectionPage}
        version="v1"
        registry={registryTwo}
        actions={actionsMock()}
        media={[]}
        mediaActions={mediaActions()}
      />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("Hero"),
      expect.stringContaining("Testimonial"),
    ]);

    fireEvent.click(within(rows[0]!).getByRole("button", { name: "↓" }));

    const reordered = screen.getAllByRole("listitem");
    expect(reordered[0]!.textContent).toContain("Testimonial");
    expect(reordered[1]!.textContent).toContain("Hero");
  });
});

describe("preview + cleanups", () => {
  it("toggles a preview iframe pointing at the page route", () => {
    render(
      <PageEditor
        page={pageWith("Hi")}
        version="v1"
        registry={registryReq}
        actions={actionsMock()}
        media={[]}
        mediaActions={mediaActions()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute("src")).toContain("/p"); // slug 'p'
  });

  it('shows a "Title is required" cue when the title is empty', () => {
    render(
      <PageEditor
        page={{ ...pageWith("Hi"), title: "" }}
        version="v1"
        registry={registryReq}
        actions={actionsMock()}
        media={[]}
        mediaActions={mediaActions()}
      />,
    );
    expect(screen.getByText(/title is required/i)).toBeTruthy();
  });
});
