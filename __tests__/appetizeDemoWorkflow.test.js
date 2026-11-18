const fs = require("fs");
const path = require("path");

describe("Appetize demo Android workflow", () => {
  it("AC-1: does not use setup-android v3's retired tools default", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, "..", ".github", "workflows", "appetize-demo.yml"),
      "utf8"
    );
    const setupStep = workflow.match(
      /- name: Setup Android SDK[\s\S]*?(?=\n      - |\n  ios:)/
    )?.[0];

    expect(setupStep).toBeDefined();
    expect(setupStep).toMatch(/uses:\s*android-actions\/setup-android@v4\b/);
  });
});
