#!/usr/bin/env node
import { execSync } from "node:child_process";
import { 
  screenshot, 
  dumpUi, 
  sleep, 
  launchApp, 
  loginIfNeeded,
  DEVICE, 
  PACKAGE, 
  ADB 
} from "./scripts/e2e-adb.mjs";

async function test() {
  console.log("Clearing app...");
  execSync(`${ADB} shell pm clear ${PACKAGE}`, { stdio: "inherit" });
  
  console.log("Launching app...");
  launchApp();
  sleep(6000);
  
  console.log("Taking screenshot...");
  screenshot("login-start");
  
  console.log("Logging in...");
  await loginIfNeeded({ email: "test@example.com", password: "secret123" });
  
  console.log("Taking post-login screenshot...");
  screenshot("login-done");
  
  console.log("Dumping UI...");
  const xml = dumpUi();
  console.log("UI contains 'Start with how you think':", xml.includes("Start with how you think"));
  console.log("UI length:", xml.length);
  
  console.log("Done!");
}

test().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
