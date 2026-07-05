#!/usr/bin/env node
/**
 * Fail fast when required GitHub Actions secrets are missing (values never logged).
 *
 * Usage (CI only — secrets injected via workflow env):
 *   node scripts/assert-github-secrets.mjs --context appetize-android
 *   node scripts/assert-github-secrets.mjs --context appetize-ios
 */
const CONTEXTS = {
  "appetize-android": {
    required: ["APPETIZE_API_TOKEN", "APPETIZE_PUBLIC_KEY_ANDROID"],
    optional: ["APPETIZE_PUBLIC_KEY_IOS"],
  },
  "appetize-ios": {
    required: ["APPETIZE_API_TOKEN"],
    optional: ["APPETIZE_PUBLIC_KEY_IOS"],
  },
};

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const context = arg("context");
const spec = CONTEXTS[context];

if (!spec) {
  console.error(
    "Usage: --context appetize-android|appetize-ios\n" +
      "Set secrets in GitHub → Settings → Secrets and variables → Actions"
  );
  process.exit(1);
}

if (process.env.GITHUB_ACTIONS !== "true") {
  console.warn(
    "Note: assert-github-secrets is for CI. Locally use src/.env via loadAppetizeEnv()."
  );
}

const missing = spec.required.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.error(`Missing required GitHub secrets for ${context}:`);
  for (const k of missing) console.error(`  - ${k}`);
  console.error(
    "\nAdd at: GitHub repo → Settings → Secrets and variables → Actions"
  );
  console.error("See: scripts/lib/CI_CD_QUICKSTART.md");
  process.exit(1);
}

console.log(`✓ GitHub secrets OK for ${context} (${spec.required.length} required)`);
for (const k of spec.optional) {
  if (process.env[k]?.trim()) {
    console.log(`  ✓ optional ${k} set`);
  } else {
    console.log(`  · optional ${k} not set (first upload may create new Appetize URL)`);
  }
}
