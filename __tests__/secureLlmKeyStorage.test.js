const {
  getPersistedLlmKey,
  setPersistedLlmKey,
  deletePersistedLlmKey,
} = require("../src/utils/secureLlmKeyStorage");

describe("secureLlmKeyStorage", () => {
  it("returns an empty string when no key is stored", async () => {
    const key = await getPersistedLlmKey("user-1");
    expect(key).toBe("");
  });

  it("persists and retrieves a key scoped to a user id", async () => {
    await setPersistedLlmKey("sk-test-key", "user-1");
    const key = await getPersistedLlmKey("user-1");
    expect(key).toBe("sk-test-key");
  });

  it("scopes keys per user id so one user cannot read another's key", async () => {
    await setPersistedLlmKey("sk-user-a-key", "user-a");
    const keyForB = await getPersistedLlmKey("user-b");
    expect(keyForB).toBe("");
  });

  it("deletes a stored key", async () => {
    await setPersistedLlmKey("sk-to-delete", "user-2");
    await deletePersistedLlmKey("user-2");
    const key = await getPersistedLlmKey("user-2");
    expect(key).toBe("");
  });
});
