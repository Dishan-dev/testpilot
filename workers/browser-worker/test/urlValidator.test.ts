import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAuthorizedHosts, validateUrl } from "../src/security/urlValidator.js";
import { readEnvironment } from "../src/config/environment.js";

const hosts = parseAuthorizedHosts("example.com, APP.EXAMPLE.COM ");
test("accepts authorized HTTPS URLs and normalizes host case", () => {
  assert.equal(validateUrl("https://EXAMPLE.com/path?q=1#section", hosts).hostname, "example.com");
  assert.equal(validateUrl("https://app.example.com:443/", hosts).port, "");
});
for (const value of ["", "invalid", "/relative", "http://example.com", "file:///etc/passwd", "javascript:alert(1)", "https://other.com", "https://example.com.evil.com", "https://sub.example.com", "https://example.com@evil.com", "https://user:password@example.com", "https://example.com:8443", "https://example.com.", "https://127.0.0.1"]) {
  test(`rejects invalid or unauthorized target: ${value}`, () => assert.throws(() => validateUrl(value, hosts)));
}
test("missing allowlist denies all targets", () => {
  assert.throws(() => validateUrl("https://example.com", parseAuthorizedHosts(undefined)));
});
test("allowlist rejects wildcards, URLs, paths and ports", () => {
  for (const value of ["*.example.com", "https://example.com", "example.com/path", "example.com:443", "example.com."]) assert.throws(() => parseAuthorizedHosts(value));
});
test("configuration rejects unbounded, invalid or empty timeouts", () => {
  for (const value of ["0", "-1", "abc", "120001", "", "1.5", "Infinity"]) assert.throws(() => readEnvironment({ NAVIGATION_TIMEOUT_MS: value }));
  assert.equal(readEnvironment({ NAVIGATION_TIMEOUT_MS: "1500" }).navigationTimeoutMs, 1500);
});
