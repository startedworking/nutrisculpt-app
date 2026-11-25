"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import InputField from "@/components/atoms/InputField";
import UnitToggle from "@/components/pages/bmi/UnitToggle";
import ShareButton from "@/components/atoms/ShareButton";
import ResultCard from "@/components/atoms/ResultCard";
import ResultExplanation from "@/components/atoms/ResultExplanation";
import HealthDisclaimer from "@/components/atoms/HealthDisclaimer";
import { useShareableImage } from "@/hooks/useShareableImage";
import CalculatorNextStep from "@/components/atoms/CalculatorNextStep";
import {
  calculateIdealWeight,
  calculateAllIdealWeights,
  idealWeightHealthyRange,
  historicalFormulasApplicable,
  parseFiniteNumber,
  kgToLb,
} from "@/lib/calculators";

// Utility functions
const round = (value, digits = 1) => {
  const p = Math.pow(10, digits);
  return Math.round(value * p) / p;
};

// Consistent one-decimal display (keeps trailing zeros) for weight values.
const fmt1 = (value) => (value == null ? "" : round(value, 1).toFixed(1));

// Conversion utilities
const conversions = {
  kgToLb: (kg) => round(kg * 2.20462, 1),
  lbToKg: (lb) => round(lb / 2.20462, 1),
  cmToFtIn: (cm) => {
    const totalInches = cm / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inches = round(totalInches % 12, 1);
    return { ft, in: inches };
  },
  ftInToCm: (ft, inches) => round((ft * 12 + inches) * 2.54, 1),
};

// Body frame types were previously offered for UI selection, but frame-size
// adjustments (±10%) have no defensible primary scientific source and are
// not applied to any reference-weight output.

export default function IdealWeightCalculator() {
  const [unitSystem, setUnitSystem] = useState("metric");
  // No calculation-affecting defaults: every input starts blank/unselected.
  const [gender, setGender] = useState("");
  const [age, setAge] = useState(null);

  // Store both metric and imperial values; null = blank / not provided.
  const [height, setHeight] = useState({ cm: null, ft: null, in: null });

  // Share functionality
  const { shareableCardRef, generateImage, generateShareData, validateResultForPrivacy } = useShareableImage('ideal-weight');

  // Adult applicability: adult BMI reference and historical adult formulas
  // are intended for ages 20 and above.
  const isAdult = Number.isFinite(age) && age >= 20;

  // Height handlers — convert only finite values; partial ft/in stays blank.
  const handleHeightChange = (value, unit) => {
    const parsed = parseFiniteNumber(value);
    if (parsed == null) {
      setHeight({ cm: null, ft: null, in: null });
      return;
    }
    if (unit === "cm") {
      const ftIn = conversions.cmToFtIn(parsed);
      setHeight({ cm: parsed, ft: ftIn.ft, in: ftIn.in });
    } else if (unit === "ft") {
      // Feet must be a whole number; inches (if present) must be 0–<12.
      const ftValid = Number.isInteger(parsed) && parsed >= 0;
      const inValid = height.in == null || (height.in >= 0 && height.in < 12);
      if (!ftValid || !inValid) {
        setHeight({ cm: null, ft: parsed, in: height.in });
        return;
      }
      const cm = conversions.ftInToCm(parsed, height.in);
      setHeight({ cm, ft: parsed, in: height.in });
    } else if (unit === "in") {
      // Inches must be at least 0 and below 12; feet must be a whole number.
      const inValid = parsed >= 0 && parsed < 12;
      const ftValid = height.ft != null && Number.isInteger(height.ft);
      if (!inValid || !ftValid) {
        setHeight({ cm: null, ft: height.ft, in: parsed });
        return;
      }
      const cm = conversions.ftInToCm(height.ft, parsed);
      setHeight({ cm, ft: height.ft, in: parsed });
    }
  };

  // Primary result: BMI-based weight-for-height reference (BMI = 22).
  // Works without sex; gated to adults (20+).
  const referenceWeight = useMemo(() => {
    if (!isAdult || height.cm == null) return null;
    return calculateIdealWeight({
      heightCm: height.cm,
      gender,
      formulaId: "bmi",
    });
  }, [isAdult, height.cm, gender]);

  // Healthy weight range (BMI 18.5-24.9). Works without sex; gated to adults.
  const healthyRange = useMemo(() => {
    if (!isAdult || height.cm == null) return null;
    return idealWeightHealthyRange(height.cm);
  }, [isAdult, height.cm]);

  // Historical formulas for educational comparison only — require explicit sex
  // and a height at/above five feet (152.4 cm). The BMI-22 key is excluded so
  // it is not duplicated in the historical list.
  const historicalWeights = useMemo(() => {
    if (
      !isAdult ||
      height.cm == null ||
      (gender !== "male" && gender !== "female") ||
      !historicalFormulasApplicable(height.cm)
    ) {
      return {};
    }
    const all = calculateAllIdealWeights({
      heightCm: height.cm,
      gender,
    });
    if (!all) return {};
    const { bmi, ...historical } = all;
    return historical;
  }, [isAdult, height.cm, gender]);

  // Historical formulas are suppressed below five feet (152.4 cm) because their
  // published applicability does not support extrapolation. BMI-based outputs
  // remain available.
  const historicalSuppressed =
    isAdult && height.cm != null && !historicalFormulasApplicable(height.cm);

  // Present formulas as separate reference estimates (no single averaged value)
  const historicalList = useMemo(() => {
    if (!historicalWeights || Object.keys(historicalWeights).length === 0) return {};
    return historicalWeights;
  }, [historicalWeights]);

  // Prepare share data for ideal weight results
  const shareResult = useMemo(() => {
    if (!referenceWeight || !healthyRange) return null;

    const rangeValue = unitSystem === 'metric'
      ? `${fmt1(healthyRange.min.kg)}-${fmt1(healthyRange.max.kg)}`
      : `${fmt1(healthyRange.min.lb)}-${fmt1(healthyRange.max.lb)}`;

    return validateResultForPrivacy({
      value: rangeValue,
      unit: unitSystem === 'metric' ? 'kg' : 'lbs',
      healthyRange: rangeValue,
      // referenceWeight is always kilograms; convert the secondary BMI-22
      // reference point for Imperial display before final rounding.
      referencePoint: round(
        unitSystem === 'metric' ? referenceWeight : kgToLb(referenceWeight),
        1
      ),
    }, ['height', 'age', 'gender']); // Exclude sensitive input data
  }, [referenceWeight, healthyRange, unitSystem, validateResultForPrivacy]);

  const shareData = useMemo(() => {
    if (!shareResult) return null;
    return generateShareData(shareResult);
  }, [shareResult, generateShareData]);

  const handleGenerateImage = async () => {
    if (!shareResult) throw new Error('No results to share');
    return await generateImage();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 text-center"
      >
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Reference Weight Estimates
        </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            Historical population-level reference formulas, not a personal target weight
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Different formulas can produce different values. Enter your own data for reference estimates.
          </p>
      </motion.div>

      {/* Input Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
      >
        {/* Unit System Selector */}
        <div className="mb-6 flex justify-center">
          <UnitToggle unitSystem={unitSystem} onUnitChange={setUnitSystem} />
        </div>

        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            {/* Sex Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sex Used by Historical Formulas
              </label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The historical Devine, Robinson, Miller and Hamwi equations use
                male/female-specific constants. The BMI-based adult reference
                range does not require sex.
              </p>
              <div className="flex gap-4">
                {["male", "female"].map((g) => (
                  <label key={g} className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={(e) => setGender(e.target.value)}
                      className="mr-2 h-4 w-4 text-blue-600"
                    />
                    <span className="capitalize text-sm font-medium">
                      {g}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Age */}
            <InputField
              label="Age"
              value={age == null ? "" : age}
              onChange={(value) => setAge(parseFiniteNumber(value))}
              type="number"
              placeholder="25"
              min="1"
              max="120"
            />

            {/* Height */}
            {unitSystem === "metric" ? (
              <InputField
                label="Height (cm)"
                value={height.cm == null ? "" : height.cm}
                onChange={(value) => handleHeightChange(value, "cm")}
                type="number"
                placeholder="170"
                min="1"
              />
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  <InputField
                    label="Height (ft)"
                    value={height.ft == null ? "" : height.ft}
                    onChange={(value) => handleHeightChange(value, "ft")}
                    type="number"
                    placeholder="5"
                    min="1"
                  />
                </div>
                <div className="flex-1">
                  <InputField
                    label="Height (in)"
                    value={height.in == null ? "" : height.in}
                    onChange={(value) => handleHeightChange(value, "in")}
                    type="number"
                    placeholder="7"
                    min="0"
                    max="11"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Results Section */}
      {Number.isFinite(age) && age < 20 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
        >
          <div className="text-center">
            <h3 className="mb-3 text-lg font-semibold">
              Reference Weight Not Available for Your Age
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              These reference-weight estimates use adult BMI and historical
              adult formulas and are intended for ages 20 and above.
            </p>
          </div>
        </motion.div>
      )}
      {referenceWeight && (
        <>
          {/* Primary Result: Healthy Weight Range (BMI 18.5–24.9) */}
          {healthyRange && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 rounded-xl bg-gradient-to-r from-emerald-100 to-blue-100 p-6 text-center shadow-lg dark:from-emerald-900/30 dark:to-blue-900/30"
            >
              <h3 className="mb-4 text-lg font-semibold">
                Weight-for-Height Reference Range
              </h3>
              <p className="text-5xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {unitSystem === "metric"
                  ? `${fmt1(healthyRange.min.kg)} - ${fmt1(healthyRange.max.kg)} kg`
                  : `${fmt1(healthyRange.min.lb)} - ${fmt1(healthyRange.max.lb)} lbs`}
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Population-level reference (BMI 18.5 to under 25), not an
                individualized target. The upper weight bound is exclusive.
              </p>
            </motion.div>
          )}

          {/* BMI 22 reference point (educational) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
          >
            <h3 className="mb-4 text-center text-lg font-semibold">
              BMI 22 Reference Point
            </h3>
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-700 dark:text-gray-300">
                {unitSystem === "metric"
                  ? `${fmt1(referenceWeight)} kg`
                  : `${fmt1(kgToLb(referenceWeight))} lbs`}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                An illustrative weight corresponding to a BMI of 22 at your
                entered height. This is not a recommended target weight.
              </p>
            </div>
          </motion.div>

          {/* Educational explanation */}
          <div className="mt-6">
            <ResultExplanation
              whatItMeans={
                <>
                  The weight-for-height reference range for your height is{" "}
                  {unitSystem === "metric"
                    ? `${fmt1(healthyRange.min.kg)} - ${fmt1(healthyRange.max.kg)} kg`
                    : `${fmt1(healthyRange.min.lb)} - ${fmt1(healthyRange.max.lb)} lbs`}
                  , based on the adult healthy BMI interval 18.5 to under 25
                  (the upper bound is exclusive). The BMI 22 reference point
                  corresponds to approximately{" "}
                  {unitSystem === "metric"
                    ? fmt1(referenceWeight)
                    : fmt1(kgToLb(referenceWeight))}{" "}
                  {unitSystem === "metric" ? "kg" : "lbs"}.
                </>
              }
              whyItMatters={
                <>
                  This is a population-based reference. Individual healthy
                  weight varies with body composition, muscle mass, bone
                  density, and other factors. Use it as a general guide, not
                  a prescribed target.
                </>
              }
              limitations={
                <>
                  Weight-for-height references do not account for individual
                  body composition or health circumstances. Historical
                  equations (Robinson, Miller, Devine, Hamwi) may produce
                  different numbers because they use different assumptions
                  and were derived from specific populations. They are shown
                  below for educational comparison only.
                </>
              }
            />
          </div>

          {/* Historical formula applicability note (below five feet) */}
          {historicalSuppressed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-8 rounded-xl bg-white p-6 text-center shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Historical formulas are not displayed for this height because
                their applicability is limited. The BMI-based reference range and
                BMI 22 reference point above still apply.
              </p>
            </motion.div>
          )}

          {/* Historical formula comparison (educational context only) */}
          {Object.keys(historicalList).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-8 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
            >
              <h3 className="mb-6 text-center text-lg font-semibold">
                Historical Estimation Formulas (Educational Context)
              </h3>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
                These historical equations are presented for educational
                comparison only. They are not scientifically validated
                individualized targets and should not be used as personal
                weight goals. They may disagree with the BMI-based reference
                because they were derived from different populations and
                use different formulas.
              </p>
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(historicalList).map(([formula, result]) => (
                  <div
                    key={formula}
                    className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-700/50"
                  >
                    <h5 className="mb-2 font-semibold capitalize text-xs">
                      {formula.charAt(0).toUpperCase() + formula.slice(1)}{" "}
                      Formula
                    </h5>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {unitSystem === "metric" ? fmt1(result.kg) : fmt1(result.lb)}
                      <span className="text-sm font-normal ml-1">
                        {unitSystem === "metric" ? "kg" : "lbs"}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="mt-8 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-6 dark:from-purple-900/20 dark:to-pink-900/20"
      >
        <h3 className="mb-4 text-lg font-semibold text-center">
          💡 Important Notes
        </h3>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="font-medium text-purple-600 dark:text-purple-400">
              About This Reference:
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>
                • The primary reference range uses the adult healthy BMI
                interval 18.5 to under 25; the BMI 22 reference point is
                illustrative
              </li>
              <li>
                • Historical formulas (Robinson, Miller, Devine, Hamwi) are
                shown for educational comparison only
              </li>
              <li>
                • Frame-size adjustments are not scientifically validated as
                individualized targets
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-pink-600 dark:text-pink-400">
              Remember:
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Health is more than just weight</li>
              <li>• Focus on overall fitness and well-being</li>
              <li>• Consult healthcare professionals for personalized advice</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Health Disclaimer */}
      <div className="mt-6">
        <HealthDisclaimer
          universalDisclaimer={
            <>
              The results provided are estimates based on general population
              formulas and the information you have entered. They are
              intended for general educational and fitness guidance, not as a
              substitute for professional medical advice. Individual
              requirements may vary depending on age, body composition,
              activity level, lifestyle, health status and other personal
              factors. These values should be treated as a starting reference,
              not fixed targets. Health Notice: If you have an existing medical
              condition, metabolic disorder, are taking medication, are
              pregnant, or have specific dietary or exercise restrictions,
              consult a qualified healthcare professional before making
              changes to your diet, hydration or exercise routine. Remember:
              Your fitness journey is individual. Use these results as a
              starting point and adjust your approach based on your body&apos;s
              response and professional guidance.
            </>
          }
          specificCaution={
            <>
              Reference-weight estimates do not account fully for individual
              body composition, muscle mass or health status. Do not use this
              result as the sole measure of health or as a reason to pursue
              unnecessary weight changes.
            </>
          }
        />
      </div>

      {/* Enhanced Interactive Result Card Preview */}
      {shareResult && (
        <div className="mt-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Your Shareable Result
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Interactive fitness-inspired result card with animations
            </p>
          </div>
          <div className="flex justify-center px-2 sm:px-4">
            <div className="w-full max-w-xs sm:max-w-sm transform hover:scale-105 transition-transform duration-300">
              <ResultCard
                type="idealWeight"
                value={shareResult.value}
                unit={shareResult.unit}
                category="Weight-for-height reference"
                details={[
                  {
                    label: "BMI 22 reference",
                    value: `${fmt1(shareResult.referencePoint)} ${shareResult.unit}`,
                  },
                ]}
                aspectRatio="square"
              />
            </div>
          </div>
          <div className="text-center mt-6">
            <ShareButton
              onGenerateImage={handleGenerateImage}
              shareData={shareData}
              variant="secondary"
              className="mx-auto"
            />
          </div>
        </div>
      )}

      {/* Calculator Next Step */}
      <CalculatorNextStep calculatorId="ideal-weight" />

      {/* Hidden Shareable Card for Image Generation */}
      {shareResult && (
        <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none">
          <ResultCard
            ref={shareableCardRef}
            type="idealWeight"
            value={shareResult.value}
            unit={shareResult.unit}
            category="Weight-for-height reference"
            details={[
              {
                label: "BMI 22 reference",
                value: `${fmt1(shareResult.referencePoint)} ${shareResult.unit}`,
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
