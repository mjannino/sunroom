import { describe, expect, it } from "vitest";
import * as sunroom from "./index.js";

describe("public exports", () => {
  it("exports the authoring API", () => {
    expect(typeof sunroom.createSunroom).toBe("function");
    expect(typeof sunroom.defineSection).toBe("function");
    expect(typeof sunroom.f.text).toBe("function");
  });

  it("exports the store and its errors for advanced use", () => {
    expect(typeof sunroom.GitStore).toBe("function");
    expect(typeof sunroom.validateProps).toBe("function");
    expect(sunroom.ConflictError.prototype).toBeInstanceOf(Error);
    expect(sunroom.NotFoundError.prototype).toBeInstanceOf(Error);
    expect(sunroom.ValidationError.prototype).toBeInstanceOf(Error);
  });

  it("exports a version string", () => {
    expect(typeof sunroom.VERSION).toBe("string");
  });

  it("exposes the admin surface", async () => {
    const sunroom = await import("./index.js");
    const instance = sunroom.createSunroom({
      contentDir: "/tmp/unused-admin",
      sections: {},
    });
    expect(typeof instance.handlers.GET).toBe("function");
    expect(typeof instance.handlers.POST).toBe("function");
    expect(typeof instance.AdminLayout).toBe("function");
    expect(typeof instance.AdminPage).toBe("function");
  });
});
