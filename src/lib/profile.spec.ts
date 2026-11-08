import { describe, expect, test } from "bun:test";
import type { ProfileFormValues } from "./profile";
import {
  RPPS_DIGITS,
  RPPS_ERROR_MESSAGE,
  RPPS_PATTERN,
  RPPS_PATTERN_SOURCE,
  validateProfileForm,
} from "./profile";

const valid = {
  specialty: "GENERALIST",
  profileType: "REPLACEMENT",
  rppsNumber: "12345678901",
  city: "",
  isPublic: true,
} satisfies ProfileFormValues;

describe("RPPS", () => {
  test("the input's pattern source is the digits rule, not a literal letter", () => {
    // `pattern="d{11}"` matches the letter `d` eleven times: a real number is
    // then rejected by the browser's own validation, before any French message.
    expect(RPPS_PATTERN_SOURCE).toBe(`\\d{${RPPS_DIGITS}}`);
    expect(new RegExp(`^(?:${RPPS_PATTERN_SOURCE})$`).test("12345678901")).toBe(
      true,
    );
    expect(new RegExp(`^(?:${RPPS_PATTERN_SOURCE})$`).test("dddd")).toBe(false);
  });

  test("accepts eleven digits and refuses anything else", () => {
    expect(RPPS_PATTERN.test("12345678901")).toBe(true);
    for (const bad of ["dddd", "1234567890", "123456789012", "123 456 78901"]) {
      expect(RPPS_PATTERN.test(bad), bad).toBe(false);
    }
  });
});

describe("validateProfileForm", () => {
  test("keeps a well-formed number in the payload", () => {
    const result = validateProfileForm(valid);
    expect(result.error).toBeUndefined();
    expect(result.payload?.rppsNumber).toBe("12345678901");
  });

  test("answers a wrong number with the one French sentence", () => {
    expect(validateProfileForm({ ...valid, rppsNumber: "dddd" }).error).toBe(
      RPPS_ERROR_MESSAGE,
    );
  });

  test("leaves the number out when the field is left blank", () => {
    const result = validateProfileForm({ ...valid, rppsNumber: "  " });
    expect(result.error).toBeUndefined();
    expect(result.payload?.rppsNumber).toBeUndefined();
  });
});
