import { describe, expect, test } from "bun:test";
import { applicationProgress } from "./progress";

const base = {
  status: "PENDING" as const,
  createdAt: "2026-09-15T08:00:00.000Z",
  viewed: false,
  viewedAt: undefined,
  respondedAt: undefined,
  rejectionBucket: null,
};

const states = (steps: ReturnType<typeof applicationProgress>) =>
  steps.map((step) => step.state);

describe("applicationProgress", () => {
  test("a fresh application waits on the practice to open it", () => {
    const steps = applicationProgress(base);

    expect(states(steps)).toEqual(["done", "current", "pending"]);
    expect(steps[0]?.date).toBe("15 sept.");
    expect(steps[1]?.label).toBe("Pas encore lue");
  });

  test("once viewed, it waits on the decision", () => {
    const steps = applicationProgress({
      ...base,
      viewed: true,
      viewedAt: "2026-09-16T08:00:00.000Z",
    });

    expect(states(steps)).toEqual(["done", "done", "current"]);
    expect(steps[1]?.date).toBe("16 sept.");
  });

  test("a shortlisted application shows it on the last step", () => {
    const [, , decision] = applicationProgress({
      ...base,
      status: "SHORTLISTED",
      viewed: true,
    });

    expect(decision).toMatchObject({
      label: "Présélectionnée",
      state: "current",
      tone: "info",
    });
  });

  test("an acceptance closes the track in success, dated", () => {
    const [, , decision] = applicationProgress({
      ...base,
      status: "ACCEPTED",
      viewed: true,
      respondedAt: "2026-09-20T08:00:00.000Z",
    });

    expect(decision).toMatchObject({
      label: "Acceptée",
      state: "done",
      tone: "success",
      date: "20 sept.",
    });
  });

  test("names a rejection by its situation", () => {
    const [, , decision] = applicationProgress({
      ...base,
      status: "REJECTED",
      rejectionBucket: "PASSED_OVER",
    });

    expect(decision?.label).toBe("Poste pourvu");
    expect(decision?.tone).toBe("danger");
  });

  test("never ticks « Consultée » the row doesn't record", () => {
    const steps = applicationProgress({ ...base, status: "WITHDRAWN" });

    expect(states(steps)).toEqual(["done", "skipped", "done"]);
    expect(steps[2]).toMatchObject({ label: "Retirée", tone: "neutral" });
  });
});
