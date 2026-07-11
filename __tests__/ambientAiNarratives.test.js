const {
  buildIntentSourceLabel,
  buildAmbientSearchBanner,
  buildAmbientUnderstandingLine,
  buildVisualCueHeading,
  buildVisualMatchesHeading,
} = require("../src/utils/ambientAiNarratives");

describe("ambientAiNarratives", () => {
  it("labels llm intent as AI reasoning", () => {
    expect(buildIntentSourceLabel("llm")).toBe("AI reasoning");
  });

  it("builds a refined-from-intent banner for smart search", () => {
    expect(
      buildAmbientSearchBanner({
        mode: "smart",
        query: "wireless headphones below 100",
        matchCount: 7,
        source: "llm",
      })
    ).toEqual({
      title: "Refined from your intent",
      message:
        'Showing 7 matches for "wireless headphones below 100" using AI reasoning.',
    });
  });

  it("builds a visual similarity banner for photo matches", () => {
    expect(
      buildAmbientSearchBanner({
        mode: "photo",
        query: "blue rain jacket",
        matchCount: 8,
      })
    ).toEqual({
      title: "Matched for visual similarity",
      message:
        'Showing 8 catalog options based on the photo\'s shape, material, and closest product cues. Refined as "blue rain jacket".',
    });
  });

  it("builds a fallback banner when photo search converts into text search", () => {
    expect(
      buildAmbientSearchBanner({
        mode: "photo-fallback",
        query: "blue rain jacket",
      })
    ).toEqual({
      title: "Converted photo cues into search",
      message:
        'No close visual match yet, so ShopEase searched for "blue rain jacket" instead.',
    });
  });

  it("formats the voice-card understanding line in the same tone", () => {
    expect(
      buildAmbientUnderstandingLine({
        summary: "women · shoes · under $50",
        source: "llm",
      })
    ).toBe("Refined for women · shoes · under $50 · AI reasoning");
  });

  it("uses consistent visual discovery headings", () => {
    expect(buildVisualCueHeading(true)).toBe("Matched for style and closest catalog fit");
    expect(buildVisualCueHeading(false)).toBe("Detected visual cues");
    expect(buildVisualMatchesHeading()).toBe("Closest catalog matches");
  });
});
