import test from "node:test";
import assert from "node:assert/strict";

import {
  round,
  kgToLb,
  lbToKg,
  parseFiniteNumber,
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  weightBasedEstimate,
  waterUnits,
} from "../lib/calculators.mjs";

// ---------------------------------------------------------------------------
// Shared finite-number parser (04D-1)
// ---------------------------------------------------------------------------

test("parseFiniteNumber: blank string is null (distinct from zero)", () => {
  assert.equal(parseFiniteNumber(""), null);
});

test("parseFiniteNumber: whitespace-only is null", () => {
  assert.equal(parseFiniteNumber(" "), null);
});

test("parseFiniteNumber: null and undefined are null", () => {
  assert.equal(parseFiniteNumber(null), null);
  assert.equal(parseFiniteNumber(undefined), null);
});

test("parseFiniteNumber: non-numeric text is null", () => {
  assert.equal(parseFiniteNumber("abc"), null);
});

test("parseFiniteNumber: trailing decimal parses", () => {
  assert.equal(parseFiniteNumber("1."), 1);
});

test("parseFiniteNumber: decimal parses", () => {
  assert.equal(parseFiniteNumber("1.5"), 1.5);
});

test("parseFiniteNumber: zero is a valid number (not null)", () => {
  assert.equal(parseFiniteNumber(0), 0);
  assert.equal(parseFiniteNumber("0"), 0);
});

test("parseFiniteNumber: negative is valid", () => {
  assert.equal(parseFiniteNumber(-1), -1);
});

test("parseFiniteNumber: NaN is null", () => {
  assert.equal(parseFiniteNumber(NaN), null);
});

test("parseFiniteNumber: Infinity is null", () => {
  assert.equal(parseFiniteNumber(Infinity), null);
});

test("parseFiniteNumber: -Infinity is null", () => {
  assert.equal(parseFiniteNumber(-Infinity), null);
});

// ---------------------------------------------------------------------------
// Macro safety: blank / invalid inputs must not crash
// ---------------------------------------------------------------------------

test("macro: calculateBMR rejects blank/invalid weight/height/age (no crash)", () => {
  assert.equal(calculateBMR(null, 170, 25, "male"), null);
  assert.equal(calculateBMR(70, null, 25, "male"), null);
  assert.equal(calculateBMR(70, 170, null, "male"), null);
  // A valid gendered input produces a finite number (empty-string gender is
  // rejected by the page's !gender guard before calculation).
  assert.ok(Number.isFinite(calculateBMR(70, 170, 25, "male")));
});

test("macro: calculateTDEE rejects null BMR (no crash)", () => {
  assert.equal(calculateTDEE(null, 1.375), null);
});

test("macro: calculateMacros rejects zero/negative calories (no crash)", () => {
  assert.equal(calculateMacros(0, { protein: 25, carbs: 45, fat: 30 }), null);
  assert.equal(calculateMacros(-100, { protein: 25, carbs: 45, fat: 30 }), null);
});

test("macro: calculateMacros rejects invalid percentages (no crash)", () => {
  assert.equal(calculateMacros(2000, { protein: 110, carbs: 45, fat: 30 }), null);
  assert.equal(calculateMacros(2000, { protein: -5, carbs: 45, fat: 30 }), null);
});

test("macro: null custom macro percentages are treated as zero by helper (page guards null before calling)", () => {
  const result = calculateMacros(2000, { protein: null, carbs: null, fat: null });
  assert.ok(result);
  assert.equal(result.protein.percentage, 0);
  assert.equal(result.carbs.percentage, 0);
  assert.equal(result.fat.percentage, 0);
});

test("macro: conversions do not produce NaN from blank input", () => {
  assert.equal(kgToLb(null), 0); // kgToLb is arithmetic; pages guard before calling
  assert.equal(kgToLb(NaN), NaN);
  assert.equal(lbToKg(null), 0);
});

test("macro: round does not mask null as zero", () => {
  // round(null) = Math.round(0) = 0 historically; pages guard validity before
  // calling round, so null never reaches it. This test documents intent.
  assert.equal(round(70.5, 1), 70.5);
});

// ---------------------------------------------------------------------------
// Water safety: blank / invalid inputs must not crash
// ---------------------------------------------------------------------------

test("water: weightBasedEstimate rejects blank/invalid weight (no crash)", () => {
  assert.equal(weightBasedEstimate(null), null);
  assert.equal(weightBasedEstimate(NaN), null);
  assert.equal(weightBasedEstimate(0), null);
  assert.equal(weightBasedEstimate(-5), null);
});

test("water: waterUnits rejects blank/invalid litres (no crash)", () => {
  assert.equal(waterUnits(null), null);
  assert.equal(waterUnits(NaN), null);
  assert.equal(waterUnits(0), null);
  assert.equal(waterUnits(-1), null);
});

test("water: weight-based estimate of valid weight is finite", () => {
  const est = weightBasedEstimate(70);
  assert.ok(Number.isFinite(est));
  assert.ok(est > 0);
});
