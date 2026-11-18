const fs = require("fs");
const path = require("path");

describe("Appetize demo Android workflow", () => {
  const workflowPath = path.join(
    __dirname,
    "..",
    ".github",
    "workflows",
    "appetize-demo.yml"
  );

  const readWorkflow = () => fs.readFileSync(workflowPath, "utf8");

  it("AC-1: does not use setup-android v3's retired tools default", () => {
    const workflow = readWorkflow();
    const setupStep = workflow.match(
      /- name: Setup Android SDK[\s\S]*?(?=\n      - |\n  ios:)/
    )?.[0];

    expect(setupStep).toBeDefined();
    expect(setupStep).toMatch(/uses:\s*android-actions\/setup-android@v4\b/);
  });

  it("AC-2: triggers on workflow pull requests and builds the Android demo APK", () => {
    const workflow = readWorkflow();
    const pullRequest = workflow.match(
      /  pull_request:\n([\s\S]*?)(?=\n\nconcurrency:)/
    )?.[1];
    const androidJob = workflow.match(
      /  android:\n([\s\S]*?)(?=\n  ios:)/
    )?.[1];

    expect(pullRequest).toBeDefined();
    expect(pullRequest).toMatch(/branches:\s*\[main\]/);
    expect(pullRequest).toMatch(
      /- "\.github\/workflows\/appetize-demo\.yml"/
    );
    expect(androidJob).toBeDefined();
    expect(androidJob.indexOf("name: Setup Android SDK")).toBeLessThan(
      androidJob.indexOf("name: Build release demo APK")
    );
  });

  it("AC-3: preserves the existing demo artifact and Appetize workflow behavior", () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(/run: npm run build:demo:apk/);
    expect(workflow).toMatch(/uses: actions\/upload-artifact@v4/);
    expect(workflow).toMatch(/run: npm run upload:appetize/);
  });
});
