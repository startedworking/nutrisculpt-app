// Transformation session persistence (04C).
//
// Privacy-first, session-scoped restoration of a completed Transformation
// snapshot using window.sessionStorage only.
//
// Guiding rules:
//   - Persist canonical internal units (weightKg, heightCm, waistCm), never
//     rounded display values, to avoid reintroducing conversion drift.
//   - Persist only after successful validation + snapshot calculation.
//   - Never persist result objects, share data, contact info, or measurements
//     in URLs.
//   - Never access window/sessionStorage during server render.
//   - Treat storage as an enhancement: failures must not break calculation.

export const TRANSFORMATION_SESSION_KEY = "nutrisculpt:transformation:v1";
export const SESSION_VERSION = 1;

// Categorical inputs that materially affect results and must be explicitly
// chosen before a snapshot can be restored.
const REQUIRED_CATEGORICAL = ["age", "gender", "activity", "primaryGoal"];

// Numeric canonical inputs required for reconstruction.
const REQUIRED_NUMERIC = ["weightKg", "heightCm"];

// Optional but persisted canonical input.
const OPTIONAL_NUMERIC = ["waistCm"];

// All inputs eligible for persistence (privacy-minimized inventory).
const PERSISTED_INPUTS = [
  "age",
  "gender",
  "activity",
  "primaryGoal",
  "aerobicActivity",
  "aerobicIntensity",
  "strengthFrequency",
  "healthConsiderations",
  ...REQUIRED_NUMERIC,
  ...OPTIONAL_NUMERIC,
];

// ---------------------------------------------------------------------------
// Payload construction
// ---------------------------------------------------------------------------

export function createTransformationSessionPayload({
  unitSystem,
  canonical,
  form,
}) {
  if (!unitSystem || !canonical || !form) {
    return null;
  }

  const inputs = {};
  for (const field of PERSISTED_INPUTS) {
    if (field in form) {
      inputs[field] = form[field];
    }
  }
  inputs.weightKg = canonical.weightKg;
  inputs.heightCm = canonical.heightCm;
  inputs.waistCm = canonical.waistCm;

  return {
    version: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    unitSystem,
    inputs,
    completed: true,
  };
}

// ---------------------------------------------------------------------------
// Payload validation (pure, testable without a browser)
// ---------------------------------------------------------------------------

function isFinitePositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isFiniteNonNegative(value) {
  return (
    value != null &&
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

export function validateTransformationSessionPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if (payload.version !== SESSION_VERSION) {
    return null;
  }
  if (payload.completed !== true) {
    return null;
  }
  if (
    payload.unitSystem !== "metric" &&
    payload.unitSystem !== "imperial"
  ) {
    return null;
  }

  const inputs = payload.inputs;
  if (!inputs || typeof inputs !== "object") {
    return null;
  }

  // Required categorical fields must be present and non-empty strings.
  for (const field of REQUIRED_CATEGORICAL) {
    const value = inputs[field];
    if (value == null || value === "" || typeof value !== "string") {
      return null;
    }
  }

  // Required canonical numerics must be finite and positive.
  for (const field of REQUIRED_NUMERIC) {
    if (!isFinitePositive(inputs[field])) {
      return null;
    }
  }

  // Optional waist: if present, must be finite and non-negative.
  if (
    inputs.waistCm != null &&
    !isFiniteNonNegative(inputs.waistCm)
  ) {
    return null;
  }

  // Numeric range sanity (broad plausibility guards, not medical thresholds).
  if (inputs.weightKg < 20 || inputs.weightKg > 300) {
    return null;
  }
  if (inputs.heightCm < 50 || inputs.heightCm > 250) {
    return null;
  }
  if (
    inputs.waistCm != null &&
    (inputs.waistCm < 40 || inputs.waistCm > 200)
  ) {
    return null;
  }

  return {
    unitSystem: payload.unitSystem,
    inputs,
  };
}

// ---------------------------------------------------------------------------
// Storage wrappers (browser only; safe to import in SSR modules but call
// only from client effects)
// ---------------------------------------------------------------------------

function storageAvailable() {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return false;
  }
  try {
    const key = "__nutrisculpt_storage_test__";
    window.sessionStorage.setItem(key, key);
    window.sessionStorage.removeItem(key);
    return true;
  } catch (_) {
    return false;
  }
}

export function saveTransformationSession(payload) {
  if (!storageAvailable()) {
    return false;
  }
  try {
    window.sessionStorage.setItem(
      TRANSFORMATION_SESSION_KEY,
      JSON.stringify(payload)
    );
    return true;
  } catch (_) {
    // Storage failure is an enhancement failure; never break the UI.
    return false;
  }
}

export function readTransformationSession() {
  if (!storageAvailable()) {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(TRANSFORMATION_SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return validateTransformationSessionPayload(parsed);
  } catch (_) {
    // Malformed JSON or invalid schema -> ignore, do not crash.
    return null;
  }
}

export function clearTransformationSession() {
  if (!storageAvailable()) {
    return false;
  }
  try {
    window.sessionStorage.removeItem(TRANSFORMATION_SESSION_KEY);
    return true;
  } catch (_) {
    return false;
  }
}
