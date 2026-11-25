import test from "node:test";
import assert from "node:assert/strict";

import {
  round,
  kgToLb,
  bmiHealthyRange,
  classifyBMI,
  historicalFormulasApplicable,
  resolveExerciseName,
  customTrainingLoad,
  fitnessProteinGramsPerKg,
  evaluateFitnessProtein,
} from "../lib/calculators.mjs";

// ---------------------------------------------------------------------------
// Custom exercise name resolution
// ---------------------------------------------------------------------------

test("resolveExerciseName: trims custom names and rejects whitespace-only", () => {
  assert.equal(resolveExerciseName("Other", "  Leg Press  "), "Leg Press");
  assert.equal(resolveExerciseName("Other", "   "), "Custom Exercise");
  assert.equal(resolveExerciseName("Other", ""), "Custom Exercise");
  assert.equal(resolveExerciseName("Squat", "Leg Press"), "Squat");
  assert.equal(resolveExerciseName("", ""), "");
});

// ---------------------------------------------------------------------------
// Custom training load (raw 1RM × percentage)
// ---------------------------------------------------------------------------

test("customTrainingLoad: uses the raw 1RM and valid percentages", () => {
  assert.equal(customTrainingLoad(100, 75), 75);
  // Raw (unrounded) 1RM is preserved: 106.6667 × 100% = 106.6667, not 107.
  assert.equal(customTrainingLoad(106.6667, 100), 106.6667);
  assert.ok(Math.abs(customTrainingLoad(106.6667, 75) - 80.000025) < 1e-9);
});

test("customTrainingLoad: rejects invalid percentages and inputs", () => {
  assert.equal(customTrainingLoad(100, 20), null); // below 30
  assert.equal(customTrainingLoad(100, 120), null); // above 100
  assert.equal(customTrainingLoad(100, NaN), null);
  assert.equal(customTrainingLoad(100, Infinity), null);
  assert.equal(customTrainingLoad(0, 75), null);
  assert.equal(customTrainingLoad(NaN, 75), null);
});

test("customTrainingLoad: Metric/Imperial conversion agrees", () => {
  const loadKg = customTrainingLoad(100, 75); // 75 kg
  assert.equal(round(kgToLb(loadKg), 1), round(kgToLb(75), 1));
});

// ---------------------------------------------------------------------------
// Reference Weight BMI boundaries
// ---------------------------------------------------------------------------

test("bmiHealthyRange: upper weight bound uses the exclusive BMI 25 boundary", () => {
  const range = bmiHealthyRange(170);
  // 18.5 × 1.7² = 53.465 → 53.5; 25 × 1.7² = 72.25 → 72.3 (was 72.0 at 24.9).
  assert.equal(range.min.kg, 53.5);
  assert.equal(range.max.kg, 72.3);
  assert.equal(range.maxExclusive, true);
});

test("classifyBMI: BMI 25 is Overweight, not Healthy", () => {
  assert.equal(classifyBMI(25, 30).category, "overweight");
  assert.equal(classifyBMI(24.9, 30).category, "normal");
  assert.equal(classifyBMI(18.5, 30).category, "normal");
  assert.equal(classifyBMI(18.4, 30).category, "underweight");
});

// ---------------------------------------------------------------------------
// Historical formula applicability
// ---------------------------------------------------------------------------

test("historicalFormulasApplicable: suppressed below five feet (152.4 cm)", () => {
  assert.equal(historicalFormulasApplicable(152.4), true);
  assert.equal(historicalFormulasApplicable(170), true);
  assert.equal(historicalFormulasApplicable(152.3), false);
  assert.equal(historicalFormulasApplicable(140), false);
});

// ---------------------------------------------------------------------------
// Raw protein g/kg classification (before display rounding)
// ---------------------------------------------------------------------------

test("fitnessProteinGramsPerKg: classifies the raw ratio, not rounded grams", () => {
  // Raw protein g/kg = 1.396 (below 1.4) but rounded grams (98) / 70 = 1.4.
  const rawPerKg = fitnessProteinGramsPerKg(1563.52, 25, 70);
  assert.ok(Math.abs(rawPerKg - 1.396) < 1e-9);
  assert.equal(evaluateFitnessProtein(rawPerKg), "below");

  const roundedGrams = Math.round((1563.52 * 0.25) / 4); // 98
  const roundedPerKg = roundedGrams / 70; // 1.4
  assert.equal(evaluateFitnessProtein(roundedPerKg), "within");
  assert.notEqual(
    evaluateFitnessProtein(rawPerKg),
    evaluateFitnessProtein(roundedPerKg),
    "gram rounding would misclassify the boundary"
  );
});

test("fitnessProteinGramsPerKg: rejects invalid inputs", () => {
  assert.equal(fitnessProteinGramsPerKg(0, 25, 70), null);
  assert.equal(fitnessProteinGramsPerKg(2000, 25, 0), null);
  assert.equal(fitnessProteinGramsPerKg(2000, NaN, 70), null);
});