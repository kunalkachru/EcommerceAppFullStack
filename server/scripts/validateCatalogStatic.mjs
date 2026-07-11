// server/scripts/validateCatalogStatic.mjs
import { execSync } from "node:child_process";

try {
  execSync("npx jest __tests__/catalogStaticValidation.test.js", { stdio: "inherit" });
  console.log("Catalog validation PASSED.");
  process.exit(0);
} catch {
  console.error("Catalog validation FAILED. See test output above.");
  process.exit(1);
}
