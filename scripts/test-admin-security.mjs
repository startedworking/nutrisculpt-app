import test from "node:test";
import assert from "node:assert/strict";
import { resolveFingerprintSecret } from "../lib/enquiries.js";
import { isSameOriginRequest } from "../lib/admin-auth.js";

// ---------------------------------------------------------------------------
// Enquiry fingerprint-secret production behavior
// ---------------------------------------------------------------------------

function envSnapshot() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    ENQUIRY_FINGERPRINT_SECRET: process.env.ENQUIRY_FINGERPRINT_SECRET,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  };
}

function restoreEnv(snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("resolveFingerprintSecret returns the dedicated secret in production", () => {
  const before = envSnapshot();
  try {
    process.env.NODE_ENV = "production";
    process.env.ENQUIRY_FINGERPRINT_SECRET = "dedicated-fingerprint-secret";
    delete process.env.ADMIN_SESSION_SECRET;
    assert.equal(resolveFingerprintSecret(), "dedicated-fingerprint-secret");
  } finally {
    restoreEnv(before);
  }
});

test("resolveFingerprintSecret returns null in production when the dedicated secret is missing", () => {
  const before = envSnapshot();
  try {
    process.env.NODE_ENV = "production";
    delete process.env.ENQUIRY_FINGERPRINT_SECRET;
    // ADMIN_SESSION_SECRET must NOT be accepted as a fallback in production.
    process.env.ADMIN_SESSION_SECRET = "admin-session-secret";
    assert.equal(resolveFingerprintSecret(), null);
  } finally {
    restoreEnv(before);
  }
});

test("resolveFingerprintSecret returns null in production when no secret is configured", () => {
  const before = envSnapshot();
  try {
    process.env.NODE_ENV = "production";
    delete process.env.ENQUIRY_FINGERPRINT_SECRET;
    delete process.env.ADMIN_SESSION_SECRET;
    assert.equal(resolveFingerprintSecret(), null);
  } finally {
    restoreEnv(before);
  }
});

test("resolveFingerprintSecret accepts ADMIN_SESSION_SECRET fallback outside production", () => {
  const before = envSnapshot();
  try {
    process.env.NODE_ENV = "development";
    delete process.env.ENQUIRY_FINGERPRINT_SECRET;
    process.env.ADMIN_SESSION_SECRET = "admin-session-secret";
    assert.equal(resolveFingerprintSecret(), "admin-session-secret");
  } finally {
    restoreEnv(before);
  }
});

test("resolveFingerprintSecret prefers ENQUIRY_FINGERPRINT_SECRET outside production", () => {
  const before = envSnapshot();
  try {
    process.env.NODE_ENV = "development";
    process.env.ENQUIRY_FINGERPRINT_SECRET = "dedicated-fingerprint-secret";
    process.env.ADMIN_SESSION_SECRET = "admin-session-secret";
    assert.equal(resolveFingerprintSecret(), "dedicated-fingerprint-secret");
  } finally {
    restoreEnv(before);
  }
});

test("resolveFingerprintSecret returns null when no secret is configured outside production", () => {
  const before = envSnapshot();
  try {
    process.env.NODE_ENV = "development";
    delete process.env.ENQUIRY_FINGERPRINT_SECRET;
    delete process.env.ADMIN_SESSION_SECRET;
    assert.equal(resolveFingerprintSecret(), null);
  } finally {
    restoreEnv(before);
  }
});

// ---------------------------------------------------------------------------
// CSRF same-origin protection
// ---------------------------------------------------------------------------

function makeRequest(url, headers = {}) {
  return {
    url,
    headers: { get: (key) => headers[key] ?? null },
  };
}

const appOrigin = "https://nutrisculpt.vercel.app";

test("isSameOriginRequest allows same-origin requests", () => {
  const req = makeRequest(`${appOrigin}/api/admin/enquiries`, { origin: appOrigin });
  assert.equal(isSameOriginRequest(req), true);
});

test("isSameOriginRequest rejects cross-origin requests", () => {
  const req = makeRequest(`${appOrigin}/api/admin/enquiries`, { origin: "https://evil.example" });
  assert.equal(isSameOriginRequest(req), false);
});

test("isSameOriginRequest rejects cross-origin referer", () => {
  const req = makeRequest(`${appOrigin}/api/admin/enquiries`, { referer: "https://evil.example/" });
  assert.equal(isSameOriginRequest(req), false);
});

test("isSameOriginRequest allows matching referer", () => {
  const req = makeRequest(`${appOrigin}/api/admin/enquiries`, { referer: `${appOrigin}/admin/enquiries` });
  assert.equal(isSameOriginRequest(req), true);
});

test("isSameOriginRequest allows requests with no origin or referer", () => {
  const req = makeRequest(`${appOrigin}/api/admin/enquiries`);
  assert.equal(isSameOriginRequest(req), true);
});
