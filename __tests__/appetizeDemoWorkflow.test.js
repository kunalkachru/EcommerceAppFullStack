const fs = require("fs");
const path = require("path");

describe("Appetize demo Android SDK setup", () => {
  it("does not ask sdkmanager for the retired tools package", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, "..", ".github", "workflows", "appetize-demo.yml"),
      "utf8"
    );
    const setupAndroidStep = workflow.match(
      /      - name: Setup Android SDK[\s\S]*?(?=\n      - |\n  [a-zA-Z]|$)/
    )?.[0];

    expect(setupAndroidStep).toBeDefined();
    expect(setupAndroidStep).toMatch(/\n        with:\n/);
    expect(setupAndroidStep).toMatch(/packages:/);
    expect(setupAndroidStep).not.toMatch(/(^|[\s;,])tools([\s;,]|$)/);
  });
});
