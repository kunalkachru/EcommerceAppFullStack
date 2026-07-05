/**
 * Classify verify:cloud:all output for deploy-gate retry decisions.
 *
 * transient  — likely Railway cold start, CLIP indexing, network blip → retry
 * blocking   — genuine regression or misconfiguration → fail gate
 * unknown    — retry once; fail if second attempt also fails
 */

const TRANSIENT_PATTERNS = [
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ECONNREFUSED/i,
  /socket hang up/i,
  /fetch failed/i,
  /network error/i,
  /HTTP 502/i,
  /HTTP 503/i,
  /HTTP 504/i,
  /status HTTP 5\d\d/i,
  /modelLoaded=false/i,
  /indexing=true/i,
  /Waiting for modelLoaded/i,
  /CLIP ready/i,
  /timed out waiting/i,
  /Service Unavailable/i,
  /Bad Gateway/i,
];

const BLOCKING_PATTERNS = [
  /FAIL GET \/health/i,
  /FAIL.*\/api\/products/i,
  /FAIL.*login/i,
  /401/i,
  /403 Forbidden/i,
  /assert-cloud-api-target/i,
  /API_TARGET_MODE.*local/i,
  /secrets-policy/i,
  /Missing artifact/i,
  /ENOENT.*cloud-api\.json/i,
];

/**
 * @param {string} output - combined stdout + stderr from verify run
 * @returns {'transient' | 'blocking' | 'unknown'}
 */
export function classifyGateFailure(output) {
  const text = output || "";
  for (const re of BLOCKING_PATTERNS) {
    if (re.test(text)) return "blocking";
  }
  for (const re of TRANSIENT_PATTERNS) {
    if (re.test(text)) return "transient";
  }
  return "unknown";
}

/**
 * @param {'transient' | 'blocking' | 'unknown'} kind
 * @returns {boolean} whether a retry is warranted
 */
export function shouldRetry(kind, attempt, maxAttempts) {
  if (attempt >= maxAttempts) return false;
  if (kind === "blocking") return false;
  return true;
}
