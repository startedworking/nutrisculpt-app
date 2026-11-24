import test from "node:test";
import assert from "node:assert/strict";

import {
  TRANSFORMATION_SESSION_KEY,
  SESSION_VERSION,
  createTransformationSessionPayload,
  validateTransformationSessionPayload,
  saveTransformationSession,
  readTransformationSession,
  clearTransformationSession,
} from "../lib/transformation-session.mjs";

const TOL = 1e-6;

const approx = (actual, expected, tolerance = TOL) => {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be approximately ${expected} (tolerance ${tolerance})`
  );
};

const baseForm = {
  age: "35",
  gender: "female",
  activity: "moderate",
  primaryGoal: "health",
  aerobicActivity: "150_299",
  aerobicIntensity: "moderate",
  strengthFrequency: "3_4",
  healthConsiderations: "no",
};

const baseCanonical = {
  weightKg: 70,
  heightCm: 175,
  waistCm: 85,
};

// ---------------------------------------------------------------------------
// Payload construction
// ---------------------------------------------------------------------------

test("createTransformationSessionPayload builds versioned schema", () => {
  const payload = createTransformationSessionPayload({
    unitSystem: "metric",
    canonical: baseCanonical,
    form: baseForm,
  });
  assert.equal(payload.version, SESSION_VERSION);
  assert.equal(payload.completed, true);
  assert.equal(payload.unitSystem, "metric");
  assert.equal(payload.inputs.weightKg, 70);
  assert.equal(payload.inputs.heightCm, 175);
  assert.equal(payload.inputs.waistCm, 85);
  assert.equal(payload.inputs.age, "35");
  assert.equal(payload.inputs.gender, "female");
  assert.ok(typeof payload.savedAt === "string");
});

test("createTransformationSessionPayload returns null for missing args", () => {
  assert.equal(
    createTransformationSessionPayload({ unitSystem: "metric" }),
    null
  );
  assert.equal(
    createTransformationSessionPayload({ canonical: baseCanonical }),
    null
  );
  assert.equal(createTransformationSessionPayload({ form: baseForm }), null);
});

// ---------------------------------------------------------------------------
// Payload validation (pure)
// ---------------------------------------------------------------------------

test("valid completed payload accepted (Metric)", () => {
  const payload = createTransformationSessionPayload({
    unitSystem: "metric",
    canonical: baseCanonical,
    form: baseForm,
  });
  const result = validateTransformationSessionPayload(payload);
  assert.ok(result);
  assert.equal(result.unitSystem, "metric");
  assert.equal(result.inputs.weightKg, 70);
  assert.equal(result.inputs.heightCm, 175);
  assert.equal(result.inputs.waistCm, 85);
});

test("valid completed payload accepted (Imperial display preference preserved)", () => {
  const payload = createTransformationSessionPayload({
    unitSystem: "imperial",
    canonical: baseCanonical,
    form: baseForm,
  });
  const result = validateTransformationSessionPayload(payload);
  assert.ok(result);
  assert.equal(result.unitSystem, "imperial");
});

test("missing payload returns null", () => {
  assert.equal(validateTransformationSessionPayload(undefined), null);
  assert.equal(validateTransformationSessionPayload(null), null);
  assert.equal(validateTransformationSessionPayload(""), null);
});

test("malformed JSON string rejected", () => {
  assert.equal(validateTransformationSessionPayload("{bad json"), null);
});

test("wrong schema version rejected", () => {
  const payload = createTransformationSessionPayload({
    unitSystem: "metric",
    canonical: baseCanonical,
    form: baseForm,
  });
  payload.version = 999;
  assert.equal(validateTransformationSessionPayload(payload), null);
});

test("invalid unit system rejected", () => {
  const payload = createTransformationSessionPayload({
    unitSystem: "metric",
    canonical: baseCanonical,
    form: baseForm,
  });
  payload.unitSystem = "stone";
  assert.equal(validateTransformationSessionPayload(payload), null);
});

test("missing required categorical field rejected", () => {
  for (const field of ["age", "gender", "activity", "primaryGoal"]) {
    const payload = createTransformationSessionPayload({
      unitSystem: "metric",
      canonical: baseCanonical,
      form: baseForm,
    });
    payload.inputs[field] = "";
    assert.equal(
      validateTransformationSessionPayload(payload),
      null,
      `expected ${field} blank to be rejected`
    );
  }
});

test("invalid canonical weight rejected", () => {
  const payload = createTransformationSessionPayload({
    unitSystem: "metric",
    canonical: baseCanonical,
    form: baseForm,
  });
  payload.inputs.weightKg = "hello";
  assert.equal(validateTransformationSessionPayload(payload), null);

  payload.inputs.weightKg = NaN;
  assert.equal(validateTransformationSessionPayload(payload), null);

  payload.inputs.weightKg = Infinity;
  assert.equal(validateTransformationSessionPayload(payload), null);

  payload.inputs.weightKg = -5;
  assert.equal(validateTransformationSessionPayload(payload), null);
});

test("invalid canonical height rejected", () => {
  const payload = createTransformationSessionPayload({
    unitSystem: "metric",
    canonical: baseCanonical,
    form: baseForm,
  });
  payload.inputs.heightCm = null;
  assert.equal(validateTransformationSessionPayload(payload), null);

  payload.inputs.heightCm = NaN;
  assert.equal(validateTransformationSessionPayload(payload), null);
});

test("blank optional waist accepted", () => {
  const payload = createTransformationSessionPayload({
    unitSystem: "metric",
    canonical: { weightKg: 70, heightCm: 175, waistCm: null },
    form: baseForm,
  });
  const result = validateTransformationSessionPayload(payload);
  assert.ok(result);
  assert.equal(result.inputs.waistCm, null);
});

test("invalid optional waist rejected", () => {
  const payload = createTransformationSessionPayload({
    unitSystem: "metric",
    canonical: { weightKg: 70, heightCm: 175, waistCm: -10 },
    form: baseForm,
  });
  assert.equal(validateTransformationSessionPayload(payload), null);
});

// ---------------------------------------------------------------------------
// Serialization equivalence (Metric vs Imperial canonical)
// ---------------------------------------------------------------------------

test("canonical values survive JSON serialization round trip", () => {
  const payload = createTransformationSessionPayload({
    unitSystem: "metric",
    canonical: baseCanonical,
    form: baseForm,
  });
  const serialized = JSON.stringify(payload);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.inputs.weightKg, 70);
  assert.equal(parsed.inputs.heightCm, 175);
  assert.equal(parsed.inputs.waistCm, 85);
  assert.equal(parsed.unitSystem, "metric");
});

test("equivalent Metric and Imperial restore to equivalent canonical data", () => {
  const metric = createTransformationSessionPayload({
    unitSystem: "metric",
    canonical: { weightKg: 70, heightCm: 175, waistCm: 85 },
    form: baseForm,
  });
  const imperial = createTransformationSessionPayload({
    unitSystem: "imperial",
    canonical: { weightKg: 70, heightCm: 175, waistCm: 85 },
    form: baseForm,
  });
  const m = validateTransformationSessionPayload(metric);
  const i = validateTransformationSessionPayload(imperial);
  assert.ok(m && i);
  approx(m.inputs.weightKg, i.inputs.weightKg, 0.001);
  approx(m.inputs.heightCm, i.inputs.heightCm, 0.001);
  approx(m.inputs.waistCm, i.inputs.waistCm, 0.001);
  assert.notEqual(m.unitSystem, i.unitSystem); // display preference preserved distinctly
});

// ---------------------------------------------------------------------------
// Privacy: no sensitive/unnecessary data in payload
// ---------------------------------------------------------------------------

test("payload contains no contact, share, or database identifiers", () => {
  const payload = createTransformationSessionPayload({
    unitSystem: "metric",
    canonical: baseCanonical,
    form: baseForm,
  });
  const flat = JSON.stringify(payload).toLowerCase();
  const forbidden = ["email", "phone", "contact", "cookie", "share", "image", "blob", "analytics"];
  for (const token of forbidden) {
    assert.ok(!flat.includes(token), `unexpected sensitive token in payload: ${token}`);
  }
});

// ---------------------------------------------------------------------------
// Storage wrappers with mocked sessionStorage
// ---------------------------------------------------------------------------

function installFakeStorage() {
  const store = {};
  const fake = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
  Object.defineProperty(global, "window", {
    value: { sessionStorage: fake },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(global, "sessionStorage", {
    value: fake,
    writable: true,
    configurable: true,
  });
  return store;
}

test("saveTransformationSession writes and readTransformationSession reads back", () => {
  const store = installFakeStorage();
  const payload = createTransformationSessionPayload({
    unitSystem: "metric",
    canonical: baseCanonical,
    form: baseForm,
  });
  assert.equal(saveTransformationSession(payload), true);
  assert.equal(store[TRANSFORMATION_SESSION_KEY], JSON.stringify(payload));
  const read = readTransformationSession();
  assert.ok(read);
  assert.equal(read.unitSystem, "metric");
  assert.equal(read.inputs.weightKg, 70);
});

test("clearTransformationSession removes the key", () => {
  const store = installFakeStorage();
  store[TRANSFORMATION_SESSION_KEY] = "some-payload";
  assert.equal(clearTransformationSession(), true);
  assert.equal(store[TRANSFORMATION_SESSION_KEY], undefined);
});

test("readTransformationSession returns null when storage empty", () => {
  installFakeStorage();
  assert.equal(readTransformationSession(), null);
});

test("readTransformationSession rejects corrupted JSON", () => {
  installFakeStorage();
  global.sessionStorage.setItem(TRANSFORMATION_SESSION_KEY, "{bad json");
  assert.equal(readTransformationSession(), null);
});

test("readTransformationSession rejects wrong version", () => {
  installFakeStorage();
  global.sessionStorage.setItem(
    TRANSFORMATION_SESSION_KEY,
    JSON.stringify({ version: 999, completed: true })
  );
  assert.equal(readTransformationSession(), null);
});

test("readTransformationSession returns null when storage unavailable", () => {
  const origWindow = global.window;
  const origSession = global.sessionStorage;
  delete global.window;
  delete global.sessionStorage;
  assert.equal(readTransformationSession(), null);
  assert.equal(saveTransformationSession({}), false);
  assert.equal(clearTransformationSession(), false);
  global.window = origWindow;
  global.sessionStorage = origSession;
});
