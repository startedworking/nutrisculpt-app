"use client";

import React, { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  GOAL_TO_SERVICE_MAP,
  GOAL_LABELS,
  ENQUIRY_SERVICE_OPTIONS,
  ENQUIRY_CATEGORY_ALLOWLIST,
  SERVICE_CATEGORIES,
} from "@/constants/services";
import { isValidCalculatorSource } from "@/lib/back-link-security";
import {
  kgToLbExact,
  lbToKgExact,
  cmToIn,
  inToCm,
  cmToFeetInches,
  feetInchesToCm,
} from "@/lib/calculators";
import {
  createTransformationSessionPayload,
  readTransformationSession,
  saveTransformationSession,
  clearTransformationSession,
} from "@/lib/transformation-session";
import ResultExplanation from "@/components/atoms/ResultExplanation";
import HealthDisclaimer from "@/components/atoms/HealthDisclaimer";

const round1 = (value) => Math.round(value * 10) / 10;

function TransformationForm() {
  // Canonical internal units (source of truth): weight → kg, height → cm, waist → cm.
  // null means blank / not yet provided. These persist across unit toggles so
  // physical quantities never drift through repeated display conversions.
  const [canonical, setCanonical] = useState({
    weightKg: null,
    heightCm: null,
    waistCm: null,
  });
  const [unitSystem, setUnitSystem] = useState("metric");

  // Categorical / non-measurement form fields (unchanged semantics).
  const [form, setForm] = useState({
    gender: "",
    age: "",
    activity: "",
    primaryGoal: "",
    aerobicActivity: "",
    aerobicIntensity: "",
    strengthFrequency: "",
    healthConsiderations: "no",
  });

  // Raw imperial height display strings (feet / inches are two separate inputs).
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("");

  const searchParams = useSearchParams();
  const urlSource = searchParams.get("source") || "";
  const resolvedSource = isValidCalculatorSource(urlSource)
    ? urlSource
    : "transformation";
  const router = useRouter();

  // Restore a completed Transformation snapshot from session storage on mount.
  // Runs only on the client, so SSR/initial render stays a blank form with no
  // hydration mismatch. Corrupted or stale storage is safely ignored.
  //
  // The current comprehensive snapshot uses adult reference methods and is
  // designed for ages 20 and above. A restored session with age below 20 must
  // not display an adult snapshot: clear it and return to the input state.
  useEffect(() => {
    const stored = readTransformationSession();
    if (!stored) return;
    const { unitSystem, inputs } = stored;
    const restoredAge = parseFloat(inputs.age);
    if (!Number.isFinite(restoredAge) || restoredAge < 20) {
      clearTransformationSession();
      return;
    }
    setUnitSystem(unitSystem);
    setCanonical({
      weightKg: inputs.weightKg,
      heightCm: inputs.heightCm,
      waistCm: inputs.waistCm,
    });
    setForm((f) => ({
      ...f,
      age: inputs.age,
      gender: inputs.gender,
      activity: inputs.activity,
      primaryGoal: inputs.primaryGoal,
      aerobicActivity: inputs.aerobicActivity,
      aerobicIntensity: inputs.aerobicIntensity,
      strengthFrequency: inputs.strengthFrequency,
      healthConsiderations: inputs.healthConsiderations,
    }));
    setSelectedServiceCategory(
      GOAL_TO_SERVICE_MAP[inputs.primaryGoal] || "not-sure"
    );
    setSubmitted(true);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) {
      setErrors((e) => ({ ...e, [name]: null }));
    }
  };

  // ---------------------------------------------------------------------------
  // Measurement handlers: update canonical value from the current display unit.
  // ---------------------------------------------------------------------------

  const handleWeightChange = (value) => {
    const num = parseFloat(value);
    if (value === "" || !Number.isFinite(num) || num < 0) {
      setCanonical((p) => ({ ...p, weightKg: null }));
      return;
    }
    const kg = unitSystem === "metric" ? num : lbToKgExact(num);
    setCanonical((p) => ({ ...p, weightKg: kg }));
  };

  const handleHeightChange = (value) => {
    // Metric height input (cm).
    const num = parseFloat(value);
    if (value === "" || !Number.isFinite(num) || num <= 0) {
      setCanonical((p) => ({ ...p, heightCm: null }));
      return;
    }
    setCanonical((p) => ({ ...p, heightCm: num }));
  };

  const handleHeightFtChange = (value) => {
    setHeightFt(value);
    const ft = parseFloat(value);
    const inVal = parseFloat(heightIn);
    if (value === "" || heightIn === "" || !Number.isFinite(ft) || !Number.isFinite(inVal)) {
      setCanonical((p) => ({ ...p, heightCm: null }));
      return;
    }
    setCanonical((p) => ({ ...p, heightCm: feetInchesToCm(ft, inVal) }));
  };

  const handleHeightInChange = (value) => {
    setHeightIn(value);
    const ft = parseFloat(heightFt);
    const inVal = parseFloat(value);
    if (heightFt === "" || value === "" || !Number.isFinite(ft) || !Number.isFinite(inVal)) {
      setCanonical((p) => ({ ...p, heightCm: null }));
      return;
    }
    setCanonical((p) => ({ ...p, heightCm: feetInchesToCm(ft, inVal) }));
  };

  const handleWaistChange = (value) => {
    const num = parseFloat(value);
    if (value === "" || !Number.isFinite(num) || num < 0) {
      setCanonical((p) => ({ ...p, waistCm: null }));
      return;
    }
    const cm = unitSystem === "metric" ? num : inToCm(num);
    setCanonical((p) => ({ ...p, waistCm: cm }));
  };

  // ---------------------------------------------------------------------------
  // Unit system toggle: canonical values persist, only the display unit changes.
  // No conversion of an already-rounded display value, so no rounding drift.
  // ---------------------------------------------------------------------------

  const handleUnitChange = (newSystem) => {
    if (newSystem === unitSystem) return;
    setUnitSystem(newSystem);
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  // ---------------------------------------------------------------------------
  // Derived display representations (computed from canonical at render time).
  // ---------------------------------------------------------------------------

  const weightDisplay =
    canonical.weightKg == null
      ? ""
      : unitSystem === "metric"
        ? String(round1(canonical.weightKg))
        : String(round1(kgToLbExact(canonical.weightKg)));

  const waistDisplay =
    canonical.waistCm == null
      ? ""
      : unitSystem === "metric"
        ? String(round1(canonical.waistCm))
        : String(round1(cmToIn(canonical.waistCm)));

  const heightMetricDisplay = canonical.heightCm == null ? "" : String(round1(canonical.heightCm));

  let heightImperialFt = "";
  let heightImperialIn = "";
  if (canonical.heightCm != null) {
    const { ft, inches } = cmToFeetInches(canonical.heightCm);
    heightImperialFt = String(ft);
    heightImperialIn = String(round1(inches));
  }

  // ---------------------------------------------------------------------------
  // Validation foundation: operates on canonical values plus active unit.
  // ---------------------------------------------------------------------------

  const validateForm = () => {
    const newErrors = {};

    const ageVal = parseFloat(form.age);
    if (!form.age || !Number.isFinite(ageVal) || ageVal < 1) {
      newErrors.age = "Please enter your age";
    }

    if (!form.gender) {
      newErrors.gender = "Please select the equation input needed for this estimate.";
    }

    if (!form.activity) {
      newErrors.activity = "Please select your general activity level.";
    }

    const weightKg = canonical.weightKg;
    if (weightKg == null) {
      newErrors.weight = unitSystem === "metric"
        ? "Please enter a valid weight (kg)"
        : "Please enter a valid weight (lb)";
    } else if (weightKg < 20 || weightKg > 300) {
      newErrors.weight = unitSystem === "metric"
        ? "Please enter a valid weight (20-300 kg)"
        : "Please enter a valid weight (approx. 44-661 lb)";
    }

    const heightCm = canonical.heightCm;
    if (unitSystem === "metric") {
      if (heightCm == null) {
        newErrors.height = "Please enter a valid height (cm)";
      } else if (heightCm < 50 || heightCm > 250) {
        newErrors.height = "Please enter a valid height (50-250 cm)";
      }
    } else {
      const ftVal = parseFloat(heightFt);
      const inVal = parseFloat(heightIn);
      if (heightFt === "" || heightIn === "") {
        newErrors.height = "Please enter both feet and inches";
      } else if (
        !Number.isFinite(ftVal) ||
        !Number.isFinite(inVal) ||
        ftVal < 0 ||
        inVal < 0 ||
        inVal >= 12
      ) {
        newErrors.height = "Please enter valid feet and inches (0-11)";
      } else {
        const totalCm = feetInchesToCm(ftVal, inVal);
        if (totalCm < 50 || totalCm > 250) {
          newErrors.height =
            "Please enter a valid height (50-250 cm / approx. 1'8\"-8'2\")";
        }
      }
    }

    const waistCm = canonical.waistCm;
    if (waistCm != null) {
      if (waistCm <= 0) {
        newErrors.waist = "Please enter a valid waist circumference";
      } else if (unitSystem === "metric" && (waistCm < 40 || waistCm > 200)) {
        newErrors.waist = "Please enter a valid waist (40-200 cm)";
      } else if (unitSystem === "imperial" && (waistCm < 40 || waistCm > 200)) {
        // Canonical is cm; express the metric bounds in inches for the message.
        newErrors.waist = "Please enter a valid waist (approx. 16-79 in)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const ageNum = parseFloat(form.age);
      if (!Number.isFinite(ageNum) || ageNum < 20) {
        setErrors((e) => ({
          ...e,
          age:
            "The current comprehensive snapshot uses adult reference methods and is designed for ages 20 and above. Please enter an age of 20 or older.",
        }));
        return;
      }
      const suggestedCategory = GOAL_TO_SERVICE_MAP[form.primaryGoal] || "not-sure";
      setSelectedServiceCategory(suggestedCategory);
      const payload = createTransformationSessionPayload({
        unitSystem,
        canonical,
        form,
      });
      saveTransformationSession(payload);
      setSubmitted(true);
    }
  };

  const resetForm = () => {
    clearTransformationSession();
    setSubmitted(false);
    setErrors({});
    setSelectedServiceCategory("");
    setCanonical({ weightKg: null, heightCm: null, waistCm: null });
    setHeightFt("");
    setHeightIn("");
    setUnitSystem("metric");
  };

  // Activity level options
  const ACTIVITY_LEVELS = [
    { value: "sedentary", label: "Sedentary", description: "Mostly seated, minimal everyday movement" },
    { value: "light", label: "Lightly active", description: "Some daily movement and light activity" },
    { value: "moderate", label: "Moderately active", description: "Regular movement and exercise" },
    { value: "active", label: "Very active", description: "Substantial daily movement or frequent training" },
    { value: "veryActive", label: "Extremely active", description: "Exceptionally high daily physical activity" },
  ];

  const GOAL_OPTIONS = [
    { value: "strength", label: "Build strength and general fitness" },
    { value: "health", label: "Improve health-focused fitness" },
    { value: "function", label: "Move better and improve daily function" },
    { value: "athletic", label: "Improve athletic conditioning" },
    { value: "independent", label: "Learn to train independently" },
    { value: "unsure", label: "Not sure yet" },
  ];

  const AEROBIC_DURATION_OPTIONS = [
    { value: "none", label: "None" },
    { value: "lt75", label: "Less than 75 minutes" },
    { value: "75_149", label: "75–149 minutes" },
    { value: "150_299", label: "150–299 minutes" },
    { value: "gte300", label: "300 minutes or more" },
    { value: "unsure", label: "Not sure" },
  ];

  const AEROBIC_INTENSITY_OPTIONS = [
    { value: "moderate", label: "Mostly moderate" },
    { value: "vigorous", label: "Mostly vigorous" },
    { value: "mixed", label: "A mixture" },
    { value: "unsure", label: "Not sure" },
  ];

  const STRENGTH_FREQUENCY_OPTIONS = [
    { value: "0", label: "0 days" },
    { value: "1", label: "1 day" },
    { value: "2", label: "2 days" },
    { value: "3_4", label: "3–4 days" },
    { value: "5_plus", label: "5 or more days" },
    { value: "unsure", label: "Not sure" },
  ];

  const HEALTH_CONSIDERATIONS_OPTIONS = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "prefer_not", label: "Prefer not to say" },
  ];

  // ---------------------------------------------------------------------------
  // Canonical payload fed into the existing calculation logic (single path).
  // ---------------------------------------------------------------------------

  const weightKg = canonical.weightKg;
  const heightCm = canonical.heightCm;
  const waistCm = canonical.waistCm;
  const ageNum = parseFloat(form.age);

  const h = heightCm ? heightCm / 100 : 0;
  const bmi = heightCm && weightKg ? weightKg / (h * h) : 0;
  const idealWeightMin = h > 0 ? 18.5 * h * h : 0;
  const idealWeightMax = h > 0 ? 24.9 * h * h : 0;
  const hasGender = form.gender === "male" || form.gender === "female";
  const hasActivity = !!form.activity;
  const rmr = hasGender && ageNum && heightCm && weightKg
    ? form.gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * ageNum - 161
    : 0;
  const activityFactor = hasActivity
    ? {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        veryActive: 1.9,
      }[form.activity]
    : 0;
  const maintenanceCalories = rmr > 0 && activityFactor > 0 ? Math.round(rmr * activityFactor) : 0;
  const protein = maintenanceCalories > 0 ? Math.round((maintenanceCalories * 0.25) / 4) : 0;
  const carbs = maintenanceCalories > 0 ? Math.round((maintenanceCalories * 0.45) / 4) : 0;
  const fat = maintenanceCalories > 0 ? Math.round((maintenanceCalories * 0.3) / 9) : 0;
  const estimatedMaxHR = ageNum ? 220 - ageNum : 0;
  const waterReference = weightKg ? weightKg * 0.033 : 0;
  const hrZones = [
    {
      name: "Very Light",
      intensity: "Recovery / Warm-up",
      minPct: 50,
      maxPct: 60,
      min: estimatedMaxHR > 0 ? Math.round(estimatedMaxHR * 0.5) : 0,
      max: estimatedMaxHR > 0 ? Math.round(estimatedMaxHR * 0.6) : 0,
    },
    {
      name: "Light",
      intensity: "Aerobic Base",
      minPct: 60,
      maxPct: 70,
      min: estimatedMaxHR > 0 ? Math.round(estimatedMaxHR * 0.6) : 0,
      max: estimatedMaxHR > 0 ? Math.round(estimatedMaxHR * 0.7) : 0,
    },
    {
      name: "Moderate",
      intensity: "Aerobic Fitness",
      minPct: 70,
      maxPct: 80,
      min: estimatedMaxHR > 0 ? Math.round(estimatedMaxHR * 0.7) : 0,
      max: estimatedMaxHR > 0 ? Math.round(estimatedMaxHR * 0.8) : 0,
    },
    {
      name: "Vigorous",
      intensity: "Lactate Threshold",
      minPct: 80,
      maxPct: 90,
      min: estimatedMaxHR > 0 ? Math.round(estimatedMaxHR * 0.8) : 0,
      max: estimatedMaxHR > 0 ? Math.round(estimatedMaxHR * 0.9) : 0,
    },
    {
      name: "Very Vigorous",
      intensity: "VO₂ Max Effort",
      minPct: 90,
      maxPct: 100,
      min: estimatedMaxHR > 0 ? Math.round(estimatedMaxHR * 0.9) : 0,
      max: estimatedMaxHR,
    },
  ];

  const waistToHeightRatioRaw = waistCm && heightCm ? waistCm / heightCm : null;
  const waistToHeightRatio = waistToHeightRatioRaw != null
    ? waistToHeightRatioRaw.toFixed(2)
    : null;

  const moderateHRRange = estimatedMaxHR > 0
    ? { min: Math.round(estimatedMaxHR * 0.5), max: Math.round(estimatedMaxHR * 0.7) }
    : null;
  const vigorousHRRange = estimatedMaxHR > 0
    ? { min: Math.round(estimatedMaxHR * 0.7), max: Math.round(estimatedMaxHR * 0.85) }
    : null;

  const getAerobicComparison = () => {
    const { aerobicActivity, aerobicIntensity, age } = form;
    if (!aerobicActivity || aerobicActivity === "unsure" || !age) {
      return { text: "Your answers don't provide enough detail for a reliable comparison.", type: "neutral" };
    }
    if (aerobicActivity === "none") {
      return { text: "Your reported activity may be below the general adult recommendation.", type: "below" };
    }
    if (aerobicIntensity === "moderate" || aerobicIntensity === "vigorous") {
      if (aerobicActivity === "lt75") {
        return { text: "Your reported activity may be below the general adult recommendation.", type: "below" };
      }
      if (aerobicActivity === "75_149") {
        if (aerobicIntensity === "vigorous") {
          return { text: "Your reported activity range meets the minimum general adult vigorous recommendation.", type: "meets" };
        }
        return { text: "Your reported activity may be below the general adult recommendation.", type: "below" };
      }
      if (aerobicActivity === "150_299") {
        return { text: "Your reported activity range is consistent with the general adult aerobic activity recommendation.", type: "meets" };
      }
      if (aerobicActivity === "gte300") {
        return { text: "Your reported activity range exceeds the minimum general adult aerobic activity recommendation.", type: "exceeds" };
      }
    }
    if (aerobicIntensity === "mixed" || aerobicIntensity === "unsure") {
      return { text: "Without knowing the intensity breakdown, a precise comparison isn't possible.", type: "neutral" };
    }
    return { text: "Your answers don't provide enough detail for a reliable comparison.", type: "neutral" };
  };

  const getStrengthComparison = () => {
    const { strengthFrequency } = form;
    if (!strengthFrequency || strengthFrequency === "unsure") {
      return { text: "Your answers don't provide enough detail for a reliable comparison.", type: "neutral" };
    }
    if (strengthFrequency === "0" || strengthFrequency === "1") {
      return { text: "General guidance suggests muscle-strengthening activities on at least two days per week.", type: "below" };
    }
    if (strengthFrequency === "2" || strengthFrequency === "3_4" || strengthFrequency === "5_plus") {
      return { text: "Your reported frequency is consistent with the general recommendation of at least two days per week.", type: "meets" };
    }
    return { text: "Your answers don't provide enough detail for a reliable comparison.", type: "neutral" };
  };

  const aerobicComparison = getAerobicComparison();
  const strengthComparison = getStrengthComparison();

  const getBMICategory = () => {
    if (!bmi || !form.age || form.age < 20) return null;
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Healthy Weight";
    if (bmi < 30) return "Overweight";
    if (bmi < 35) return "Obesity Class 1";
    if (bmi < 40) return "Obesity Class 2";
    return "Obesity Class 3 / Severe Obesity";
  };

  const bmiCategory = getBMICategory();

  const getWaistToHeightInterpretation = () => {
    if (!waistToHeightRatioRaw) return null;
    if (!bmi || !form.age || form.age < 20)
      return { category: null, note: "Not interpreted for ages below 20 or when BMI is unavailable." };
    if (bmi >= 35) return { category: null, bmiNote: true };
    if (waistToHeightRatioRaw >= 0.60) return { category: "High central adiposity" };
    if (waistToHeightRatioRaw >= 0.50) return { category: "Increased central adiposity" };
    if (waistToHeightRatioRaw >= 0.40) return { category: "Lower central-adiposity category" };
    return { category: null, note: "Below the commonly referenced 0.40 central-adiposity reference point." };
  };

  const waistInterpretation = getWaistToHeightInterpretation();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <button
        onClick={handleBack}
        className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Back to previous page"
      >
        <span className="mr-2">←</span> Back
      </button>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Start Your Transformation
        </h1>
        <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
          {[
            { key: "metric", label: "Metric", fullLabel: "Metric (kg, cm)" },
            { key: "imperial", label: "Imperial", fullLabel: "Imperial (lb, ft/in)" },
          ].map(({ key, label, fullLabel }) => (
            <button
              key={key}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                unitSystem === key
                  ? "bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              }`}
              onClick={() => handleUnitChange(key)}
              title={fullLabel}
              aria-pressed={unitSystem === key}
            >
              <span className="sm:hidden">{label}</span>
              <span className="hidden sm:inline">{fullLabel}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 mb-6">
        Enter a few basic details to explore your estimated fitness-related metrics.
      </p>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Basic Details</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Enter a few basic details to explore your estimated fitness-related metrics.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              <div>
                <label
                  htmlFor="transformation-age"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Age (years)
                </label>
                <input
                  id="transformation-age"
                  type="number"
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  min="1"
                  max="120"
                  placeholder="e.g., 30"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  aria-invalid={errors.age ? "true" : "false"}
                  aria-describedby={errors.age ? "age-error" : undefined}
                />
                {errors.age && (
                  <p id="age-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.age}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="transformation-height"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Height {unitSystem === "metric" ? "(cm)" : "(feet)"}
                </label>
                {unitSystem === "metric" ? (
                  <input
                    id="transformation-height"
                    type="number"
                    name="height"
                    value={heightMetricDisplay}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    min="50"
                    max="250"
                    placeholder="e.g., 175"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    aria-invalid={errors.height ? "true" : "false"}
                    aria-describedby={errors.height ? "height-error" : undefined}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      id="transformation-height-ft"
                      type="number"
                      name="heightFt"
                      value={heightImperialFt}
                      onChange={(e) => handleHeightFtChange(e.target.value)}
                      min="0"
                      step="1"
                      placeholder="e.g., 5"
                      className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                      aria-invalid={errors.height ? "true" : "false"}
                      aria-describedby={errors.height ? "height-error" : undefined}
                    />
                    <input
                      id="transformation-height-in"
                      type="number"
                      name="heightIn"
                      value={heightImperialIn}
                      onChange={(e) => handleHeightInChange(e.target.value)}
                      min="0"
                      max="11"
                      step="0.1"
                      placeholder="e.g., 9"
                      className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                      aria-invalid={errors.height ? "true" : "false"}
                      aria-describedby={errors.height ? "height-error" : undefined}
                    />
                  </div>
                )}
                {errors.height && (
                  <p id="height-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.height}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="transformation-weight"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Weight {unitSystem === "metric" ? "(kg)" : "(lb)"}
                </label>
                <input
                  id="transformation-weight"
                  type="number"
                  name="weight"
                  value={weightDisplay}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  min="20"
                  max="300"
                  step="0.1"
                  placeholder={unitSystem === "metric" ? "e.g., 70" : "e.g., 154"}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  aria-invalid={errors.weight ? "true" : "false"}
                  aria-describedby={errors.weight ? "weight-error" : undefined}
                />
                {errors.weight && (
                  <p id="weight-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.weight}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="transformation-gender"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Equation-Specific Sex Input
                </label>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Used for formulas that require a sex-related coefficient (e.g., calorie estimation).
                </p>
                <select
                  id="transformation-gender"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">Select the equation input</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                {errors.gender && (
                  <p id="gender-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.gender}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="transformation-activity"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                General Activity Level
              </label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This helps estimate your daily energy requirements. Choose the option closest to your overall lifestyle.
              </p>
              <select
                id="transformation-activity"
                name="activity"
                value={form.activity}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="">Select your activity level</option>
                {ACTIVITY_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label} — {level.description}
                  </option>
                ))}
              </select>
              {errors.activity && (
                <p id="activity-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.activity}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Fitness Goals & Activity</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              <div>
                <label
                  htmlFor="transformation-goal"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  What would you like to work on?
                </label>
                <select
                  id="transformation-goal"
                  name="primaryGoal"
                  value={form.primaryGoal}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a goal</option>
                  {GOAL_OPTIONS.map((goal) => (
                    <option key={goal.value} value={goal.value}>
                      {goal.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="transformation-aerobic"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  How much aerobic activity do you usually do each week?
                </label>
                <select
                  id="transformation-aerobic"
                  name="aerobicActivity"
                  value={form.aerobicActivity}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">Select duration</option>
                  {AEROBIC_DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="transformation-intensity"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Typical intensity
                </label>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Moderate: brisk walking or cycling at an easy-to-moderate pace. Vigorous: running or similar activities requiring considerably more effort.
                </p>
                <select
                  id="transformation-intensity"
                  name="aerobicIntensity"
                  value={form.aerobicIntensity}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">Select intensity</option>
                  {AEROBIC_INTENSITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="transformation-strength"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  How many days per week do you perform strength-training exercises?
                </label>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Examples include weights, resistance bands, bodyweight exercises and other muscle-strengthening activities.
                </p>
                <select
                  id="transformation-strength"
                  name="strengthFrequency"
                  value={form.strengthFrequency}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">Select frequency</option>
                  {STRENGTH_FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add More Details (Optional)</h2>
                <span className="text-gray-500 dark:text-gray-400">Click to expand</span>
              </summary>
              <div className="mt-4 space-y-6">
                <div>
                  <label
                    htmlFor="transformation-waist"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Waist Circumference {unitSystem === "metric" ? "(cm)" : "(in)"}
                  </label>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Use a flexible tape around your waist, without compressing the skin. Measure after breathing out normally.
                  </p>
                  <input
                    id="transformation-waist"
                    type="number"
                    name="waist"
                    value={waistDisplay}
                    onChange={(e) => handleWaistChange(e.target.value)}
                    min="40"
                    max="200"
                    step="0.1"
                    placeholder={unitSystem === "metric" ? "e.g., 85" : "e.g., 33.5"}
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    aria-invalid={errors.waist ? "true" : "false"}
                    aria-describedby={errors.waist ? "waist-error" : undefined}
                  />
                  {errors.waist && (
                    <p id="waist-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                      {errors.waist}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Do you have any health-related considerations or exercise restrictions that may affect your exercise needs?
                  </label>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Some fitness estimates may not apply to everyone. You do not need to share a diagnosis or medical history here.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {HEALTH_CONSIDERATIONS_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center">
                        <input
                          type="radio"
                          name="healthConsiderations"
                          value={opt.value}
                          checked={form.healthConsiderations === opt.value}
                          onChange={handleChange}
                          className="mr-2 h-4 w-4 text-blue-600"
                        />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full sm:w-auto rounded bg-blue-600 px-8 py-3 font-bold text-white shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              View My Fitness Snapshot
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Fitness & Health Snapshot</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Explore your estimated fitness-related metrics, understand general reference values, and discover areas you may want to work on.
              </p>
            </div>
            <button
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Adjust Inputs
            </button>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </span>
              Body Measurements
            </h3>
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
              <div className="rounded-xl bg-white p-5 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Body Mass Index</h4>
                    <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{bmi > 0 ? bmi.toFixed(1) : "—"}</p>
                    {bmiCategory && <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400">{bmiCategory}</p>}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1 bg-gray-50 dark:bg-gray-900/50 rounded">kg/m²</span>
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  BMI is a screening measure of weight relative to height. It does not directly measure body fat or overall fitness.
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Weight-for-Height Reference</h4>
                    <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {idealWeightMin > 0 ? `${idealWeightMin.toFixed(1)} – ${idealWeightMax.toFixed(1)} kg` : "—"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1 bg-gray-50 dark:bg-gray-900/50 rounded">BMI 18.5–24.9</span>
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Population-level reference based on BMI 18.5–24.9. Not an individualized target.
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Waist-to-Height Ratio</h4>
                    <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                      {waistToHeightRatio ? waistToHeightRatio : "—"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1 bg-gray-50 dark:bg-gray-900/50 rounded">ratio</span>
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  {!waistToHeightRatio
                    ? "Optional. Provide waist circumference to calculate."
                    : waistInterpretation?.bmiNote
                      ? "Shown for reference. This NICE classification is intended for adults with BMI below 35 and may not provide an additional useful interpretation at higher BMI values."
                      : waistInterpretation?.category
                        ? `${waistInterpretation.category}. NICE guidance applies to adults with BMI below 35. Not a diagnosis.`
                        : waistInterpretation?.note
                          ? `${waistInterpretation.note} NICE guidance applies to adults with BMI below 35. Not a diagnosis.`
                          : "Measures central adiposity. NICE guidance applies to adults with BMI below 35. Not a diagnosis."}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </span>
              Physical Activity
            </h3>
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              <div className="rounded-xl bg-white p-5 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Aerobic Activity</h4>
                <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {form.aerobicActivity
                    ? AEROBIC_DURATION_OPTIONS.find((o) => o.value === form.aerobicActivity)?.label
                    : "Not provided"}
                </p>
                {form.aerobicIntensity && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Intensity: {AEROBIC_INTENSITY_OPTIONS.find((o) => o.value === form.aerobicIntensity)?.label}</p>}
                <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Comparison:</strong> {aerobicComparison.text}
                  </p>
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  WHO adult guideline: 150–300 min moderate or 75–150 min vigorous per week. Based on approximate ranges; not exact.
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Strength Training</h4>
                <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {form.strengthFrequency
                    ? STRENGTH_FREQUENCY_OPTIONS.find((o) => o.value === form.strengthFrequency)?.label
                    : "Not provided"}
                </p>
                <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Comparison:</strong> {strengthComparison.text}
                  </p>
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  General guidance: muscle-strengthening activities on &gt;&gt;2 days/week. Frequency alone doesn&apos;t guarantee all guideline requirements.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </span>
              Energy & Nutrition
            </h3>
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
              <div className="rounded-xl bg-white p-5 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Estimated Maintenance Calories</h4>
                <p className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">{maintenanceCalories > 0 ? maintenanceCalories : "—"} kcal/day</p>
                {maintenanceCalories > 0 ? (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Mifflin–St Jeor resting energy estimate × activity factor. Estimated maintenance, not a dietary prescription.</p>
                ) : (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Please provide your equation-specific input and activity level to calculate maintenance calories.</p>
                )}
              </div>

              <div className="rounded-xl bg-white p-5 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Example Macronutrient Distribution</h4>
                {maintenanceCalories > 0 ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Protein</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">{protein}g ({(protein * 4 / maintenanceCalories * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Carbohydrates</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{carbs}g ({(carbs * 4 / maintenanceCalories * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Fat</span>
                      <span className="font-semibold text-yellow-600 dark:text-yellow-400">{fat}g ({(fat * 9 / maintenanceCalories * 100).toFixed(0)}%)</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Macronutrient distribution requires a valid maintenance calorie estimate.</p>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Illustrative 25/45/30 split. Individual needs vary by goals and preferences.</p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Water Intake Reference</h4>
                <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">{waterReference > 0 ? waterReference.toFixed(1) : "—"} L/day</p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Approximate ~33 ml/kg body weight heuristic. Total water reference from beverages and food, not an individual prescription.</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </span>
              Exercise Intensity
            </h3>
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
              <div className="rounded-xl bg-white p-5 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Estimated Maximum Heart Rate</h4>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{estimatedMaxHR > 0 ? `${estimatedMaxHR} bpm` : "—"}</p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Predicted using 220 − age. Population-level estimate; actual max HR varies significantly.</p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 border-l-4 border-emerald-500">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Moderate Intensity</h4>
                <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {moderateHRRange ? `${moderateHRRange.min} – ${moderateHRRange.max} bpm` : "—"}
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Talk Test: Talking is possible, but singing comfortably may be difficult.</p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">~50–70% of estimated max HR.</p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 border-l-4 border-red-500">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Vigorous Intensity</h4>
                <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                  {vigorousHRRange ? `${vigorousHRRange.min} – ${vigorousHRRange.max} bpm` : "—"}
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Talk Test: Speaking more than a few words may require pausing for breath.</p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">~70–85% of estimated max HR.</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <ResultExplanation
              whatItMeans={
                <>
                  Your Fitness & Health Snapshot summarizes estimated metrics across four areas. 
                  <strong>Body Measurements:</strong> Your BMI of {bmi > 0 ? bmi.toFixed(1) : "—"} 
                  {bmiCategory ? `(${bmiCategory})` : ""} is a screening measure, not a direct measure of body fat or fitness. 
                  Your weight-for-height reference range of {idealWeightMin > 0 ? `${idealWeightMin.toFixed(1)}–${idealWeightMax.toFixed(1)} kg` : "—"} 
                  is based on the adult BMI interval 18.5–24.9.
                  {waistToHeightRatio ? `Your waist-to-height ratio of ${waistToHeightRatio} ` : "Waist-to-height ratio was not calculated (optional waist measurement not provided)."}
                  <strong>Physical Activity:</strong> Your reported aerobic activity ({form.aerobicActivity ? AEROBIC_DURATION_OPTIONS.find((o) => o.value === form.aerobicActivity)?.label.toLowerCase() : "not provided"})
                  and strength training frequency ({form.strengthFrequency ? STRENGTH_FREQUENCY_OPTIONS.find((o) => o.value === form.strengthFrequency)?.label.toLowerCase() : "not provided"})
                  are compared with general adult guidelines.
                  <strong>Energy & Nutrition:</strong> Estimated daily maintenance calories of {maintenanceCalories > 0 ? maintenanceCalories : "not available"} kcal/day
                  (Mifflin–St Jeor resting energy estimate × activity factor). {maintenanceCalories > 0 ? `Example macronutrient distribution of ${protein}g protein / ${carbs}g carbs / ${fat}g fat (25%/45%/30% split).` : "Macronutrient distribution requires a valid maintenance calorie estimate."} General hydration estimate of {waterReference > 0 ? waterReference.toFixed(1) : "not available"} L/day.
                  <strong>Exercise Intensity:</strong> Predicted max HR {estimatedMaxHR > 0 ? estimatedMaxHR + " bpm" : "—"} (220 − age),
                  moderate range {moderateHRRange ? moderateHRRange.min + "–" + moderateHRRange.max + " bpm" : "—"}, 
                  vigorous range {vigorousHRRange ? vigorousHRRange.min + "–" + vigorousHRRange.max + " bpm" : "—"}.
                </>
              }
              whyItMatters={
                <>
                  These estimates work together to give you a general picture. Body measurements provide context for weight-related metrics. 
                  Physical activity comparison helps identify areas to focus on. Energy estimates offer a reference for nutrition planning. 
                  Exercise intensity ranges help structure training. The Talk Test is a practical way to gauge intensity without a monitor: 
                  at moderate intensity you can talk but not sing comfortably; at vigorous intensity you may only manage a few words before pausing for breath.
                </>
              }
              limitations={
                <>
                  <strong>Body Measurements:</strong> BMI and weight-for-height are population-level screening references, not individualized targets. 
                  They do not account for body composition, muscle mass, bone density, or individual health status. 
                  Adult references are not appropriate for children/adolescents, pregnant/postpartum individuals, older adults with sarcopenia/frailty, 
                  athletes with high muscle mass, or conditions affecting fluid balance. 
                  Waist-to-height ratio: NICE guidance (ratio &gt;=0.5) applies to adults with BMI &lt;35; it is not a diagnosis of cardiovascular disease or diabetes.
                  <br /><br />
                  <strong>Physical Activity:</strong> Comparisons use approximate duration ranges and broad intensity categories.
                  Exact moderate-equivalent minutes are not calculated when intensity breakdown is unavailable.
                  Strength frequency alone doesn&apos;t confirm all guideline requirements (muscle groups, effort matter).
                  Age-specific guidance for minors/older adults is not implemented here.
                  <br /><br />
                  <strong>Energy & Nutrition:</strong> Calorie estimate uses Mifflin–St Jeor (1990) resting energy estimate with population-average activity multipliers.
                  Not a weight-loss/gain prescription. Macronutrient split (25/45/30%) is illustrative only.
                  Hydration (~33 ml/kg) is a rough heuristic; total water includes water from beverages and food. Heart failure, kidney disease, or fluid restrictions require medical guidance.
                  <br /><br />
                  <strong>Exercise Intensity:</strong> Max HR (220 - age) is a population prediction; actual varies significantly. 
                  Zone percentages are general ranges, not measured thresholds. 
                  Cardiovascular conditions, heart-rate-altering medications (e.g., beta blockers), pregnancy, 
                  and individualized exercise restrictions may make standard ranges inappropriate. 
                  <strong>Exercise safety:</strong> Stop and seek urgent care for chest pain/pressure, fainting/severe dizziness, 
                  unusual severe breathlessness, or other concerning symptoms. Contacting NutriSculpt does not replace emergency care.
                </>
              }
            />
          </div>

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
                  This transformation summary combines multiple general
                  estimates. It is not a personalized medical or dietary
                  prescription. Do not use these numbers as the sole basis for
                  significant dietary or exercise changes — especially if you
                  have heart conditions, kidney disease, diabetes, eating
                  disorder history, or are recovering from injury. A qualified
                  healthcare professional or certified trainer can help tailor
                  these general targets to your specific needs.
                </>
              }
            />
          </div>

          <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">What Would You Like to Work On Next?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Your snapshot is a starting point. Explore coaching options that align with your goals, or speak with us about the support you&apos;re looking for.
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Your selected goal:</p>
                <p className="mt-1 text-gray-900 dark:text-white">{form.primaryGoal ? GOAL_LABELS[form.primaryGoal] : "Not selected"}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Suggested NutriSculpt service:</p>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{(() => { const category = ENQUIRY_SERVICE_OPTIONS.find((o) => o.value === selectedServiceCategory); return category?.label || "Select a category"; })()}</p>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {selectedServiceCategory !== "not-sure"
                          ? (() => { const c = SERVICE_CATEGORIES.find((c) => c.slug === selectedServiceCategory); return c?.shortDescription || ""; })()
                          : "Let us help you find the right coaching approach for your needs."}
                      </p>
                    </div>
                  </div>
                  <select
                    value={selectedServiceCategory}
                    onChange={(e) => setSelectedServiceCategory(e.target.value)}
                    className="flex-shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    {ENQUIRY_SERVICE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href={`/expert-connect?category=${encodeURIComponent(selectedServiceCategory)}&goal=${encodeURIComponent(form.primaryGoal)}&source=${encodeURIComponent(resolvedSource)}&back=${encodeURIComponent("/transformation")}`}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3 font-bold text-white shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  Connect to an Expert
                </Link>
                {selectedServiceCategory !== "not-sure" && (
                  <Link
                    href={`/services/category/${selectedServiceCategory}?source=${encodeURIComponent(resolvedSource)}&back=${encodeURIComponent("/transformation")}`}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-8 py-3 font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Explore This Service
                  </Link>
                )}
                {selectedServiceCategory === "not-sure" && (
                  <Link
                    href="/#services"
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-8 py-3 font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    View All Services
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      </div>
  );
}

export default function Transformation() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10">Loading...</div>}>
      <TransformationForm />
    </Suspense>
  );
}
