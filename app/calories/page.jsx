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
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  ACTIVITY_LEVELS,
  CALORIE_GOALS,
  parseFiniteNumber,
} from "@/lib/calculators";

// Utility functions
const round = (value, digits = 0) => {
  const p = Math.pow(10, digits);
  return Math.round(value * p) / p;
};

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

export default function CalorieCalculator() {
  const [unitSystem, setUnitSystem] = useState("metric");
  // No calculation-affecting defaults: every input starts blank/unselected.
  const [gender, setGender] = useState("");
  const [age, setAge] = useState(null);
  const [activityLevel, setActivityLevel] = useState(null);
  const [goal, setGoal] = useState(null);

  // Store both metric and imperial values; null = blank / not provided.
  const [weight, setWeight] = useState({ kg: null, lb: null });
  const [height, setHeight] = useState({ cm: null, ft: null, in: null });

  // Share functionality
  const {
    shareableCardRef,
    generateImage,
    generateShareData,
    validateResultForPrivacy,
  } = useShareableImage("calories");

  // Weight handlers — convert only finite values; blank clears the pair.
  const handleWeightChange = (value, unit) => {
    const parsed = parseFiniteNumber(value);
    if (parsed == null) {
      setWeight({ kg: null, lb: null });
      return;
    }
    if (unit === "kg") {
      setWeight({ kg: parsed, lb: conversions.kgToLb(parsed) });
    } else {
      setWeight({ kg: conversions.lbToKg(parsed), lb: parsed });
    }
  };

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
      if (height.in == null) {
        setHeight({ cm: null, ft: parsed, in: null });
        return;
      }
      const cm = conversions.ftInToCm(parsed, height.in);
      setHeight({ cm, ft: parsed, in: height.in });
    } else if (unit === "in") {
      if (height.ft == null) {
        setHeight({ cm: null, ft: null, in: parsed });
        return;
      }
      const cm = conversions.ftInToCm(height.ft, parsed);
      setHeight({ cm, ft: height.ft, in: parsed });
    }
  };

  const displayValue = (v) => (v == null ? "" : v);

  // Calculate calories only when every required input is valid. Returns null
  // for any invalid input so no NaN/0 leaks into rendering.
  const { bmr, tdee, targetCalories, inputsValid } = useMemo(() => {
    if (
      weight.kg == null ||
      height.cm == null ||
      age == null ||
      !gender ||
      activityLevel == null ||
      goal == null
    ) {
      return { bmr: null, tdee: null, targetCalories: null, inputsValid: false };
    }
    const computedBMR = calculateBMR(weight.kg, height.cm, age, gender);
    if (computedBMR == null) {
      return { bmr: null, tdee: null, targetCalories: null, inputsValid: false };
    }
    const computedTDEE = calculateTDEE(computedBMR, activityLevel);
    if (computedTDEE == null) {
      return { bmr: null, tdee: null, targetCalories: null, inputsValid: false };
    }
    const computedTarget = calculateTargetCalories(computedTDEE, goal);
    if (computedTarget == null) {
      return { bmr: null, tdee: null, targetCalories: null, inputsValid: false };
    }
    return {
      bmr: round(computedBMR),
      tdee: round(computedTDEE),
      targetCalories: round(computedTarget),
      inputsValid: true,
    };
  }, [weight.kg, height.cm, age, gender, activityLevel, goal]);

  const selectedActivity = ACTIVITY_LEVELS.find(
    (level) => level.value === activityLevel,
  );
  const selectedGoal = CALORIE_GOALS.find((g) => g.value === goal);

  // Sex coefficient explanation for Mifflin-St Jeor
  const sexCoefficient = gender === "male" ? "+5" : "−161";
  const sexCoefficientLabel =
    gender === "male" ? "men" : "women";

  // Prepare share data for calorie results
  const shareResult = useMemo(() => {
    if (!targetCalories || targetCalories <= 0) return null;

    return validateResultForPrivacy(
      {
        value: targetCalories,
        unit: "calories/day",
        goal: selectedGoal?.label || "Maintain Weight",
        bmr: bmr,
        tdee: tdee,
      },
      ["weight", "height", "age", "gender", "activityLevel"],
    ); // Exclude sensitive input data
  }, [targetCalories, selectedGoal, bmr, tdee, validateResultForPrivacy]);

  const shareData = useMemo(() => {
    if (!shareResult) return null;
    return generateShareData(shareResult);
  }, [shareResult, generateShareData]);

  const handleGenerateImage = async () => {
    if (!shareResult) throw new Error("No results to share");
    return await generateImage();
  };

  const genderChecked = (g) => gender === g;

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Daily Calorie Calculator
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            Calculate your daily calorie needs based on your goals and activity
            level
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter your own data for personalized results
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

              {/* Gender Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Gender
                </label>
                <div className="flex gap-4">
                  {["male", "female"].map((g) => (
                    <label key={g} className="flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={genderChecked(g)}
                        onChange={(e) => setGender(e.target.value)}
                        className="mr-2 h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm font-medium capitalize">
                        {g}
                      </span>
                    </label>
                  ))}
                </div>
                {!gender && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    Please select your gender.
                  </p>
                )}
              </div>

              {/* Age */}
              <InputField
                label="Age"
                value={displayValue(age)}
                onChange={(value) => setAge(parseFiniteNumber(value))}
                type="number"
                placeholder="25"
                min="1"
                max="120"
                unit="years"
              />

              {/* Weight */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <InputField
                    label={`Weight (${unitSystem === "metric" ? "kg" : "lbs"})`}
                    value={displayValue(
                      unitSystem === "metric" ? weight.kg : weight.lb,
                    )}
                    onChange={(value) =>
                      handleWeightChange(
                        value,
                        unitSystem === "metric" ? "kg" : "lb",
                      )
                    }
                    type="number"
                    placeholder={unitSystem === "metric" ? "70" : "154"}
                    min="1"
                    unit={unitSystem === "metric" ? "kg" : "lb"}
                  />
                </div>
              </div>

              {/* Height */}
              {unitSystem === "metric" ? (
                <InputField
                  label="Height(cm)"
                  value={displayValue(height.cm)}
                  onChange={(value) => handleHeightChange(value, "cm")}
                  type="number"
                  placeholder="170"
                  min="1"
                  unit="cm"
                />
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <InputField
                      label="Height (ft)"
                      value={displayValue(height.ft)}
                      onChange={(value) => handleHeightChange(value, "ft")}
                      type="number"
                      placeholder="5"
                      min="1"
                      unit="ft"
                    />
                  </div>
                  <div className="flex-1">
                    <InputField
                      label="Height (in)"
                      value={displayValue(height.in)}
                      onChange={(value) => handleHeightChange(value, "in")}
                      type="number"
                      placeholder="7"
                      min="0"
                      max="11"
                      unit="in"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Equation explanation */}
            <div className="mt-6">
              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/40">
                <p className="font-medium mb-1">Mifflin–St Jeor Equation</p>
                <p className="text-sm">
                  Mifflin–St Jeor estimates resting energy expenditure (RMR/REE), not basal metabolic rate (BMR):
                  RMR = 10 × weight + 6.25 × height − 5 × age + sex coefficient.
                  The sex coefficient is{" "}
                  <span className="font-semibold">{sexCoefficient}</span>{" "}
                  for {sexCoefficientLabel}. This is a biological variable in
                  the published equation, not a statement about gender identity.
                  Results are population-level estimates.
                </p>
              </div>
            </div>

            {/* Activity & Goals */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Activity & Goals</h3>

              {/* Activity Level */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Activity Level
                </label>
                <select
                  value={activityLevel == null ? "" : activityLevel}
                  onChange={(e) =>
                    setActivityLevel(parseFiniteNumber(e.target.value))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select activity level</option>
                  {ACTIVITY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label} - {level.description}
                    </option>
                  ))}
                </select>
                {activityLevel == null && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    Please select your activity level.
                  </p>
                )}
              </div>

              {/* Goal Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Goal
                </label>
                <select
                  value={goal == null ? "" : goal}
                  onChange={(e) => setGoal(parseFiniteNumber(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a goal</option>
                  {CALORIE_GOALS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label} - {g.description}
                    </option>
                  ))}
                </select>
                {goal == null && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    Please select a goal.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-6">
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/40">
              <p>
                These calculations are estimates based on general formulas.
                Individual needs may vary based on metabolism, medical
                conditions, and other factors. Consult a healthcare professional
                or nutritionist for personalized advice.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Results Section */}
        {inputsValid ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* BMR Result */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
            >
                <div className="text-center">
                <h3 className="mb-4 text-lg font-semibold">
                  Resting Metabolic Rate
                </h3>
                <div className="mb-4">
                  <p className="text-4xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                    {bmr}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    calories/day
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Estimated resting energy expenditure
                </p>
              </div>
            </motion.div>

            {/* TDEE Result */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
            >
              <div className="text-center">
                <h3 className="mb-4 text-lg font-semibold">
                  Maintenance Calories
                </h3>
                <div className="mb-4">
                  <p className="text-4xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {tdee}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    calories/day
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  With {selectedActivity?.label.toLowerCase()} lifestyle
                </p>
              </div>
            </motion.div>

            {/* Target Calories Result */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
            >
              <div className="text-center">
                <h3 className="mb-4 text-lg font-semibold">Target Calories</h3>
                <div className="mb-4">
                  <p className="text-4xl font-extrabold tracking-tight text-purple-600 dark:text-purple-400">
                    {targetCalories}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    calories/day
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  To {selectedGoal?.label.toLowerCase()}
                </p>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="mt-8 rounded-xl bg-gray-50 p-8 text-center dark:bg-gray-800/50">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Complete your details above to see your calorie targets.
            </p>
          </div>
        )}

        {/* Educational explanation */}
        {inputsValid && (
          <div className="mt-6">
            <ResultExplanation
              whatItMeans={
                <>
                  Your{" "}
                  <span className="font-semibold">
                    Basal Metabolic Rate (BMR)
                  </span>{" "}
                  of {bmr} calories/day is the energy your body needs at rest
                  for basic functions. Your{" "}
                  <span className="font-semibold">
                    maintenance calories (TDEE)
                  </span>{" "}
                  of {tdee} calories/day includes your daily activity. Your{" "}
                  <span className="font-semibold">target</span> of{" "}
                  {targetCalories} calories/day is adjusted for your goal of{" "}
                  {selectedGoal?.label.toLowerCase()}.
                </>
              }
              whyItMatters={
                <>
                  Eating at a moderate deficit below your maintenance calories
                  can lead to gradual weight loss, while eating above them
                  supports weight gain. Matching your intake to your goal is
                  key to achieving lasting results.
                </>
              }
              limitations={
                <>
                  These calculations are estimates based on general formulas.
                  Actual energy needs vary between individuals based on
                  metabolism, muscle mass, genetics, medical conditions, and
                  other factors. Use these numbers as a guide, not a fixed rule,
                  and adjust based on your progress and how you feel.
                </>
              }
            />
          </div>
        )}

        {/* Macronutrient Breakdown */}
        {inputsValid && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-8 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
          >
            <h3 className="mb-6 text-center text-lg font-semibold">
              Illustrative Macronutrient Distribution
            </h3>
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  name: "Protein",
                  percentage: 25,
                  color: "text-red-600 dark:text-red-400",
                  bgColor: "bg-red-100 dark:bg-red-700/20",
                  calories: round(targetCalories * 0.25),
                  grams: round((targetCalories * 0.25) / 4),
                },
                {
                  name: "Carbohydrates",
                  percentage: 45,
                  color: "text-blue-600 dark:text-blue-400",
                  bgColor: "bg-blue-100 dark:bg-blue-700/20",
                  calories: round(targetCalories * 0.45),
                  grams: round((targetCalories * 0.45) / 4),
                },
                {
                  name: "Fats",
                  percentage: 30,
                  color: "text-yellow-600 dark:text-yellow-400",
                  bgColor: "bg-yellow-100 dark:bg-yellow-700/20",
                  calories: round(targetCalories * 0.3),
                  grams: round((targetCalories * 0.3) / 9),
                },
              ].map(({ name, percentage, color, bgColor, calories, grams }) => (
                <div
                  key={name}
                  className={`rounded-lg p-4 text-center ${bgColor}`}
                >
                  <h4 className={`text-lg font-bold ${color}`}>{name}</h4>
                  <p className="mt-1 text-sm font-semibold">{percentage}%</p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {calories} calories
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {grams}g per day
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tips Section */}
        {inputsValid && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-8 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:from-blue-900/20 dark:to-purple-900/20"
          >
            <h3 className="mb-4 text-center text-lg font-semibold">
              💡 Quick Tips
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600 dark:text-blue-400">
                  For Weight Loss:
                </h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Create a moderate calorie deficit</li>
                  <li>• Focus on protein to preserve muscle</li>
                  <li>• Stay hydrated and get adequate sleep</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-emerald-600 dark:text-emerald-400">
                  For Weight Gain:
                </h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Eat nutrient-dense, calorie-rich foods</li>
                  <li>• Include healthy fats and complex carbs</li>
                  <li>• Combine with strength training</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Health Disclaimer */}
        <div className="mt-6">
          <HealthDisclaimer
            universalDisclaimer={
              <>
                The results provided are estimates based on general population
                formulas and the information you have entered. They are
                intended for general educational and fitness guidance, not as
                a substitute for professional medical advice. Individual
                requirements may vary depending on age, body composition,
                activity level, lifestyle, health status and other personal
                factors. These values should be treated as a starting
                reference, not fixed targets. Health Notice: If you have an
                existing medical condition, metabolic disorder, are taking
                medication, are pregnant, or have specific dietary or exercise
                restrictions, consult a qualified healthcare professional
                before making changes to your diet, hydration or exercise
                routine. Remember: Your fitness journey is individual. Use
                these results as a starting point and adjust your approach
                based on your body&apos;s response and professional guidance.
              </>
            }
            specificCaution={
              <>
                Calorie estimates are not personalized medical or dietary
                prescriptions. Individual energy requirements may differ,
                particularly during pregnancy, breastfeeding, adolescence or
                when managing a medical or nutritional condition.
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
                  type="calorie"
                  value={shareResult.value}
                  category={shareResult.goal}
                  subtitle={`BMR: ${shareResult.bmr} | TDEE: ${shareResult.tdee}`}
                  aspectRatio="square"
                />
              </div>
            </div>
            <div className="text-center mt-6">
              <ShareButton
                onGenerateImage={handleGenerateImage}
                shareData={shareData}
                className="mx-auto"
              />
            </div>
          </div>
        )}

        </div>

        {/* Calculator Next Step */}
        <CalculatorNextStep
          heading="What's Next"
          description={
            <>
              Estimated energy expenditure is only one aspect of fitness
              planning. Explore your broader fitness picture or coaching
              options.
            </>
          }
          source="calculator-calories"
          calculatorId="calories"
          showEnquiry={true}
          primaryCta={{
            label: "Explore Your Fitness & Health Snapshot",
            href: "/transformation",
          }}
          secondaryLinks={[
            {
              label: "Explore Strength Coaching",
              href: "/services/category/strength-fitness-performance",
            },
          ]}
        />

        {/* Hidden Shareable Card for Image Generation */}
      {shareResult && (
        <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none">
          <ResultCard
            ref={shareableCardRef}
            type="calorie"
            value={shareResult.value}
            category={shareResult.goal}
            subtitle={`BMR: ${shareResult.bmr} | TDEE: ${shareResult.tdee}`}
          />
        </div>
      )}
    </>
  );
}
