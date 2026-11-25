"use client";

import Gauge from "@/components/pages/bmi/Gauge";
import InputField from "@/components/atoms/InputField";
import React, { useMemo, useState } from "react";
import BMICategories from "@/components/pages/bmi/BMICategories";
import UnitToggle from "@/components/pages/bmi/UnitToggle";
import ShareButton from "@/components/atoms/ShareButton";
import ResultCard from "@/components/atoms/ResultCard";
import ResultExplanation from "@/components/atoms/ResultExplanation";
import HealthDisclaimer from "@/components/atoms/HealthDisclaimer";
import { useShareableImage } from "@/hooks/useShareableImage";
import CalculatorNextStep from "@/components/atoms/CalculatorNextStep";
import {
  calculateBMI,
  classifyBMI,
  bmiHealthyRange,
  parseFiniteNumber,
} from "@/lib/calculators";

// Utility functions
const round = (value, digits = 1) => {
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

export default function BmiCalculator() {
  const [unitSystem, setUnitSystem] = useState("metric");
  // No calculation-affecting defaults: every input starts blank/unselected.
  const [age, setAge] = useState(null);
  const [weight, setWeight] = useState({ kg: null, lb: null });
  const [height, setHeight] = useState({ cm: null, ft: null, in: null });

  // Share functionality
  const { shareableCardRef, generateImage, generateShareData, validateResultForPrivacy } = useShareableImage('bmi');

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

  // Calculate BMI only when both measurements are valid.
  const bmi = useMemo(() => {
    if (weight.kg == null || height.cm == null) return null;
    return calculateBMI(weight.kg, height.cm);
  }, [weight.kg, height.cm]);

  const classification = useMemo(() => {
    if (bmi == null) return { label: "—", color: "text-gray-500" };
    return classifyBMI(bmi, age);
  }, [bmi, age]);
  const { label, color, obesityClass } = classification;
  const healthyRange = useMemo(() => {
    if (height.cm == null) return null;
    return bmiHealthyRange(height.cm);
  }, [height.cm]);

  const isAdult = Number.isFinite(age) && age >= 20;

  // Prepare share data for BMI results. Adult share requires age >= 20 so
  // that youth BMI (which exists internally) never leaks into adult sharing.
  const shareResult = useMemo(() => {
    if (!isAdult) return null;
    if (!isFinite(bmi) || bmi <= 0) return null;

    return validateResultForPrivacy({
      value: round(bmi, 1),
      category: label,
      healthyRange: healthyRange
        ? `${healthyRange.min[unitSystem === 'metric' ? 'kg' : 'lb']} - ${healthyRange.max[unitSystem === 'metric' ? 'kg' : 'lb']} ${unitSystem === 'metric' ? 'kg' : 'lbs'}`
        : "—",
    }, ['weight', 'height']); // Exclude sensitive input data
  }, [bmi, label, healthyRange, unitSystem, isAdult, validateResultForPrivacy]);

  const shareData = useMemo(() => {
    if (!shareResult) return null;
    return generateShareData(shareResult);
  }, [shareResult, generateShareData]);

  const handleGenerateImage = async () => {
    if (!shareResult) throw new Error('No results to share');
    return await generateImage();
  };

  const displayValue = (v) => (v == null ? "" : v);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Body Mass Index Calculator
        </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            Calculate your BMI and get instant health classification
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter your own data for personalized results
          </p>
      </div>

      {/* Input Form */}
      <div className="rounded-xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
        {/* Unit System Selector */}
        <div className="mb-6 flex justify-center">
          <UnitToggle unitSystem={unitSystem} onUnitChange={setUnitSystem} />
        </div>

        {/* Input Fields */}
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-1 md:grid-cols-2">
          {unitSystem === "metric" ? (
            <>
              <InputField
                label="Weight (kg)"
                value={displayValue(weight.kg)}
                onChange={(value) => handleWeightChange(value, "kg")}
                type="number"
                placeholder="70"
                min="1"
              />
              <InputField
                label="Height (cm)"
                value={displayValue(height.cm)}
                onChange={(value) => handleHeightChange(value, "cm")}
                type="number"
                placeholder="170"
                min="1"
              />
            </>
          ) : (
            <>
              <InputField
                label="Weight (lb)"
                value={displayValue(weight.lb)}
                onChange={(value) => handleWeightChange(value, "lb")}
                type="number"
                placeholder="154"
                min="1"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Height
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label=""
                    value={displayValue(height.ft)}
                    onChange={(value) => handleHeightChange(value, "ft")}
                    type="number"
                    placeholder="Feet"
                    min="1"
                  />
                  <InputField
                    label=""
                    value={displayValue(height.in)}
                    onChange={(value) => handleHeightChange(value, "in")}
                    type="number"
                    placeholder="Inches"
                    min="0"
                    max="11"
                  />
                </div>
              </div>
            </>
          )}

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
        </div>

        <div className="mt-6">
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/40">
            <p>
              BMI is a screening measure for adults (age 20 and older) and does
              not diagnose body fatness or health. It may not be accurate for
              athletes, older adults, or pregnant women. BMI categories for
              children and teenagers are age- and sex-specific. Consult a
              healthcare professional for personalized advice.
            </p>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="mt-6 sm:mt-8 grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* BMI Result */}
        <div className="rounded-xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <div className="text-center">
            <h3 className="mb-4 text-lg font-semibold">Your BMI Result</h3>
            {isAdult ? (
              <>
                <div className="mb-4">
                  <p className="text-5xl font-extrabold tracking-tight">
                    {isFinite(bmi) && bmi > 0 ? round(bmi, 1) : "—"}
                  </p>
                  <p className={`mt-2 text-lg font-semibold ${color}`}>
                    {label}
                    {obesityClass && (
                      <span className="text-xs font-normal ml-1 opacity-80">
                        ({obesityClass.label})
                      </span>
                    )}
                  </p>
                </div>

                <div className="mb-6">
                  <Gauge value={bmi} />
                </div>

                <div className="text-left">
                  <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Healthy weight range for your height:
                  </h4>
                  <p className="text-lg font-semibold text-emerald-600">
                    {healthyRange
                      ? `${healthyRange.min[unitSystem === "metric" ? "kg" : "lb"]} - ${healthyRange.max[unitSystem === "metric" ? "kg" : "lb"]} ${unitSystem === "metric" ? "kg" : "lbs"}`
                      : "—"}
                  </p>
                </div>

                {/* Educational explanation */}
                <div className="mt-4">
                  <ResultExplanation
                    whatItMeans={
                      <>
                        Your BMI of{" "}
                        <span className="font-semibold">
                          {isFinite(bmi) && bmi > 0 ? round(bmi, 1) : "—"}
                        </span>{" "}
                        places you in the{" "}
                        <span className="font-semibold">{label}</span>{" "}
                        {obesityClass && (
                          <>
                            <span className="text-xs font-normal ml-1 opacity-80">
                              ({obesityClass.label})
                            </span>
                          </>
                        )}
                        category. BMI is a simple, widely used screening tool
                        that relates body weight to height.
                      </>
                    }
                    whyItMatters={
                      <>
                        Maintaining a BMI within the{" "}
                        <span className="font-semibold">
                          18.5–24.9
                        </span>{" "}
                        range is associated with lower risk of chronic diseases
                        such as heart disease, type 2 diabetes, and certain
                        cancers. Your healthy weight range for your height is{" "}
                        <span className="font-semibold">
                          {healthyRange
                            ? `${healthyRange.min[unitSystem === "metric" ? "kg" : "lb"]} - ${healthyRange.max[unitSystem === "metric" ? "kg" : "lb"]} ${unitSystem === "metric" ? "kg" : "lbs"}`
                            : "—"}
                        </span>.
                      </>
                    }
                    limitations={
                      <>
                        BMI is a screening tool and does not directly measure
                        body fat or distinguish between muscle and fat. It may
                        not be accurate for athletes, older adults, pregnant
                        women, or people with high muscle mass. Use it as one
                        piece of information, not a diagnosis. BMI categories
                        apply to adults only; children and teenagers use
                        age- and sex-specific percentile charts.
                      </>
                    }
                  />
                </div>

                {/* Share Button */}
                {shareResult && shareData && (
                  <div className="mt-6 text-center">
                    <ShareButton
                      onGenerateImage={handleGenerateImage}
                      shareData={shareData}
                      className="w-full"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-300">
                  {Number.isFinite(age) && age > 0 && age < 20
                    ? "BMI categories are intended for adults age 20 and older. Ages 2-19 require sex- and age-specific BMI-for-age percentile interpretation, which is not yet available here."
                    : "Please enter an age of 20 or above to see your adult BMI classification."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* BMI Categories */}
        <div className="rounded-xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <h3 className="mb-4 text-lg font-semibold">BMI Categories</h3>
          <BMICategories />
        </div>
      </div>

      {/* Health Disclaimer */}
      <div className="mt-8">
        <HealthDisclaimer
          universalDisclaimer={
            <>
              The results provided are estimates based on general population
              formulas and the information you have entered. They are
              intended for general educational and fitness guidance, not as a
              substitute for professional medical advice. Individual
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
              BMI is a general screening measure and does not directly
              measure body fat or determine an individual&apos;s health status.
              Athletes, highly muscular individuals and people with different
              body compositions may need additional assessment.
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
                type="bmi"
                value={shareResult.value}
                category={shareResult.category}
                subtitle={`Healthy range: ${shareResult.healthyRange}`}
                aspectRatio="square"
              />
            </div>
          </div>
        </div>
      )}

      {/* Calculator Next Step */}
      <CalculatorNextStep calculatorId="bmi" />

      {/* Hidden Shareable Card for Image Generation */}
      {shareResult && (
        <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none">
          <ResultCard
            ref={shareableCardRef}
            type="bmi"
            value={shareResult.value}
            category={shareResult.category}
            subtitle={`Healthy range: ${shareResult.healthyRange}`}
          />
        </div>
      )}
    </div>
  );
}
