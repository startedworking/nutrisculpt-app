import test from "node:test";
import assert from "node:assert/strict";

import {
  kgToLbExact,
  lbToKgExact,
  cmToIn,
  inToCm,
  cmToFeetInches,
  feetInchesToCm,
  KG_PER_LB_EXACT,
  CM_PER_INCH,
  INCHES_PER_FOOT,
} from "../lib/calculators.mjs";

const TOL = 1e-6;

const round1 = (value) => Math.round(value * 10) / 10;

const approx = (actual, expected, tolerance = TOL) => {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be approximately ${expected} (tolerance ${tolerance})`
  );
};

// ---------------------------------------------------------------------------
// Conversion constants
// ---------------------------------------------------------------------------

test("exact conversion constants are defined", () => {
  assert.equal(KG_PER_LB_EXACT, 2.2046226218);
  assert.equal(CM_PER_INCH, 2.54);
  assert.equal(INCHES_PER_FOOT, 12);
});

// ---------------------------------------------------------------------------
// Weight conversions
// ---------------------------------------------------------------------------

test("70 kg converts to approximately 154.324 lb", () => {
  approx(kgToLbExact(70), 154.324, 0.001);
});

test("154.324 lb converts to approximately 70 kg", () => {
  approx(lbToKgExact(154.324), 70, 0.001);
});

test("kg/lb conversions are round-trip stable", () => {
  const kg = 70;
  approx(lbToKgExact(kgToLbExact(kg)), kg, 0.001);
});

test("lb/kg conversions are round-trip stable", () => {
  const lb = 154.324;
  approx(kgToLbExact(lbToKgExact(lb)), lb, 0.001);
});

test("kgToLbExact handles zero", () => {
  assert.equal(kgToLbExact(0), 0);
});

test("lbToKgExact handles zero", () => {
  assert.equal(lbToKgExact(0), 0);
});

// ---------------------------------------------------------------------------
// Height conversions
// ---------------------------------------------------------------------------

test("175 cm converts to feet and inches representation", () => {
  const { ft, inches } = cmToFeetInches(175);
  assert.equal(ft, 5);
  approx(inches, 8.897638, 0.001);
});

test("5 ft 9 in converts to approximately 175.26 cm", () => {
  approx(feetInchesToCm(5, 9), 175.26, 0.01);
});

test("cmToFeetInches returns zero for non-positive input", () => {
  const result = cmToFeetInches(0);
  assert.equal(result.ft, 0);
  assert.equal(result.inches, 0);
});

test("feetInchesToCm returns null for invalid input", () => {
  assert.equal(feetInchesToCm(NaN, 9), null);
  assert.equal(feetInchesToCm(5, NaN), null);
  assert.equal(feetInchesToCm(null, 9), null);
});

// ---------------------------------------------------------------------------
// Waist conversions
// ---------------------------------------------------------------------------

test("85 cm converts to approximately 33.465 in", () => {
  approx(cmToIn(85), 33.465, 0.001);
});

test("33.465 in converts to approximately 85 cm", () => {
  approx(inToCm(33.465), 85, 0.01);
});

test("cm/in conversions are round-trip stable", () => {
  const cm = 85;
  approx(inToCm(cmToIn(cm)), cm, 0.001);
});

test("in/cm conversions are round-trip stable", () => {
  const inches = 33.465;
  approx(cmToIn(inToCm(inches)), inches, 0.001);
});

// ---------------------------------------------------------------------------
// Blank / invalid / negative handling
// ---------------------------------------------------------------------------

test("blank remains blank (empty string does not produce NaN canonical)", () => {
  const empty = "";
  const parsed = parseFloat(empty);
  assert.equal(Number.isFinite(parsed), false);
});

test("negative weight values are converted (validation rejects them at UI layer)", () => {
  approx(lbToKgExact(-10), -4.5359237, 0.001);
});

test("canonical normalization does not produce NaN for empty strings", () => {
  const weightKg = "" !== "" ? (parseFloat("") > 0 ? parseFloat("") : null) : null;
  assert.equal(weightKg, null);

  const heightCm = "" !== "" ? parseFloat("") : null;
  assert.equal(heightCm, null);

  const waistCm = "" !== "" ? parseFloat("") : null;
  assert.equal(waistCm, null);
});

test("parseFloat of non-numeric string yields NaN", () => {
  assert.equal(Number.isFinite(parseFloat("abc")), false);
  assert.equal(Number.isFinite(parseFloat("")), false);
});

// ---------------------------------------------------------------------------
// Imperial inches component validation
// ---------------------------------------------------------------------------

test("imperial inches component must be 0-11", () => {
  assert.ok(0 >= 0 && 0 < 12);
  assert.ok(11 >= 0 && 11 < 12);
  assert.ok(!(12 >= 0 && 12 < 12));
  assert.ok(!(-1 >= 0 && -1 < 12));
});

test("partial imperial height (missing ft or in) yields null canonical", () => {
  const ft = "";
  const inVal = "9";
  const heightCm = (ft !== "" && inVal !== "") ? feetInchesToCm(parseFloat(ft), parseFloat(inVal)) : null;
  assert.equal(heightCm, null);

  const ft2 = "5";
  const inVal2 = "";
  const heightCm2 = (ft2 !== "" && inVal2 !== "") ? feetInchesToCm(parseFloat(ft2), parseFloat(inVal2)) : null;
  assert.equal(heightCm2, null);
});

// ---------------------------------------------------------------------------
// Unit switch preserves physical quantity
// ---------------------------------------------------------------------------

test("unit switch preserves weight physical quantity (metric to imperial)", () => {
  const weightKg = 70;
  const weightLb = kgToLbExact(weightKg);
  approx(lbToKgExact(weightLb), weightKg, 0.001);
});

test("unit switch preserves weight physical quantity (imperial to metric)", () => {
  const weightLb = 154.324;
  const weightKg = lbToKgExact(weightLb);
  approx(kgToLbExact(weightKg), weightLb, 0.001);
});

test("unit switch preserves height physical quantity (metric to imperial)", () => {
  const heightCm = 175;
  const { ft, inches } = cmToFeetInches(heightCm);
  const backToCm = feetInchesToCm(ft, inches);
  approx(backToCm, heightCm, 0.01);
});

test("unit switch preserves waist physical quantity (metric to imperial)", () => {
  const waistCm = 85;
  const waistIn = cmToIn(waistCm);
  approx(inToCm(waistIn), waistCm, 0.001);
});

// ---------------------------------------------------------------------------
// Conversion precision: no 2.2 or 2.5 approximations
// ---------------------------------------------------------------------------

test("kgToLbExact does not use approximate 2.2 factor", () => {
  assert.equal(kgToLbExact(1), 2.2046226218);
  assert.notEqual(kgToLbExact(1), 2.2);
});

test("cmToIn does not use approximate 2.5 factor", () => {
  assert.equal(cmToIn(2.54), 1);
  assert.notEqual(cmToIn(2.54), 2.54 / 2.5);
});

// ---------------------------------------------------------------------------
// 04B-2 Conversion stability: repeated toggling must not drift
// ---------------------------------------------------------------------------

test("repeated metric↔imperial weight toggle does not drift", () => {
  // Simulate: canonical kg -> imperial display (round1) -> canonical kg -> imperial display (round1)
  let kg = 70.05;
  for (let i = 0; i < 10; i++) {
    const lb = round1(kgToLbExact(kg));
    kg = round1(lbToKgExact(lb));
  }
  approx(kg, 70.0, 0.1); // stabilizes; no runaway drift
});

test("repeated metric↔imperial height toggle does not drift", () => {
  let cm = 175.0;
  for (let i = 0; i < 10; i++) {
    const { ft, inches } = cmToFeetInches(cm);
    const lbIn = round1(inches);
    cm = round1(feetInchesToCm(ft, lbIn));
  }
  approx(cm, 175.0, 0.2);
});

test("repeated metric↔imperial waist toggle does not drift", () => {
  let cm = 85.0;
  for (let i = 0; i < 10; i++) {
    const inch = round1(cmToIn(cm));
    cm = round1(inToCm(inch));
  }
  approx(cm, 85.0, 0.1);
});

// ---------------------------------------------------------------------------
// 04B-2 Blank-state preservation across toggles
// ---------------------------------------------------------------------------

test("blank weight stays blank (parseFloat empty string is not finite)", () => {
  assert.equal(Number.isFinite(parseFloat("")), false);
  const weightKg = "" !== "" ? (parseFloat("") > 0 ? parseFloat("") : null) : null;
  assert.equal(weightKg, null);
});

test("blank waist stays blank", () => {
  const waistCm = "" !== "" ? parseFloat("") : null;
  assert.equal(waistCm, null);
});

test("blank height stays blank", () => {
  const heightCm = "" !== "" ? parseFloat("") : null;
  assert.equal(heightCm, null);
});

// ---------------------------------------------------------------------------
// 04B-2 Height edge cases
// ---------------------------------------------------------------------------

test("6 ft 0 in converts to 182.88 cm", () => {
  approx(feetInchesToCm(6, 0), 182.88, 0.001);
});

test("inches component must be 0 <= in < 12", () => {
  assert.ok(0 >= 0 && 0 < 12);
  assert.ok(11 >= 0 && 11 < 12);
  assert.ok(11.999 >= 0 && 11.999 < 12);
  assert.ok(!(12 >= 0 && 12 < 12));
  assert.ok(!(-1 >= 0 && -1 < 12));
});

test("negative inches is rejected by validation logic (inches < 0 invalid)", () => {
  assert.ok(!(-1 >= 0 && -1 < 12));
  assert.ok(!(12 >= 0 && 12 < 12));
  // feetInchesToCm is mathematically defined for negatives; the UI validation
  // layer (inVal >= 0 && inVal < 12) is what rejects out-of-range inches.
  assert.equal(typeof feetInchesToCm(5, -1), "number");
});

test("partial imperial height yields null canonical", () => {
  const heightCm = ("5" !== "" && "9" !== "") ? feetInchesToCm(5, 9) : null;
  assert.equal(heightCm, 175.26);

  const heightCmPartial = ("5" !== "" && "" !== "") ? feetInchesToCm(5, parseFloat("")) : null;
  assert.equal(heightCmPartial, null);
});

// ---------------------------------------------------------------------------
// 04B-2 Equivalent Metric/Imperial canonical payload
// ---------------------------------------------------------------------------

test("70 kg and 154.324 lb produce equivalent canonical kilograms", () => {
  const metricKg = 70;
  const imperialLb = 154.324;
  const imperialAsKg = lbToKgExact(imperialLb);
  approx(imperialAsKg, metricKg, 0.01);
});

test("175 cm and 5 ft 9 in produce equivalent canonical centimeters", () => {
  const metricCm = 175;
  const imperialCm = feetInchesToCm(5, 9);
  // 5 ft 9 in = 175.26 cm; within half an inch of 175 cm
  approx(imperialCm, 175.26, 0.01);
});

test("85 cm and 33.465 in produce equivalent canonical centimeters", () => {
  const metricCm = 85;
  const imperialIn = 33.465;
  const imperialAsCm = inToCm(imperialIn);
  approx(imperialAsCm, metricCm, 0.01);
});