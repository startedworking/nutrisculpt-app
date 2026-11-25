
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
  round,
  kgToLb,
  lbToKg,
  ONE_RM_FORMULAS,
  PRIMARY_ONE_RM_ID,
  estimateOneRM,
  estimateAllOneRM,
  oneRmReliability,
  evaluateOneRmInputPolicy,
  parseFiniteNumber,
  resolveExerciseName,
  customTrainingLoad,
} from "@/lib/calculators.mjs";

// Training percentage ranges.
//
// Repetition ranges are approximate population means from a 2023 meta-regression
// (Nuzzo et al., Sports Medicine) and the long-standing repetition-maximum table.
// They describe what is often achievable, not what a given person will achieve.
// The same relative load does not guarantee a fixed training outcome.
const TRAINING_PERCENTAGES = [
  { percentage: 50, reps: "20–30+", purpose: "Endurance / technique", color: "text-green-600 dark:text-green-400" },
  { percentage: 60, reps: "15–22", purpose: "Muscular Endurance", color: "text-emerald-600 dark:text-emerald-400" },
  { percentage: 70, reps: "11–16", purpose: "Hypertrophy range", color: "text-blue-600 dark:text-blue-400" },
  { percentage: 80, reps: "8–11", purpose: "Strength", color: "text-purple-600 dark:text-purple-400" },
  { percentage: 90, reps: "4–6", purpose: "Maximal strength", color: "text-orange-600 dark:text-orange-400" },
  { percentage: 95, reps: "2–3", purpose: "Maximal strength", color: "text-red-600 dark:text-red-400" },
];

// Exercise categories
const EXERCISE_CATEGORIES = [
  "Squat",
  "Bench Press",
  "Deadlift",
  "Overhead Press",
  "Row",
  "Pull-up/Chin-up",
  "Other"
];

export default function OneRMCalculator() {
  const [unitSystem, setUnitSystem] = useState("metric");
  // No default exercise: the selection provides context only and never changes
  // the prediction equation. Blank until the user chooses.
  const [exercise, setExercise] = useState("");
  const [customExercise, setCustomExercise] = useState("");
  const [reps, setReps] = useState(null);
  // Custom training-load percentage. This is an initial calculator setting
  // (70%), not a recommended training intensity.
  const [customPct, setCustomPct] = useState(70);

  // Store both metric and imperial values; null = blank / not provided.
  const [weight, setWeight] = useState({ kg: null, lb: null });

  // Share functionality
  const { shareableCardRef, generateImage, generateShareData, validateResultForPrivacy } = useShareableImage('one-rm');

  // Weight handlers — convert only finite values; blank clears the pair. The
  // canonical kilogram value is stored at full precision (no premature
  // rounding); display rounding happens only at the presentation boundary.
  const handleWeightChange = (value, unit) => {
    const parsed = parseFiniteNumber(value);
    if (parsed == null) {
      setWeight({ kg: null, lb: null });
      return;
    }
    if (unit === "kg") {
      setWeight({ kg: parsed, lb: round(kgToLb(parsed), 1) });
    } else {
      setWeight({ kg: lbToKg(parsed), lb: parsed });
    }
  };

  // Resolved exercise label used consistently across results, explanation,
  // share preview, PNG and share text. Never rendered as HTML.
  const resolvedExercise = resolveExerciseName(exercise, customExercise);
  const shareExercise = resolvedExercise || "Custom Exercise";

  const weightKg = weight.kg;
  const weightValid = Number.isFinite(weightKg) && weightKg > 0;
  const repsInteger = Number.isInteger(reps);
  const policy = evaluateOneRmInputPolicy(reps);
  const repsValid = repsInteger && reps >= 1;
  const inputsValid = weightValid && repsValid && policy.allowed;

  const reliability = useMemo(
    () => (repsValid ? oneRmReliability(reps) : null),
    [repsValid, reps]
  );

  // Primary estimate: Brzycki. The internal primary value retains full
  // precision so downstream calculations (training loads) are not rounded
  // prematurely. Display and share values are rounded to whole units only at
  // the presentation boundary. The other six equations remain available as
  // educational comparison; the unweighted average is not a validated method
  // and is no longer presented as the recommended value.
  const oneRMResults = useMemo(() => {
    if (!inputsValid) return null;

    const all = estimateAllOneRM(weightKg, reps);
    const primaryValue = estimateOneRM(weightKg, reps, PRIMARY_ONE_RM_ID);
    if (!all || primaryValue === null) return null;

    const toUnitPair = (value) => ({
      kg: round(value, 0),
      lb: round(kgToLb(value), 0),
    });

    const equations = {};
    for (const formula of ONE_RM_FORMULAS) {
      const value = all[formula.id];
      if (value !== undefined) {
        equations[formula.id] = {
          ...toUnitPair(value),
          name: formula.name,
          note: formula.note,
        };
      }
    }

    const values = Object.values(all);
    const spread =
      values.length > 1
        ? { min: Math.min(...values), max: Math.max(...values) }
        : null;

    return {
      // Raw full-precision primary value; training calculations use this.
      primary: { value: primaryValue, method: PRIMARY_ONE_RM_ID },
      equations: equations,
      spread: spread
        ? { min: toUnitPair(spread.min), max: toUnitPair(spread.max) }
        : null,
    };
  }, [inputsValid, weightKg, reps]);

  // Calculate training weights based on the unrounded primary prediction.
  // Display precision for training loads may remain at one decimal, but the
  // load itself derives from the raw primary value.
  const trainingWeights = useMemo(() => {
    if (!oneRMResults) return [];

    return TRAINING_PERCENTAGES.map(({ percentage, reps: repRange, purpose, color }) => {
      const weightKgAtLoad = (oneRMResults.primary.value * percentage) / 100;
      return {
        percentage,
        reps: repRange,
        purpose,
        color,
        weight: {
          kg: round(weightKgAtLoad, 1),
          lb: round(kgToLb(weightKgAtLoad), 1),
        },
      };
    });
  }, [oneRMResults]);

  // Custom training load: raw (unrounded) estimated 1RM × selected % / 100.
  // The percentage is validated (30–100, finite); invalid input yields no load.
  const customPctValid =
    Number.isFinite(customPct) && customPct >= 30 && customPct <= 100;
  const customLoad = useMemo(() => {
    if (!oneRMResults) return null;
    const loadKg = customTrainingLoad(oneRMResults.primary.value, customPct);
    if (loadKg == null) return null;
    return { kg: round(loadKg, 1), lb: round(kgToLb(loadKg), 1) };
  }, [oneRMResults, customPct]);

  // Prepare share data for 1RM results
  const shareResult = useMemo(() => {
    if (!oneRMResults) return null;

    const primaryValue = oneRMResults.primary.value;
    return validateResultForPrivacy({
      // primaryValue is always kilograms; convert for the Imperial share so the
      // shared value and unit agree with the on-page display.
      value: round(
        unitSystem === 'metric' ? primaryValue : kgToLb(primaryValue),
        0
      ),
      unit: unitSystem === 'metric' ? 'kg' : 'lb',
      exercise: shareExercise,
      repsUsed: reps,
      method: PRIMARY_ONE_RM_ID,
    }, ['weight']); // Exclude sensitive input data
  }, [oneRMResults, unitSystem, shareExercise, reps, validateResultForPrivacy]);

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
          One Rep Max Calculator
        </h2>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          Calculate your 1RM and training percentages for strength programming
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

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Exercise Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Exercise <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <select
              value={exercise}
              onChange={(e) => {
                const value = e.target.value;
                setExercise(value);
                // Do not silently reuse a custom name after changing exercises.
                if (value !== "Other") setCustomExercise("");
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select exercise (optional)</option>
              {EXERCISE_CATEGORIES.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
            {exercise === "Other" && (
              <div className="mt-2">
                <label
                  htmlFor="custom-exercise-name"
                  className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
                >
                  Exercise Name
                </label>
                <input
                  id="custom-exercise-name"
                  type="text"
                  value={customExercise}
                  onChange={(e) => setCustomExercise(e.target.value.slice(0, 20))}
                  placeholder="e.g., Leg Press"
                  maxLength={20}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {customExercise.length}/20 characters
                </p>
              </div>
            )}
          </div>

          {/* Weight Input */}
          <InputField
            label={`Weight (${unitSystem === "metric" ? "kg" : "lbs"})`}
            value={unitSystem === "metric" ? (weight.kg == null ? "" : round(weight.kg, 1)) : (weight.lb == null ? "" : weight.lb)}
            onChange={(value) =>
              handleWeightChange(
                value,
                unitSystem === "metric" ? "kg" : "lb"
              )
            }
            type="number"
            placeholder={unitSystem === "metric" ? "80" : "176"}
            min="1"
          />

          {/* Reps Input */}
          <InputField
            label="Reps Performed"
            value={reps == null ? "" : reps}
            onChange={(value) => setReps(parseFiniteNumber(value))}
            type="number"
            placeholder="5"
            min="1"
            max="15"
            step="1"
          />
        </div>

        {/* Entered-load explanation */}
        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-900 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/40">
          <p className="font-medium">Weight used for the completed repetitions</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Barbell exercises: enter the total lifted load, including the bar.</li>
            <li>Dumbbell exercises: consistently enter either per-dumbbell or combined load and interpret the result accordingly.</li>
            <li>Machine exercises: the result relates to that machine&apos;s indicated resistance.</li>
            <li>Bodyweight exercises: added weight alone does not necessarily represent total resistance.</li>
            <li>Pull-up/Chin-up: estimating 1RM from bodyweight plus added resistance has clear limitations.</li>
          </ul>
          <p className="mt-1">No bodyweight is added automatically.</p>
        </div>

        {!weightValid && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            Enter a weight greater than 0.
          </p>
        )}
        {!repsValid && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            Enter a whole repetition count between 1 and 15.
          </p>
        )}
        {repsValid && policy.level === "unsupported" && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {policy.note}
          </p>
        )}

        {/* Disclaimer */}
        <div className="mt-6">
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/40">
            <p>
              <strong>Safety Note:</strong> This is an estimate, not a measurement. Always warm up
              properly, use proper form, and consider a spotter for heavy lifts. Beginners may
              benefit more from submaximal training and supervision than from maximal testing. Start
              conservatively and progress gradually.
            </p>
          </div>
        </div>
      </motion.div>

      {/* 1RM Results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-8 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
      >
        <h3 className="mb-6 text-center text-lg font-semibold">
          Estimated 1RM Results
        </h3>

        {!oneRMResults ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>Enter a valid weight and repetition count to calculate your 1RM.</p>
          </div>
        ) : (
          <>
            {/* Primary result */}
            <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-100 to-purple-100 p-6 text-center dark:from-blue-900/30 dark:to-purple-900/30">
              <h4 className="mb-2 text-lg font-semibold">Primary Estimate (Brzycki)</h4>
              {resolvedExercise && (
                <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {resolvedExercise}
                </p>
              )}
              <p className="text-4xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                {unitSystem === "metric"
                  ? round(oneRMResults.primary.value, 0)
                  : round(kgToLb(oneRMResults.primary.value), 0)}
                <span className="text-lg font-normal ml-1">
                  {unitSystem === "metric" ? "kg" : "lbs"}
                </span>
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {reps === 1
                  ? "Recorded load for 1 repetition (not necessarily a true maximal attempt)"
                  : `From ${reps} repetitions`}
              </p>
              {reliability && (
                <p className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                  {reliability.label}: {reliability.note}
                </p>
              )}
            </div>

            {/* Equation comparison */}
            <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(oneRMResults.equations).map(([id, result]) => (
                <div
                  key={id}
                  className={`rounded-lg p-4 text-center ${
                    id === PRIMARY_ONE_RM_ID
                      ? "bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-950/40"
                      : "bg-gray-50 dark:bg-gray-700/50"
                  }`}
                >
                  <h5 className="mb-2 font-semibold">
                    {result.name}
                    {id === PRIMARY_ONE_RM_ID && (
                      <span className="ml-1 text-xs font-normal text-blue-600 dark:text-blue-400">
                        (primary)
                      </span>
                    )}
                  </h5>
                  <p className="text-xl font-bold">
                    {unitSystem === "metric" ? result.kg : result.lb}
                    <span className="text-sm font-normal ml-1">
                      {unitSystem === "metric" ? "kg" : "lbs"}
                    </span>
                  </p>
                </div>
              ))}
            </div>

            {oneRMResults.spread && (
              <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                Equation spread:{" "}
                {unitSystem === "metric" ? oneRMResults.spread.min.kg : oneRMResults.spread.min.lb}
                –
                {unitSystem === "metric" ? oneRMResults.spread.max.kg : oneRMResults.spread.max.lb}{" "}
                {unitSystem === "metric" ? "kg" : "lbs"} across the seven equations. This is a
                descriptive comparison, not a confidence interval.
              </p>
            )}
          </>
        )}
      </motion.div>

      {/* Educational explanation */}
      {oneRMResults && (
        <div className="mt-6">
          <ResultExplanation
            whatItMeans={
              <>
                {resolvedExercise ? (
                  <>
                    For <span className="font-semibold">{resolvedExercise}</span>, you
                    recorded a load of{" "}
                  </>
                ) : (
                  <>You recorded a load of </>
                )}
                <span className="font-semibold">
                  {unitSystem === "metric"
                    ? round(weightKg, 1)
                    : round(kgToLb(weightKg), 1)}{" "}
                  {unitSystem === "metric" ? "kg" : "lbs"}
                </span>{" "}
                and completed{" "}
                <span className="font-semibold">{reps} repetitions</span>. The
                primary estimate uses the <span className="font-semibold">Brzycki</span>{" "}
                equation to predict an estimated{" "}
                <span className="font-semibold">one-repetition maximum (1RM)</span> of{" "}
                <span className="font-semibold">
                  {unitSystem === "metric"
                    ? round(oneRMResults.primary.value, 0)
                    : round(kgToLb(oneRMResults.primary.value), 0)}{" "}
                  {unitSystem === "metric" ? "kg" : "lbs"}
                </span>
                . The other six equations are shown for comparison only.
              </>
            }
            whyItMatters={
              <>
                A 1RM estimate helps you set training weights and track strength over time.
                Different relative loads are often used for different emphases, but the same load
                does not guarantee a specific outcome for every person or exercise.
              </>
            }
            limitations={
              <>
                Estimated 1RM values are predictions, not measurements. Accuracy depends on the
                exercise, testing conditions, technique, fatigue and training experience, and
                estimates become less reliable above about 10 repetitions. Different equations give
                different results; the spread is descriptive, not a confidence interval. At 1
                repetition the value is the load you recorded, not necessarily a true maximal
                attempt. These estimates are for programming education only — they are not a reason
                to attempt an unsafe maximum lift. Beginners may benefit more from submaximal
                training and supervision.
              </>
            }
          />
        </div>
      )}

      {/* Training Percentages */}
      {oneRMResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
        >
          <h3 className="mb-2 text-center text-lg font-semibold">
            Training Weight Percentages
          </h3>
          <p className="mb-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Loads are calculated from the primary (Brzycki) estimate. Repetition
            ranges are approximate population means, not guarantees; the same
            relative load does not guarantee a fixed number of repetitions and
            varies by exercise and individual.
          </p>

          <div className="space-y-3">
            {trainingWeights.map(({ percentage, reps: repRange, purpose, color, weight }) => (
              <div
                key={percentage}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className={`text-lg font-bold ${color}`}>
                      {percentage}%
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold">{purpose}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      ≈ {repRange} reps (approximate)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">
                    {unitSystem === "metric" ? weight.kg : weight.lb}
                    <span className="text-sm font-normal ml-1">
                      {unitSystem === "metric" ? "kg" : "lbs"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Custom training load */}
          <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
            <h4 className="mb-1 text-center font-semibold">
              Calculate a Custom Training Load
            </h4>
            <p className="mb-3 text-center text-xs text-gray-500 dark:text-gray-400">
              Choose a percentage of your estimated 1RM. 70% is an initial
              calculator setting, not a recommended training intensity.
            </p>
            <div className="flex items-center justify-center gap-4">
              <input
                type="range"
                min="30"
                max="100"
                step="1"
                value={customPctValid ? customPct : 70}
                onChange={(e) => setCustomPct(parseInt(e.target.value, 10))}
                className="w-full max-w-xs accent-blue-600"
                aria-label="Custom training percentage"
              />
              <input
                type="number"
                min="30"
                max="100"
                step="1"
                value={Number.isFinite(customPct) ? customPct : ""}
                onChange={(e) => setCustomPct(parseFiniteNumber(e.target.value))}
                className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                aria-label="Custom training percentage value"
              />
            </div>
            {!customPctValid && (
              <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">
                Enter a percentage between 30 and 100.
              </p>
            )}
            {customLoad && (
              <>
                <p className="mt-3 text-center text-lg font-bold">
                  {unitSystem === "metric" ? customLoad.kg : customLoad.lb}
                  <span className="text-sm font-normal ml-1">
                    {unitSystem === "metric" ? "kg" : "lbs"}
                  </span>
                </p>
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  Calculated load based on an estimated maximum, not a prescribed
                  training weight.
                </p>
              </>
            )}
            {customLoad && customPct >= 90 && (
              <p className="mt-2 text-center text-xs text-amber-700 dark:text-amber-300">
                Higher relative loads generally require greater technical
                proficiency, preparation and recovery. This calculated load is not
                a recommendation to attempt it.
                {customPct === 100
                  ? " At 100% this represents the estimated maximum, not an automatically safe or achievable attempt."
                  : ""}
              </p>
            )}
          </div>

          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Loads are a percentage of an estimated 1RM. Actual repetitions you can complete vary
            with exercise, fatigue, technique and individual physiology. Hypertrophy can occur
            across a wide range of loads, and no single percentage is required for it.
          </p>
        </motion.div>
      )}

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-8 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 p-6 dark:from-orange-900/20 dark:to-red-900/20"
      >
        <h3 className="mb-4 text-lg font-semibold text-center">
          💪 Training Tips
        </h3>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="font-medium text-blue-600 dark:text-blue-400">
              For Strength:
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Focus on 80-95% 1RM range</li>
              <li>• 3-6 reps per set</li>
              <li>• Longer rest periods (3-5 min)</li>
              <li>• Progressive overload weekly</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-purple-600 dark:text-purple-400">
              For Hypertrophy:
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Train at 65-80% 1RM</li>
              <li>• 8-15 reps per set</li>
              <li>• Hypertrophy also occurs at other loads</li>
              <li>• Moderate rest (60-90 sec)</li>
              <li>• Higher training volume</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 rounded-lg bg-red-100 p-4 dark:bg-red-900/30">
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>Important:</strong> Never attempt a true 1RM without proper preparation,
            spotters and experience. These calculations are for programming education only. If you
            are new to strength training, or have pain, injury or a medical limitation, seek
            qualified supervision rather than maximal testing.
          </p>
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
              This is an estimated strength value, not a recommendation to attempt a maximum lift.
              Accuracy depends on the exercise, testing conditions, technique, fatigue and training
              experience, and is reduced above about 10 repetitions. Beginners may benefit more
              from submaximal training and supervision. Do not attempt maximal lifts if you are
              injured, experiencing pain or medically advised against strenuous exercise.
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
                type="oneRm"
                value={shareResult.value}
                category={shareResult.exercise}
                subtitle={`Brzycki estimate from ${shareResult.repsUsed} reps`}
                aspectRatio="square"
                unit={shareResult.unit}
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
      <CalculatorNextStep calculatorId="one-rm" />

      {/* Hidden Shareable Card for Image Generation */}
      {shareResult && (
        <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none">
          <ResultCard
            ref={shareableCardRef}
            type="oneRm"
            value={shareResult.value}
            category={shareResult.exercise}
            subtitle={`Brzycki estimate from ${shareResult.repsUsed} reps`}
            unit={shareResult.unit}
          />
        </div>
      )}
    </div>
  );
}
