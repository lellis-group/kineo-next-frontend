import { describe, expect, test } from "bun:test";
import {
  LIST_MESSAGE_PREVIEW_CHARS,
  slimForTarget,
  slimListPayload,
  slimMineApplication,
  slimMineListing,
  truncatePreview,
} from "./list-slimming";

interface SlimRow {
  id?: string;
  title?: string;
  description?: unknown;
  message?: string;
  listing?: {
    description?: unknown;
    practice?: Record<string, unknown>;
  };
}

describe("truncatePreview", () => {
  test("trims a message that already fits", () => {
    expect(truncatePreview("  Bonjour  ")).toBe("Bonjour");
  });

  test("cuts at a word boundary and marks the cut", () => {
    const preview = truncatePreview("mot ".repeat(120));

    expect(preview.length).toBeLessThanOrEqual(LIST_MESSAGE_PREVIEW_CHARS + 1);
    expect(preview.endsWith("…")).toBe(true);
    expect(preview).not.toContain("motmot");
  });
});

describe("slimMineApplication", () => {
  test("drops the fields the list card never renders", () => {
    const row = {
      id: "app-1",
      message: "x".repeat(500),
      listing: {
        id: "listing-1",
        description: "the detail page's long text",
        practice: {
          id: "practice-1",
          name: "Cabinet",
          city: "Lyon",
          address: "1 rue de la Paix",
          latitude: 45.76,
          longitude: 4.83,
        },
      },
    };

    const slim = slimMineApplication(row) as SlimRow;

    expect(slim.id).toBe("app-1");
    expect(slim.listing?.description).toBeUndefined();
    expect(slim.listing?.practice).toEqual({
      id: "practice-1",
      name: "Cabinet",
      city: "Lyon",
    });
    expect(slim.message?.endsWith("…")).toBe(true);
  });

  test("leaves a row without a listing or a message alone", () => {
    const row = { id: "app-2" };

    expect(slimMineApplication(row)).toEqual(row);
  });
});

describe("slimMineListing", () => {
  test("drops only the description", () => {
    const row = { id: "listing-1", title: "Remplacement", description: "x" };

    expect(slimMineListing(row) as SlimRow).toEqual({
      id: "listing-1",
      title: "Remplacement",
    });
  });
});

describe("slimForTarget", () => {
  test("slims only the two heavy list reads", () => {
    expect(slimForTarget("/applications/mine")).toBe(slimMineApplication);
    expect(slimForTarget("/replacement-listings/mine")).toBe(slimMineListing);
    expect(slimForTarget("/applications/mine/1")).toBeNull();
    expect(slimForTarget("/replacement-listings")).toBeNull();
  });
});

describe("slimListPayload", () => {
  test("keeps a bare array a bare array", () => {
    const rows = [{ id: "1", description: "x" }];

    expect(slimListPayload(rows, slimMineListing)).toEqual([{ id: "1" }]);
  });

  test("keeps the envelope and its meta", () => {
    const envelope = {
      data: [{ id: "1", description: "x" }],
      meta: { total: 1, page: 1 },
    };

    expect(slimListPayload(envelope, slimMineListing)).toEqual({
      data: [{ id: "1" }],
      meta: { total: 1, page: 1 },
    });
  });

  test("returns null for a shape it does not recognise", () => {
    expect(slimListPayload({ items: [] }, slimMineListing)).toBeNull();
    expect(slimListPayload(null, slimMineListing)).toBeNull();
    expect(slimListPayload("nope", slimMineListing)).toBeNull();
  });
});
