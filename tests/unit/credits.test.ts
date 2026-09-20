import { describe, expect, it } from "vitest";
import { estimateCredits } from "@/lib/credits";

describe("credit estimates", () => {
  it("charges expensive media more than lightweight analysis", () => {
    expect(estimateCredits("video")).toBeGreaterThan(estimateCredits("analysis"));
    expect(estimateCredits("image", 2)).toBe(36);
  });
});
