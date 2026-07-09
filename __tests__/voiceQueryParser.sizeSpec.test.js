const { parseVoiceQuery } = require("../server/src/voiceQueryParser");

describe("voiceQueryParser size and specification extraction", () => {
  it("extracts an apparel letter size", () => {
    const intent = parseVoiceQuery("brown trousers size XL");
    expect(intent.size).toBe("XL");
  });

  it("extracts a numeric waist size", () => {
    const intent = parseVoiceQuery("blue jeans size 32 waist");
    expect(intent.size).toBe("32");
  });

  it("extracts a specification keyword", () => {
    const intent = parseVoiceQuery("waterproof makeup under 15 dollars");
    expect(intent.specifications).toContain("waterproof");
  });

  it("extracts multiple specifications", () => {
    const intent = parseVoiceQuery("wireless bluetooth headphones");
    expect(intent.specifications).toEqual(expect.arrayContaining(["wireless", "bluetooth"]));
  });

  it("returns null size and empty specifications when none mentioned", () => {
    const intent = parseVoiceQuery("red lipstick");
    expect(intent.size).toBeNull();
    expect(intent.specifications).toEqual([]);
  });
});
