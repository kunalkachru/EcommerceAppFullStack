import { buildVisualSearchOutcome } from "../src/utils/visualSearchMessages";

describe("buildVisualSearchOutcome", () => {
  it("describes found matches", () => {
    const out = buildVisualSearchOutcome({
      matches: [{ id: 1 }],
      identification: {
        summary: "a jacket or coat",
        probes: [{ label: "a jacket or coat", confidence: 0.85 }],
      },
      resultStatus: "found",
    });
    expect(out.status).toBe("found");
    expect(out.message).toContain("jacket");
  });

  it("explains identification when inventory has no match", () => {
    const out = buildVisualSearchOutcome({
      matches: [],
      identification: {
        summary: "a wristwatch",
        confidence: 0.41,
        probes: [{ label: "a wristwatch", confidence: 0.41 }],
      },
      resultStatus: "no_inventory_match",
      nearestMatch: { title: "Gold Petite Micropave", matchScore: 0.16 },
    });
    expect(out.status).toBe("no_inventory_match");
    expect(out.title).toContain("not in stock");
    expect(out.message).toContain("wristwatch");
    expect(out.message).toContain("don't have a close match");
    expect(out.message).toContain("Gold Petite Micropave");
  });

  it("handles unrecognized photos", () => {
    const out = buildVisualSearchOutcome({
      matches: [],
      resultStatus: "unrecognized",
      identification: { summary: "an item", probes: [] },
    });
    expect(out.status).toBe("unrecognized");
    expect(out.message).toContain("well-lit");
  });
});
