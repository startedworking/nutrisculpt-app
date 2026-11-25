"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import InputField from "@/components/atoms/InputField";
import ShareButton from "@/components/atoms/ShareButton";
import ResultCard from "@/components/atoms/ResultCard";
import ResultExplanation from "@/components/atoms/ResultExplanation";
import HealthDisclaimer from "@/components/atoms/HealthDisclaimer";
import { useShareableImage } from "@/hooks/useShareableImage";
import CalculatorNextStep from "@/components/atoms/CalculatorNextStep";
import {
  MAX_HR_METHODS,
  HR_INTENSITY_RANGES,
  predictMaxHR,
  validateHeartRateInputs,
  calculatePercentMaxRanges,
  calculateHrrRanges,
  methodById,
  parseFiniteNumber,
} from "@/lib/calculators.mjs";

// Training goals — qualitative advice only, not zone prescriptions.
const TRAINING_GOALS = [
  {
    goal: "Weight Loss",
    description: "Regular moderate-intensity activity alongside overall energy balance.",
    recommendation: "Weight change depends mainly on total energy balance, not on a specific heart-rate zone. Use mostly moderate sessions.",
  },
  {
    goal: "General Fitness",
    description: "Build overall cardiovascular health.",
    recommendation: "Mix easy and moderate sessions, with occasional recovery work.",
  },
  {
    goal: "Endurance",
    description: "Build aerobic capacity and endurance.",
    recommendation: "Mostly easy volume with some moderate-to-hard sessions.",
  },
  {
    goal: "Performance",
    description: "Improve speed and power.",
    recommendation: "Include higher-intensity work as tolerated and recovered.",
  },
];

export default function HeartRateZoneCalculator() {
  const [age, setAge] = useState(null);
  const [sex, setSex] = useState("");
  const [restingHR, setRestingHR] = useState(null);
  const [maxHR, setMaxHR] = useState(null);
  const [useCustomMaxHR, setUseCustomMaxHR] = useState(false);
  const [methodId, setMethodId] = useState("tanaka");
  const [selectedGoal, setSelectedGoal] = useState("General Fitness");

  // Share functionality
  const { shareableCardRef, generateImage, generateShareData, validateResultForPrivacy } = useShareableImage('heart-rate');

  const method = methodById(methodId) || MAX_HR_METHODS[0];

  // Keep the selected method valid for the chosen sex.
  const handleSexChange = (nextSex) => {
    setSex(nextSex);
    if (method.requiresSex && nextSex !== method.requiresSex) {
      setMethodId("tanaka");
    }
  };

  const validation = useMemo(
    () =>
      validateHeartRateInputs({
        age,
        restingHR,
        maxHR,
        useCustomMaxHR,
        methodId,
        sex,
      }),
    [age, restingHR, maxHR, useCustomMaxHR, methodId, sex]
  );

  // Use either custom or predicted max HR.
  const effectiveMaxHR = validation.predicted;

  // Percent-of-max-HR ranges (resting HR not required).
  const percentMaxRanges = useMemo(
    () => (validation.valid && Number.isFinite(effectiveMaxHR) ? calculatePercentMaxRanges(effectiveMaxHR) : null),
    [validation.valid, effectiveMaxHR]
  );

  // Heart-rate-reserve ranges (resting HR required).
  const hrrRanges = useMemo(
    () =>
      Number.isFinite(restingHR) && Number.isFinite(effectiveMaxHR) && effectiveMaxHR > restingHR
        ? calculateHrrRanges(effectiveMaxHR, restingHR)
        : null,
    [restingHR, effectiveMaxHR]
  );

  const goalRecommendation = TRAINING_GOALS.find((goal) => goal.goal === selectedGoal);

  // Share only privacy-safe fields: max HR, method, ranges. No age/sex/resting HR/medical info.
  const shareResult = useMemo(() => {
    if (!percentMaxRanges || !goalRecommendation) return null;

    return validateResultForPrivacy(
      {
        goal: selectedGoal,
        maxHR: effectiveMaxHR,
        // Concise, complete card label that fits without truncation while still
        // distinguishing an entered (measured) max HR from a predicted estimate.
        maxHRLabel: useCustomMaxHR ? "ENTERED MAX HR" : "HRMAX ESTIMATE",
        method: method.name,
      },
      ["age", "sex", "restingHR"] // Exclude sensitive input data
    );
  }, [percentMaxRanges, goalRecommendation, selectedGoal, effectiveMaxHR, useCustomMaxHR, method.name, validateResultForPrivacy]);

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
          Heart Rate Zone Calculator
        </h2>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          Estimate your maximum heart rate and training-intensity zones
        </p>
      </motion.div>

      {/* Input Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
      >
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            {/* Sex Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sex Used by Equation
              </label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The Gulati equation was derived in women; Tanaka and 220−age do
                not require a sex selection.
              </p>
              <div className="flex gap-4">
                {["male", "female"].map((g) => (
                  <label key={g} className="flex items-center">
                    <input
                      type="radio"
                      name="sex"
                      value={g}
                      checked={sex === g}
                      onChange={(e) => handleSexChange(e.target.value)}
                      className="mr-2 h-4 w-4 text-blue-600"
                    />
                    <span className="capitalize text-sm font-medium">{g}</span>
                  </label>
                ))}
              </div>
              {validation.errors.sex && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {validation.errors.sex}
                </p>
              )}
            </div>

            {/* Age */}
            <InputField
              label="Age"
              value={age == null ? "" : age}
              onChange={(value) => setAge(parseFiniteNumber(value))}
              type="number"
              placeholder="40"
              min="18"
              max="120"
            />
            {validation.errors.age && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {validation.errors.age}
              </p>
            )}

            {/* Resting Heart Rate (optional) */}
            <InputField
              label="Resting Heart Rate (bpm) — optional"
              value={restingHR == null ? "" : restingHR}
              onChange={(value) => setRestingHR(parseFiniteNumber(value))}
              type="number"
              placeholder="60"
              min="30"
              max="120"
            />
            {validation.errors.restingHR && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {validation.errors.restingHR}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Optional. Required only for Heart Rate Reserve ranges. Measure
              first thing in the morning before getting out of bed.
            </p>
          </div>

          {/* Max Heart Rate Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Estimated Maximum Heart Rate</h3>

            {/* Method Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prediction Method
              </label>
              <select
                value={methodId}
                onChange={(e) => setMethodId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {MAX_HR_METHODS.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    disabled={m.requiresSex && sex !== m.requiresSex}
                  >
                    {m.name}{" "}
                    {m.requiresSex && sex !== m.requiresSex ? "(women only)" : ""}
                  </option>
                ))}
              </select>
              {validation.errors.method && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {validation.errors.method}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-950/40">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {useCustomMaxHR ? "Using your measured max HR" : "Predicted Max HR"}:{" "}
                {validation.valid && Number.isFinite(effectiveMaxHR)
                  ? `${effectiveMaxHR} bpm`
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                {useCustomMaxHR
                  ? "Your entered value is used directly."
                  : `${method.name}. ${method.note}`}
              </p>
            </div>

            {/* Custom Max HR Option */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useCustomMaxHR}
                  onChange={(e) => setUseCustomMaxHR(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600"
                />
                <span className="text-sm font-medium">Use known max heart rate</span>
              </label>
            </div>

            {useCustomMaxHR && (
              <InputField
                label="Known Max Heart Rate (bpm)"
                value={maxHR == null ? "" : maxHR}
                onChange={(value) => setMaxHR(parseFiniteNumber(value))}
                type="number"
                placeholder="195"
                min="120"
                max="250"
              />
            )}
            {validation.errors.maxHR && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {validation.errors.maxHR}
              </p>
            )}

            {/* Training Goal */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Training Goal
              </label>
              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {TRAINING_GOALS.map((goal) => (
                  <option key={goal.goal} value={goal.goal}>
                    {goal.goal}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6">
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/40">
            <p>
              <strong>Note:</strong> A properly conducted exercise test can
              provide a measured maximum heart rate. Age-predicted equations
              are estimates and may differ substantially from an individual&apos;s
              measured value.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Heart Rate Zones */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-8 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
      >
        <h3 className="mb-6 text-center text-lg font-semibold">
          Your Heart Rate Training Zones
        </h3>

        {!validation.valid ? (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-900 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/40">
            <p className="font-semibold">Check your inputs</p>
            <ul className="mt-2 list-disc pl-5">
              {Object.values(validation.errors).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Two methods are shown. <strong>% of Max HR</strong> applies the
              percentage directly to estimated maximum heart rate.
              <strong>Heart Rate Reserve (Karvonen)</strong> applies the
              percentage to the difference between maximum and resting heart
              rate. They are alternative estimates, not equivalent
              prescriptions.
            </p>

            {/* % of Max HR */}
            <div className="mb-6">
              <h4 className="mb-3 text-lg font-semibold">
                % of Max HR (Moderate / Vigorous)
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div
                  className="rounded-lg p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"
                >
                  <h5 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                    Moderate Intensity
                  </h5>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {percentMaxRanges?.moderate.min} –{" "}
                    {percentMaxRanges?.moderate.max} bpm
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    65–75% of estimated max HR
                  </p>
                </div>
                <div
                  className="rounded-lg p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                >
                  <h5 className="font-medium text-red-900 dark:text-red-200 mb-2">
                    Vigorous Intensity
                  </h5>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                    {percentMaxRanges?.vigorous.min} –{" "}
                    {percentMaxRanges?.vigorous.max} bpm
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    76–96% of estimated max HR
                  </p>
                </div>
              </div>
            </div>

            {/* HRR / Karvonen */}
            {hrrRanges && (
              <div className="mb-6">
                <h4 className="mb-3 text-lg font-semibold">
                  Heart Rate Reserve (Karvonen)
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div
                    className="rounded-lg p-4 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20"
                  >
                    <h5 className="font-medium text-emerald-900 dark:text-emerald-200 mb-2">
                      Moderate Intensity
                    </h5>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      {hrrRanges.moderate.min} –{" "}
                      {hrrRanges.moderate.max} bpm
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      40–59% HRR
                    </p>
                  </div>
                  <div
                    className="rounded-lg p-4 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20"
                  >
                    <h5 className="font-medium text-orange-900 dark:text-orange-200 mb-2">
                      Vigorous Intensity
                    </h5>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                      {hrrRanges.vigorous.min} –{" "}
                      {hrrRanges.vigorous.max} bpm
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      60–89% HRR
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Target HR = resting HR + intensity × (max HR − resting HR).
                </p>
              </div>
            )}
            {!hrrRanges && Number.isFinite(effectiveMaxHR) && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Enter your resting heart rate to also calculate Heart Rate
                Reserve ranges.
              </p>
            )}
          </>
        )}
      </motion.div>

      {/* Talk Test */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-8 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
      >
        <h3 className="mb-4 text-center text-lg font-semibold">Talk Test</h3>
        <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
          A practical way to gauge intensity without a monitor. It is a general
          cue, not a replacement for medical evaluation.
        </p>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/40">
            <h4 className="font-semibold text-emerald-700 dark:text-emerald-300">
              Moderate intensity
            </h4>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              You can talk comfortably but not sing.
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950/40">
            <h4 className="font-semibold text-red-700 dark:text-red-300">
              Vigorous intensity
            </h4>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              Speaking more than a few words requires pausing for breath.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Red flags */}
      <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-900 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900/40">
        <p>
          <strong>Stop and seek urgent care</strong> for chest pain or
          pressure, fainting, severe dizziness, or severe or unusual
          breathlessness. These ranges are not a substitute for clinical
          assessment.
        </p>
      </div>

      {/* Educational explanation */}
      <div className="mt-6">
        <ResultExplanation
          whatItMeans={
            <>
              Your estimated maximum heart rate is{" "}
              <strong>
                {Number.isFinite(effectiveMaxHR) ? `${effectiveMaxHR} bpm` : "—"}
              </strong>{" "}
              {useCustomMaxHR
                ? " (your entered value)"
                : ` (${method.name})`}. Your heart rate training zones are
              ranges of heartbeats per minute that correspond to different
              training intensities.
            </>
          }
          whyItMatters={
            <>
              Training in different zones produces different fitness benefits.
              Lower zones support recovery and endurance, while higher zones
              improve cardiovascular fitness, speed and power. Knowing your
              zones helps you structure workouts to match your goals. The Talk
              Test is a practical check: at moderate intensity you can talk but
              not sing; at vigorous intensity you can only manage a few words
              before pausing for breath.
            </>
          }
          limitations={
            <>
              Maximum heart rate formulas are population estimates with wide
              individual variation. A measured maximum is more accurate than an
              age-based prediction. Beta blockers and other heart-rate-altering
              medications, cardiovascular conditions, pregnancy, and
              clinician-prescribed exercise limits can make predicted ranges
              unreliable; in those cases, clinician-guided targets or perceived
              exertion may be more appropriate. Standard zones do not identify
              lactate thresholds, VO₂max boundaries, or a fat-burning
              requirement, and no single zone guarantees fat loss.
            </>
          }
        />
      </div>

      {/* Training Recommendation */}
      {goalRecommendation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 rounded-xl bg-gradient-to-r from-blue-100 to-purple-100 p-6 shadow-lg dark:from-blue-900/30 dark:to-purple-900/30"
        >
          <h3 className="mb-4 text-lg font-semibold text-center">
            Training Approach for {selectedGoal}
          </h3>
          <div className="text-center">
            <p className="mb-3 text-gray-700 dark:text-gray-300">
              {goalRecommendation.description}
            </p>
            <div className="rounded-lg bg-white/50 p-4 dark:bg-gray-800/50">
              <p className="font-medium text-blue-900 dark:text-blue-200">
                {goalRecommendation.recommendation}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-8 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 p-6 dark:from-red-900/20 dark:to-orange-900/20"
      >
        <h3 className="mb-4 text-lg font-semibold text-center">
          ❤️ Heart Rate Training Tips
        </h3>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <h4 className="font-medium text-red-600 dark:text-red-400">
              Getting Started:
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• A reliable heart-rate monitor can help track heart rate during exercise, but it does not make an age-predicted HRmax equation more accurate.</li>
              <li>• Start with lower zones and progress</li>
              <li>• Allow time for adaptation</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-orange-600 dark:text-orange-400">
              During Training:
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Stay within your target zone</li>
              <li>• Listen to your body</li>
              <li>• Include recovery periods</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-yellow-600 dark:text-yellow-400">
              Important Notes:
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Factors like stress affect HR</li>
              <li>• Medication can influence readings</li>
              <li>• Consult professionals if needed</li>
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
              These zones are estimates, not individually measured training
              thresholds. Beta blockers and other heart-rate-altering
              medications, cardiovascular conditions, and clinician-prescribed
              exercise limits can make standard ranges unreliable. Seek medical
              guidance before starting or changing exercise if you have
              relevant health concerns, and stop for chest pain, fainting,
              severe dizziness, or unusual breathlessness.
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
                type="heart"
                value={shareResult.maxHR}
                category={shareResult.goal}
                subtitle={shareResult.maxHRLabel}
                aspectRatio="square"
              />
            </div>
          </div>
          <div className="text-center mt-6">
            <ShareButton
              onGenerateImage={handleGenerateImage}
              shareData={shareData}
              variant="primary"
              className="mx-auto"
            />
          </div>
        </div>
      )}

      {/* Calculator Next Step */}
      <CalculatorNextStep
        heading="What's Next"
        description={
          <>
            Estimated heart-rate ranges can support general exercise-intensity
            education. Explore performance coaching or your broader fitness
            picture.
          </>
        }
        source="calculator-heart-rate"
        calculatorId="heart-rate"
        showEnquiry={true}
        primaryCta={{
          label: "Explore Performance Coaching",
          href: "/services/category/functional-fitness-life-stages",
        }}
        secondaryLinks={[
          {
            label: "Explore Your Fitness & Health Snapshot",
            href: "/transformation",
          },
        ]}
      />

      {/* Hidden Shareable Card for Image Generation */}
      {shareResult && (
        <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none">
          <ResultCard
            ref={shareableCardRef}
            type="heart"
            value={shareResult.maxHR}
            category={shareResult.goal}
            subtitle={shareResult.maxHRLabel}
          />
        </div>
      )}
    </div>
  );
}
