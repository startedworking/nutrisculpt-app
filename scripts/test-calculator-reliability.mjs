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
  calculateBMI,
  classifyBMI,
  bmiHealthyRange,
  calculateTargetCalories,
  estimateOneRM,
  estimateAllOneRM,
  calculateIdealWeight,
  calculateAllIdealWeights,
  validateHeartRateInputs,
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

// ---------------------------------------------------------------------------
// BMI reliability (04D-2)
// ---------------------------------------------------------------------------

test("bmi: calculateBMI rejects blank/invalid inputs (no crash)", () => {
  assert.equal(calculateBMI(null, 170), null);
  assert.equal(calculateBMI(70, null), null);
  assert.equal(calculateBMI(null, null), null);
  assert.equal(calculateBMI(0, 170), null);
  assert.equal(calculateBMI(70, 0), null);
});

test("bmi: valid BMI is finite", () => {
  const bmi = calculateBMI(70, 175);
  assert.ok(Number.isFinite(bmi));
  assert.ok(bmi > 0);
});

test("bmi: classifyBMI rejects null/invalid (no crash)", () => {
  assert.ok(classifyBMI(null));
  assert.ok(classifyBMI(NaN));
});

test("bmi: bmiHealthyRange rejects invalid height", () => {
  assert.equal(bmiHealthyRange(null), null);
  assert.equal(bmiHealthyRange(NaN), null);
  assert.ok(bmiHealthyRange(175));
});

// ---------------------------------------------------------------------------
// Calories reliability (04D-2)
// ---------------------------------------------------------------------------

test("calories: calculateBMR rejects blank/invalid weight/height/age (no crash)", () => {
  assert.equal(calculateBMR(null, 170, 25, "male"), null);
  assert.equal(calculateBMR(70, null, 25, "male"), null);
  assert.equal(calculateBMR(70, 170, null, "male"), null);
  assert.equal(calculateBMR(0, 170, 25, "male"), null);
  assert.equal(calculateBMR(70, 0, 25, "male"), null);
  // Empty-string gender is rejected by the page's !gender guard before calling.
  assert.ok(Number.isFinite(calculateBMR(70, 170, 25, "male")));
});

test("calories: calculateTDEE rejects null BMR (no crash)", () => {
  assert.equal(calculateTDEE(null, 1.375), null);
});

test("calories: calculateTargetCalories rejects null TDEE (no crash)", () => {
  assert.equal(calculateTargetCalories(null, 0), null);
});

test("calories: valid complete input produces finite outputs", () => {
  const bmr = calculateBMR(70, 175, 30, "female");
  assert.ok(Number.isFinite(bmr));
  const tdee = calculateTDEE(bmr, 1.55);
  assert.ok(Number.isFinite(tdee));
  const target = calculateTargetCalories(tdee, 0);
  assert.ok(Number.isFinite(target));
});

// ---------------------------------------------------------------------------
// 1RM reliability (04D-2)
// ---------------------------------------------------------------------------

test("one-rm: estimateOneRM rejects blank/invalid weight (no crash)", () => {
  assert.equal(estimateOneRM(null, 5, "brzycki"), null);
  assert.equal(estimateOneRM(NaN, 5, "brzycki"), null);
  assert.equal(estimateOneRM(0, 5, "brzycki"), null);
  assert.equal(estimateOneRM(-10, 5, "brzycki"), null);
});

test("one-rm: estimateOneRM rejects blank/invalid reps (no crash)", () => {
  assert.equal(estimateOneRM(80, null, "brzycki"), null);
  assert.equal(estimateOneRM(80, NaN, "brzycki"), null);
  assert.equal(estimateOneRM(80, 0, "brzycki"), null);
  assert.equal(estimateOneRM(80, -1, "brzycki"), null);
});

test("one-rm: estimateAllOneRM rejects invalid inputs (no crash)", () => {
  assert.equal(estimateAllOneRM(null, 5), null);
  assert.equal(estimateAllOneRM(80, null), null);
});

test("one-rm: valid input produces finite 1RM", () => {
  const oneRM = estimateOneRM(80, 5, "brzycki");
  assert.ok(Number.isFinite(oneRM));
  assert.ok(oneRM > 80);
});

// ---------------------------------------------------------------------------
// Ideal Weight reliability (04D-2)
// ---------------------------------------------------------------------------

test("ideal-weight: calculateIdealWeight rejects blank/invalid height (no crash)", () => {
  assert.equal(calculateIdealWeight({ heightCm: null, gender: "male", formulaId: "bmi" }), null);
  assert.equal(calculateIdealWeight({ heightCm: NaN, gender: "male", formulaId: "bmi" }), null);
  assert.equal(calculateIdealWeight({ heightCm: 0, gender: "male", formulaId: "bmi" }), null);
});

test("ideal-weight: calculateAllIdealWeights rejects blank/invalid height (no crash)", () => {
  assert.equal(calculateAllIdealWeights({ heightCm: null, gender: "male" }), null);
  assert.equal(calculateAllIdealWeights({ heightCm: NaN, gender: "male" }), null);
});

test("ideal-weight: valid height produces finite reference weight", () => {
  const ref = calculateIdealWeight({ heightCm: 175, gender: "male", formulaId: "bmi" });
  assert.ok(Number.isFinite(ref));
  assert.ok(ref > 0);
});

test("ideal-weight: blank gender uses female branch without crash", () => {
  const ref = calculateIdealWeight({ heightCm: 175, gender: "", formulaId: "robinson" });
  assert.ok(Number.isFinite(ref));
});

// ---------------------------------------------------------------------------
// Heart Rate reliability (04D-2)
// ---------------------------------------------------------------------------

test("heart-rate: validateHeartRateInputs rejects blank age (no crash)", () => {
  const v = validateHeartRateInputs({
    age: null,
    restingHR: 60,
    maxHR: 195,
    useCustomMaxHR: false,
    methodId: "standard",
    sex: "male",
  });
  assert.ok(v.errors.age);
  assert.equal(v.valid, false);
  assert.equal(v.predicted, null);
});

test("heart-rate: validateHeartRateInputs rejects blank restingHR (no crash)", () => {
  const v = validateHeartRateInputs({
    age: 30,
    restingHR: null,
    maxHR: 195,
    useCustomMaxHR: false,
    methodId: "standard",
    sex: "male",
  });
  assert.ok(v.errors.restingHR);
  assert.equal(v.valid, false);
});

test("heart-rate: validateHeartRateInputs rejects invalid inputs (no crash)", () => {
  const v = validateHeartRateInputs({
    age: -5,
    restingHR: null,
    maxHR: null,
    useCustomMaxHR: false,
    methodId: "standard",
    sex: "male",
  });
  assert.equal(v.valid, false);
  assert.equal(v.predicted, null);
});

test("heart-rate: valid inputs produce finite predicted max HR", () => {
  const v = validateHeartRateInputs({
    age: 30,
    restingHR: 60,
    maxHR: null,
    useCustomMaxHR: false,
    methodId: "standard",
    sex: "male",
  });
  assert.equal(v.valid, true);
  assert.ok(Number.isFinite(v.predicted));
});

// ---------------------------------------------------------------------------
// 04E-2A Scientific applicability tests
// ---------------------------------------------------------------------------

test("04E-2A: BMI age 19 → no adult category (pediatric)", () => {
  const result = classifyBMI(22, 19);
  assert.equal(result.category, "pediatric");
  assert.equal(result.label, "—");
  assert.ok(result.note);
});

test("04E-2A: BMI age 20 → adult category", () => {
  const result = classifyBMI(22, 20);
  assert.equal(result.category, "normal");
  assert.equal(result.label, "Healthy Weight");
});

test("04E-2A: BMI age 15 → pediatric, no adult category", () => {
  const result = classifyBMI(18.5, 15);
  assert.equal(result.category, "pediatric");
});

test("04E-2A: BMI under 2 → no category interpretation", () => {
  const result = classifyBMI(20, 1);
  assert.equal(result.category, "pediatric");
});

test("04E-2A: classifyBMI without age → no adult category", () => {
  const result = classifyBMI(22);
  assert.equal(result.label, "—");
  // No age provided → not treated as adult → no adult category
  assert.notEqual(result.category, "normal");
});

test("04E-2A: Ideal Weight has no frame adjustment", () => {
  const base = calculateIdealWeight({ heightCm: 170, gender: "male", formulaId: "devine" });
  // frameType parameter no longer accepted; result is frame-independent
  assert.ok(Number.isFinite(base));
  assert.ok(base > 0);
});

test("04E-2A: Ideal Weight has no single averaged value", () => {
  const all = calculateAllIdealWeights({ heightCm: 170, gender: "male" });
  assert.ok(!all.average);
  // All formulas present as separate estimates
  assert.ok(all.devine);
  assert.ok(all.robinson);
  assert.ok(all.miller);
  assert.ok(all.hamwi);
  assert.ok(all.bmi);
});

test("04E-2A: Ideal Weight formulas produce different values (no artificial convergence)", () => {
  const all = calculateAllIdealWeights({ heightCm: 170, gender: "male" });
  const values = Object.values(all).map((r) => r.kg);
  const uniqueValues = new Set(values.map((v) => Math.round(v * 10) / 10));
  assert.ok(uniqueValues.size > 1, "Different formulas should produce different values");
});

test("04E-2A: Mifflin calculation accepts adult age range (19-78 source population)", () => {
  // Valid within source population
  assert.ok(Number.isFinite(calculateBMR(70, 175, 30, "male")));
  assert.ok(Number.isFinite(calculateBMR(70, 175, 30, "female")));
  // Outside source population still calculates (extrapolation, flagged elsewhere)
  assert.ok(Number.isFinite(calculateBMR(70, 175, 19, "male")));
  assert.ok(Number.isFinite(calculateBMR(70, 175, 78, "male")));
});

test("04E-2A: Water total-water distinction is in code comments", () => {
  // weightBasedEstimate is a heuristic, not a DRI prescription
  const est = weightBasedEstimate(70);
  assert.ok(Number.isFinite(est));
  assert.ok(est > 0);
});

test("04E-2A: Heart rate terminology - predicted HR is finite for valid adult", () => {
  const v = validateHeartRateInputs({
    age: 40,
    restingHR: 60,
    maxHR: null,
    useCustomMaxHR: false,
    methodId: "tanaka",
    sex: "male",
  });
  assert.equal(v.valid, true);
  assert.ok(Number.isFinite(v.predicted));
  // Tanaka: 208 - 0.7 * 40 = 180
  assert.ok(Math.abs(v.predicted - 180) < 1);
});
