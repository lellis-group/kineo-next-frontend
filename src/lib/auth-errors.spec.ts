import { describe, expect, test } from "bun:test";
import { mapResetPasswordError } from "./auth-errors";
import { PASSWORD_LENGTH_MESSAGE } from "./auth-validation";

describe("mapResetPasswordError", () => {
  test("reads the token codes before the message", () => {
    expect(mapResetPasswordError({ code: "INVALID_TOKEN" })).toContain(
      "expiré",
    );
    expect(
      mapResetPasswordError({ message: "Invalid verification token" }),
    ).toContain("expiré");
  });

  test("maps password policy codes to the shared length copy", () => {
    for (const code of [
      "PASSWORD_TOO_SHORT_OR_LONG",
      "PASSWORD_TOO_SHORT",
      "PASSWORD_TOO_LONG",
      "INVALID_PASSWORD",
    ]) {
      expect(mapResetPasswordError({ code }), code).toBe(
        PASSWORD_LENGTH_MESSAGE,
      );
    }
  });

  test("no longer depends on a French sentence the backend never writes", () => {
    // The frontend's own copy, never sent by the backend.
    expect(mapResetPasswordError({ message: "8 ET 128 CARACTÈRES" })).not.toBe(
      PASSWORD_LENGTH_MESSAGE,
    );
  });

  test("falls back to the retry copy", () => {
    expect(mapResetPasswordError({})).toContain("réessayez");
  });
});
