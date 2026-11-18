const fs = require("fs");
const path = require("path");

describe("Appetize demo Android SDK setup", () => {
  it("AC-1: does not ask sdkmanager for the retired tools package", () => {
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

  it("AC-2: includes the Android job in the pull-request path before building the demo APK", () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, "..", ".github", "workflows", "appetize-demo.yml"),
      "utf8"
    );
    const pullRequestTrigger = workflow.match(
      /  pull_request:\n[\s\S]*?(?=\n\nconcurrency:)/
    )?.[0];
    const androidJob = workflow.match(
      /\njobs:\n[\s\S]*?\n  android:\n([\s\S]*?)(?=\n  ios:|$)/
    )?.[1];

    expect(pullRequestTrigger).toBeDefined();
    expect(pullRequestTrigger).toContain('".github/workflows/appetize-demo.yml"');
    expect(androidJob).toBeDefined();
    expect(androidJob).toMatch(/if: [\s\S]*github\.event_name == 'pull_request'/);

    const setupIndex = androidJob.indexOf("- name: Setup Android SDK");
    const buildIndex = androidJob.indexOf("- name: Build release demo APK");

    expect(setupIndex).toBeGreaterThanOrEqual(0);
    expect(buildIndex).toBeGreaterThan(setupIndex);
    expect(androidJob).toContain("npm run build:demo:apk");
  });
});
