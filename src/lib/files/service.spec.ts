import { describe, expect, it } from "bun:test";
import { type ApiTransport, ApiError } from "../api-client";
import {
  attachCvToApplication,
  fetchListingImages,
  fetchMyFiles,
  fileErrorMessage,
  fileUrl,
  removeFile,
  uploadAvatar,
  uploadListingImages,
  uploadProfileCv,
} from "./index";

interface Call {
  path: string;
  init?: RequestInit;
}

function recording(response: unknown = []): {
  calls: Call[];
  transport: ApiTransport;
} {
  const calls: Call[] = [];
  return {
    calls,
    transport: (path, init) => {
      calls.push({ path, init });
      return Promise.resolve(
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    },
  };
}

const png = () => new File(["png"], "photo.png", { type: "image/png" });

describe("file service", () => {
  it("reads the caller's files and a listing's photos", async () => {
    const mine = recording();
    await fetchMyFiles(mine.transport);
    expect(mine.calls[0]?.path).toBe("/files/mine");

    const photos = recording();
    await fetchListingImages("listing 1", photos.transport);
    expect(photos.calls[0]?.path).toBe(
      "/files/listings/listing%201/images",
    );
  });

  it("posts uploads as FormData without a JSON Content-Type", async () => {
    const calls: Call[] = [];
    const transport: ApiTransport = (path, init) => {
      calls.push({ path, init });
      return Promise.resolve(
        new Response(JSON.stringify({ id: "f1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    };

    await uploadAvatar(png(), transport);
    await uploadProfileCv(
      new File(["pdf"], "cv.pdf", { type: "application/pdf" }),
      transport,
    );
    await uploadListingImages("l1", [png(), png()], transport);

    expect(calls.map((call) => call.path)).toEqual([
      "/files/avatar",
      "/files/cv",
      "/files/listings/l1/images",
    ]);
    for (const call of calls) {
      expect(call.init?.method).toBe("POST");
      expect(call.init?.body).toBeInstanceOf(FormData);
      const headers = new Headers(call.init?.headers);
      expect(headers.has("content-type")).toBe(false);
    }
    const listingBody = calls[2]?.init?.body as FormData;
    expect(listingBody.getAll("images")).toHaveLength(2);
  });

  it("attaches and removes files through the documented paths", async () => {
    const calls: Call[] = [];
    const transport: ApiTransport = (path, init) => {
      calls.push({ path, init });
      return Promise.resolve(new Response(null, { status: 204 }));
    };

    await attachCvToApplication("a1", transport);
    await removeFile("f/1", transport);

    expect(calls[0]?.path).toBe("/applications/a1/cv");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[1]?.path).toBe("/files/f%2F1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  });

  it("builds same-origin stream URLs", () => {
    expect(fileUrl("a1")).toBe("/api/files/a1");
  });

  it("gives a specific sentence to an oversized file", () => {
    expect(fileErrorMessage(new ApiError(413, "/files/avatar"))).toContain(
      "trop volumineux",
    );
  });
});
