import test from "node:test";
import assert from "node:assert/strict";

import {
  round,
  calculateMacros,
  isValidMacroDistribution,
  distributeMeals,
  evaluateFitnessProtein,
  MACRO_PRESETS,
} from "../lib/calculators.mjs";

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Meal distribution helper
// ---------------------------------------------------------------------------

test("distributeMeals: 125 g protein across 3 meals reconciles to 125", () => {
  const meals = distributeMeals(125, 3);
  assert.deepEqual(meals, [42, 42, 41]);
  assert.equal(sum(meals), 125);
});

test("distributeMeals: 225 g carbs across 3 meals is even", () => {
  const meals = distributeMeals(225, 3);
  assert.deepEqual(meals, [75, 75, 75]);
  assert.equal(sum(meals), 225);
});

test("distributeMeals: 67 g fat across 3 meals reconciles to 67", () => {
  const meals = distributeMeals(67, 3);
  assert.deepEqual(meals, [23, 22, 22]);
  assert.equal(sum(meals), 67);
});

test("distributeMeals: counts 2 through 6 reconcile with the daily total", () => {
  for (const count of [2, 3, 4, 5, 6]) {
    for (const total of [0, 1, 7, 125, 225, 67, 200]) {
      const meals = distributeMeals(total, count);
      assert.ok(Array.isArray(meals), `count ${count} total ${total}`);
      assert.equal(meals.length, count);
      assert.equal(sum(meals), total, `count ${count} total ${total}`);
    }
  }
});

test("distributeMeals: invalid meal counts are rejected", () => {
  for (const bad of [0, 13, 2.5, "3", null, undefined, NaN]) {
    assert.equal(distributeMeals(100, bad), null, `meal count ${String(bad)}`);
  }
});

test("distributeMeals: zero and invalid totals handled safely", () => {
  assert.deepEqual(distributeMeals(0, 3), [0, 0, 0]);
  assert.equal(distributeMeals(-5, 3), null);
  assert.equal(distributeMeals(NaN, 3), null);
  assert.equal(distributeMeals(Infinity, 3), null);
});

// ---------------------------------------------------------------------------
// Custom macro distribution validation
// ---------------------------------------------------------------------------

test("isValidMacroDistribution: accepts valid splits including decimals", () => {
  assert.equal(isValidMacroDistribution({ protein: 25, carbs: 45, fat: 30 }), true);
  assert.equal(
    isValidMacroDistribution({ protein: 33.4, carbs: 33.3, fat: 33.3 }),
    true
  );
  // Floating-point-tolerant total.
  assert.equal(
    isValidMacroDistribution({ protein: 10, carbs: 45, fat: 45.0000000001 }),
    true
  );
});

test("isValidMacroDistribution: rejects invalid splits", () => {
  assert.equal(isValidMacroDistribution({ protein: 25, carbs: 45, fat: 40 }), false); // 110
  assert.equal(isValidMacroDistribution({ protein: 25, carbs: 45, fat: null }), false); // missing
  assert.equal(isValidMacroDistribution({ protein: -5, carbs: 60, fat: 45 }), false); // negative
  assert.equal(isValidMacroDistribution({ protein: 150, carbs: 45, fat: 30 }), false); // > 100
  assert.equal(isValidMacroDistribution(null), false);
});

// ---------------------------------------------------------------------------
// Full-precision EER into macro calculation (premature-rounding regression)
// ---------------------------------------------------------------------------

test("calculateMacros uses full-precision energy (detects premature EER rounding)", () => {
  // Raw EER 2415.3 → fat 81 g; rounding EER to 2415 first → fat 80 g.
  const rawEER = 2414.6;
  const roundedEER = round(rawEER, 0); // 2415
  const balanced = { protein: 25, carbs: 45, fat: 30 };

  const fromRaw = calculateMacros(rawEER, balanced);
  const fromRounded = calculateMacros(roundedEER, balanced);

  assert.equal(fromRaw.fat.grams, 80);
  assert.equal(fromRounded.fat.grams, 81);
  assert.notEqual(
    fromRaw.fat.grams,
    fromRounded.fat.grams,
    "rounding EER before calculateMacros changes the result"
  );
});

test("Transformation and standalone Macro Balanced results are identical", () => {
  const rawEER = 2451.6;
  const balanced = MACRO_PRESETS.find((p) => p.name === "Balanced");
  const a = calculateMacros(rawEER, balanced);
  const b = calculateMacros(rawEER, { protein: 25, carbs: 45, fat: 30 });
  assert.deepEqual(a, b);
});

// ---------------------------------------------------------------------------
// Protein g/kg reference classification before display rounding
// ---------------------------------------------------------------------------

test("evaluateFitnessProtein classifies on the unrounded ratio", () => {
  assert.equal(evaluateFitnessProtein(1.35), "below"); // displays 1.4 but is below
  assert.equal(evaluateFitnessProtein(1.4), "within");
  assert.equal(evaluateFitnessProtein(2.0), "within");
  assert.equal(evaluateFitnessProtein(2.04), "above"); // displays 2.0 but is above
});

test("protein g/kg display rounding does not change classification", () => {
  const rawBelow = 1.35;
  const rawAbove = 2.04;
  assert.equal(round(rawBelow, 1), 1.4);
  assert.equal(evaluateFitnessProtein(rawBelow), "below");
  assert.equal(round(rawAbove, 1), 2.0);
  assert.equal(evaluateFitnessProtein(rawAbove), "above");
});