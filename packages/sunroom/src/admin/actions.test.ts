import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...a: unknown[]) => revalidatePath(...a),
}));

const getSession = vi.fn();
vi.mock("./session-server.js", () => ({ getSession: () => getSession() }));

const createPresignedUpload = vi.fn();
const deleteObject = vi.fn();
vi.mock("./media/r2.js", () => ({
  createPresignedUpload: (...a: unknown[]) => createPresignedUpload(...a),
  deleteObject: (...a: unknown[]) => deleteObject(...a),
}));

import { resetStores } from "../store/singleton.js";
import {
  commitMediaAction,
  createPageAction,
  deleteMediaAction,
  deletePageAction,
  reorderPagesAction,
  requestUploadAction,
  savePageAction,
} from "./actions.js";

let dir: string;
const SIGNED_IN = { email: "jane@acme.com", name: "Jane" };

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "sunroom-actions-"));
  process.env.SUNROOM_CONTENT_DIR = dir;
  resetStores();
  revalidatePath.mockClear();
  getSession.mockResolvedValue(SIGNED_IN);
  createPresignedUpload.mockReset();
  deleteObject.mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
  resetStores();
  delete process.env.SUNROOM_CONTENT_DIR;
  await rm(dir, { recursive: true, force: true });
});

describe("auth gate", () => {
  it("performs NO write when unauthenticated", async () => {
    getSession.mockResolvedValue(null);
    const res = await createPageAction({ slug: "about", title: "About" });
    expect(res).toEqual({
      ok: false,
      reason: "unauthorized",
      message: expect.any(String),
    });
    // prove no write: a fresh authed read shows the page was never created
    getSession.mockResolvedValue(SIGNED_IN);
    const list = await reorderPagesAction([]); // cheap authed call to force store init
    expect(list.ok).toBe(true);
    // the store has only the home page
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    expect(store.listPages().map((p) => p.slug)).toEqual([""]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("createPageAction", () => {
  it("creates a page, revalidates the nav and the new route, authored by the editor", async () => {
    const res = await createPageAction({ slug: "about", title: "About" });
    expect(res.ok).toBe(true);
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    expect(store.getPage("about")?.page.title).toBe("About");
    expect(revalidatePath).toHaveBeenCalledWith("/about");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects an invalid slug with a validation result and no write", async () => {
    const res = await createPageAction({ slug: "Bad Slug", title: "X" });
    expect(res).toMatchObject({ ok: false, reason: "validation" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a duplicate slug", async () => {
    await createPageAction({ slug: "about", title: "About" });
    const res = await createPageAction({ slug: "about", title: "Again" });
    expect(res).toMatchObject({ ok: false, reason: "conflict" });
  });
});

describe("savePageAction", () => {
  it("saves content and revalidates the route and the nav layout", async () => {
    await createPageAction({ slug: "about", title: "About" });
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    const entry = store.getPage("about")!;
    revalidatePath.mockClear();

    const edited = { ...entry.page, title: "About Us" };
    const res = await savePageAction(edited, entry.version);
    expect(res.ok).toBe(true);
    expect(store.getPage("about")?.page.title).toBe("About Us");
    expect(revalidatePath).toHaveBeenCalledWith("/about");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout"); // title is nav-visible
  });

  it("returns a conflict on a stale version", async () => {
    await createPageAction({ slug: "about", title: "About" });
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    const entry = store.getPage("about")!;
    await savePageAction({ ...entry.page, title: "First" }, entry.version);
    const res = await savePageAction(
      { ...entry.page, title: "Second" },
      entry.version,
    );
    expect(res).toMatchObject({ ok: false, reason: "conflict" });
  });

  it('revalidates "/" for the home page', async () => {
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    const home = store.getPage("")!;
    await savePageAction({ ...home.page, title: "Home!" }, home.version);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("deletePageAction", () => {
  it("deletes and revalidates", async () => {
    await createPageAction({ slug: "about", title: "About" });
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    revalidatePath.mockClear();
    const res = await deletePageAction("about");
    expect(res.ok).toBe(true);
    expect(store.getPage("about")).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("refuses to delete the home page (validation)", async () => {
    const res = await deletePageAction("");
    expect(res).toMatchObject({ ok: false, reason: "validation" });
  });
});

describe("reorderPagesAction", () => {
  it("reassigns positions by the given order", async () => {
    await createPageAction({ slug: "a", title: "A" });
    await createPageAction({ slug: "b", title: "B" });
    const res = await reorderPagesAction(["b", "a", ""]);
    expect(res.ok).toBe(true);
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    expect(store.listPages().map((p) => p.slug)).toEqual(["b", "a", ""]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("requestUploadAction", () => {
  it("mints a presigned URL when authed", async () => {
    createPresignedUpload.mockResolvedValue({
      uploadUrl: "https://put",
      storageKey: "uploads/x.jpg",
    });
    const res = await requestUploadAction("p.jpg", "image/jpeg");
    expect(res).toEqual({
      ok: true,
      uploadUrl: "https://put",
      storageKey: "uploads/x.jpg",
    });
  });
  it("mints NO URL when unauthenticated", async () => {
    getSession.mockResolvedValue(null);
    const res = await requestUploadAction("p.jpg", "image/jpeg");
    expect(res).toMatchObject({ ok: false, reason: "unauthorized" });
    expect(createPresignedUpload).not.toHaveBeenCalled();
  });
  it("rejects a non-raster-image mime (e.g. SVG) with NO presign", async () => {
    const res = await requestUploadAction("x.svg", "image/svg+xml");
    expect(res).toMatchObject({ ok: false, reason: "validation" });
    expect(createPresignedUpload).not.toHaveBeenCalled();
  });
  it("still mints a URL for an allowlisted raster mime", async () => {
    createPresignedUpload.mockResolvedValue({
      uploadUrl: "https://put",
      storageKey: "uploads/x.png",
    });
    const res = await requestUploadAction("x.png", "image/png");
    expect(res).toEqual({
      ok: true,
      uploadUrl: "https://put",
      storageKey: "uploads/x.png",
    });
  });
});

describe("commitMediaAction", () => {
  const input = {
    storageKey: "uploads/x.jpg",
    filename: "p.jpg",
    mime: "image/jpeg",
    width: 800,
    height: 600,
    size: 1,
    alt: "A",
  };
  it("writes a MediaRecord and returns its id + resolved public url", async () => {
    process.env.R2_PUBLIC_BASE = "https://cdn.example.com";
    const res = await commitMediaAction(input);
    expect(res).toMatchObject({
      ok: true,
      url: "https://cdn.example.com/uploads/x.jpg",
    });
    delete process.env.R2_PUBLIC_BASE;
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    const rec = store.listMedia()[0]!;
    expect(rec.storageKey).toBe("uploads/x.jpg");
    expect(rec.width).toBe(800);
    expect(rec.alt).toBe("A");
    expect(rec.id).toBeTruthy();
    expect(rec.createdAt).toBeTruthy();
  });
  it("writes NOTHING when unauthenticated", async () => {
    getSession.mockResolvedValue(null);
    const res = await commitMediaAction(input);
    expect(res).toMatchObject({ ok: false, reason: "unauthorized" });
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    expect(store.listMedia()).toEqual([]);
  });
});

describe("deleteMediaAction", () => {
  it("deletes the record and best-effort the blob", async () => {
    await commitMediaAction({
      storageKey: "uploads/x.jpg",
      filename: "p.jpg",
      mime: "image/jpeg",
      width: 1,
      height: 1,
      size: 1,
      alt: "",
    });
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    const id = store.listMedia()[0]!.id;
    const res = await deleteMediaAction(id);
    expect(res.ok).toBe(true);
    expect(store.listMedia()).toEqual([]);
    expect(deleteObject).toHaveBeenCalledWith("uploads/x.jpg");
  });

  it("deletes NOTHING when unauthenticated", async () => {
    await commitMediaAction({
      storageKey: "uploads/x.jpg",
      filename: "p.jpg",
      mime: "image/jpeg",
      width: 1,
      height: 1,
      size: 1,
      alt: "",
    });
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    const id = store.listMedia()[0]!.id;
    getSession.mockResolvedValue(null);
    const res = await deleteMediaAction(id);
    expect(res).toMatchObject({ ok: false, reason: "unauthorized" });
    expect(store.listMedia().map((m) => m.id)).toEqual([id]);
    expect(deleteObject).not.toHaveBeenCalled();
  });
});
