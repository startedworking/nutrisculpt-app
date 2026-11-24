// Pure calculation helpers shared by the calculators and their tests.
// These are deliberately free of React/DOM code so they can be tested
// deterministically with `node --test`.

export const round = (value, digits = 1) => {
  const p = Math.pow(10, digits);
  return Math.round(value * p) / p;
};

// Conversion constants (exact definitions used by the calculators).
export const KG_PER_LB = 2.20462;
export const FL_OZ_PER_L = 33.814;
export const CUPS_PER_L = 4.227;

export const kgToLb = (kg) => kg * KG_PER_LB;
export const lbToKg = (lb) => lb / KG_PER_LB;

// ---------------------------------------------------------------------------
// Exact unit-conversion constants and helpers (Transformation input boundary).
//
// Exact standard conversions:
//   1 kg = 2.2046226218 lb
//   1 inch = 2.54 cm
//   1 foot = 12 inches
//
// Canonical internal units: weight → kilograms, height → centimeters,
// waist → centimeters. These helpers normalize at the input boundary so a
// single calculation path serves both Metric and Imperial.
// ---------------------------------------------------------------------------

export const KG_PER_LB_EXACT = 2.2046226218;
export const CM_PER_INCH = 2.54;
export const INCHES_PER_FOOT = 12;

export const kgToLbExact = (kg) => kg * KG_PER_LB_EXACT;
export const lbToKgExact = (lb) => lb / KG_PER_LB_EXACT;

// ---------------------------------------------------------------------------
// Shared finite-number parser (input reliability foundation).
//
// Calculator input handlers receive raw values from <input type="number">:
// blank → null, a number, or NaN (e.g. "abc", "7.", "7.5"). Blank and zero
// must remain distinct states, and NaN/Infinity must never reach calculation
// or rendering.
//
// parseFiniteNumber returns:
//   null  → blank / null / undefined / non-numeric / NaN / ±Infinity
//   number → a finite parsed number (zero is a valid number)
// ---------------------------------------------------------------------------

export const parseFiniteNumber = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const cmToIn = (cm) => cm / CM_PER_INCH;
export const inToCm = (inches) => inches * CM_PER_INCH;

export const cmToFeetInches = (cm) => {
  if (!Number.isFinite(cm) || cm <= 0) return { ft: 0, inches: 0 };
  const totalInches = cm / CM_PER_INCH;
  const ft = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = totalInches % INCHES_PER_FOOT;
  return { ft, inches };
};

export const feetInchesToCm = (ft, inches) => {
  if (!Number.isFinite(ft) || !Number.isFinite(inches)) return null;
  return (ft * INCHES_PER_FOOT + inches) * CM_PER_INCH;
};
export const literToOz = (liters) => liters * FL_OZ_PER_L;
export const literToCups = (liters) => liters * CUPS_PER_L;
export const ozToLiter = (oz) => oz / FL_OZ_PER_L;
export const cupsToLiter = (cups) => cups / CUPS_PER_L;

// ---------------------------------------------------------------------------
// Hydration
//
// Reference values are population Adequate Intakes (AI) for total water from
// all beverages and food (Institute of Medicine, 2004). They describe a
// population, not an individual prescription.
//
// Sex-specific adult AI values apply from age 19. Pregnancy and lactation are
// separate life-stage references; there is no combined AI for both together.
// ---------------------------------------------------------------------------

export const ADULT_WATER_AI = {
  male: 3.7,
  female: 2.7,
  pregnancy: 3.0,
  lactation: 3.8,
};

export function waterReferenceFor({ sex, pregnant = false, breastfeeding = false }) {
  // Require an explicit sex selection; do not fall back to female.
  if (sex !== "male" && sex !== "female") {
    return null;
  }
  // Pregnancy and lactation are separate life-stage references; there is no
  // published combined AI for both together. They apply to female only.
  if (pregnant && breastfeeding) {
    return null;
  }
  if (pregnant) {
    if (sex !== "female") return null;
    return { total: ADULT_WATER_AI.pregnancy, basis: "pregnancy" };
  }
  if (breastfeeding) {
    if (sex !== "female") return null;
    return { total: ADULT_WATER_AI.lactation, basis: "lactation" };
  }
  return {
    total: sex === "male" ? ADULT_WATER_AI.male : ADULT_WATER_AI.female,
    basis: sex === "male" ? "adult male" : "adult female",
  };
}

// Convert one unrounded litre value into every displayed unit, rounding each
// only once so the units stay mathematically consistent.
export function waterUnits(liters) {
  if (!Number.isFinite(liters) || liters <= 0) return null;
  return {
    liters: round(liters, 1),
    ml: round(liters * 1000, 0),
    oz: round(literToOz(liters), 0),
    cups: round(literToCups(liters), 1),
  };
}

// ---------------------------------------------------------------------------
// Heart rate
//
// Adult age-predicted maximum heart rate methods. All methods are estimates
// with wide individual variation; a measured maximum is more accurate.
// ---------------------------------------------------------------------------

export const MAX_HR_METHODS = [
  {
    id: "tanaka",
    name: "Tanaka (208 − 0.7 × age)",
    short: "Tanaka",
    formula: (age) => 208 - 0.7 * age,
    requiresSex: false,
    note: "Default adult age-prediction equation; best validated across adults.",
  },
  {
    id: "standard",
    name: "Traditional (220 − age)",
    short: "220 − age",
    formula: (age) => 220 - age,
    requiresSex: false,
    note: "Widely used but less accurate, especially in older adults.",
  },
  {
    id: "gulati",
    name: "Gulati (206 − 0.88 × age)",
    short: "Gulati",
    formula: (age) => 206 - 0.88 * age,
    requiresSex: "female",
    note: "Derived in women; not validated for men.",
  },
];

export const HR_INTENSITY_RANGES = {
  // Percent-of-maximum-heart-rate reference bands (method-specific; do not
  // apply to Heart Rate Reserve).
  percentMax: {
    moderate: { min: 65, max: 75 },
    vigorous: { min: 76, max: 96 },
  },
  // Heart Rate Reserve / Karvonen reference bands.
  hrr: {
    moderate: { min: 40, max: 59 },
    vigorous: { min: 60, max: 89 },
  },
};

export function methodById(methodId) {
  return MAX_HR_METHODS.find((m) => m.id === methodId) || null;
}

export function predictMaxHR({ methodId, age, sex }) {
  const method = methodById(methodId);
  if (!method) return null;
  // Tanaka and 220−age do not require sex; Gulati is women-only.
  if (method.requiresSex && sex !== method.requiresSex) return null;
  if (!Number.isFinite(age) || age < 18) return null;
  // Adult equations cross-validated roughly to age 81; beyond that the
  // estimate remains computable but is extrapolated with substantial error.
  const value = method.formula(age);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

// Exercise-intensity reference bands (ACSM-aligned). These are estimates,
// not measured physiological thresholds, and published guidance varies.
const roundPct = (base, pct) => Math.round(base * (pct / 100));

export function calculatePercentMaxRanges(maxHR) {
  if (!Number.isFinite(maxHR) || maxHR <= 0) return null;
  const { moderate, vigorous } = HR_INTENSITY_RANGES.percentMax;
  return {
    moderate: {
      min: roundPct(maxHR, moderate.min),
      max: roundPct(maxHR, moderate.max),
    },
    vigorous: {
      min: roundPct(maxHR, vigorous.min),
      max: roundPct(maxHR, vigorous.max),
    },
  };
}

export function calculateHrrRanges(maxHR, restingHR) {
  if (!Number.isFinite(maxHR) || !Number.isFinite(restingHR)) return null;
  if (maxHR <= restingHR) return null;
  const reserve = maxHR - restingHR;
  const { moderate, vigorous } = HR_INTENSITY_RANGES.hrr;
  return {
    moderate: {
      min: roundPct(reserve, moderate.min) + restingHR,
      max: roundPct(reserve, moderate.max) + restingHR,
    },
    vigorous: {
      min: roundPct(reserve, vigorous.min) + restingHR,
      max: roundPct(reserve, vigorous.max) + restingHR,
    },
  };
}

// Backward-compatible zone table retained for any legacy consumers. New code
// should use calculatePercentMaxRanges / calculateHrrRanges instead.
export const HR_ZONES_LEGACY = [
  {
    zone: 1,
    name: "Recovery",
    percentage: { min: 50, max: 60 },
  },
  {
    zone: 2,
    name: "Aerobic Base",
    percentage: { min: 60, max: 70 },
  },
  {
    zone: 3,
    name: "Aerobic",
    percentage: { min: 70, max: 80 },
  },
  {
    zone: 4,
    name: "Lactate Threshold",
    percentage: { min: 80, max: 90 },
  },
  {
    zone: 5,
    name: "Maximal Effort",
    percentage: { min: 90, max: 100 },
  },
];

export function computeHrZones({ maxHR, restingHR, zones }) {
  if (!zones || !zones.length) return null;
  if (!Number.isFinite(maxHR) || maxHR <= 0) return null;
  return zones.map((zone) => {
    const min = roundPct(maxHR, zone.percentage.min);
    const max = roundPct(maxHR, zone.percentage.max);
    return {
      ...zone,
      maxHR: { min, max },
      karvonen: restingHR != null && Number.isFinite(restingHR) && maxHR > restingHR
        ? {
            min: Math.round(restingHR + (zone.percentage.min / 100) * (maxHR - restingHR)),
            max: Math.round(restingHR + (zone.percentage.max / 100) * (maxHR - restingHR)),
          }
        : null,
    };
  });
}

export function validateHeartRateInputs({
  age,
  restingHR,
  maxHR,
  useCustomMaxHR,
  methodId,
  sex,
}) {
  const errors = {};
  const method = methodById(methodId);

  if (useCustomMaxHR) {
    // Custom measured max HR is authoritative; age and sex are not needed.
    if (!Number.isFinite(maxHR) || maxHR < 120 || maxHR > 250) {
      errors.maxHR = "Enter a measured maximum heart rate between 120 and 250 bpm.";
    }
    const predicted = Number.isFinite(maxHR) ? maxHR : null;
    if (
      Number.isFinite(restingHR) &&
      Number.isFinite(predicted) &&
      predicted <= restingHR
    ) {
      errors.reserve = "Maximum heart rate must be higher than resting heart rate.";
    }
    return { valid: Object.keys(errors).length === 0, errors, predicted, method };
  }

  // Predicted path.
  if (!method) {
    errors.method = "Invalid calculation method.";
    return { valid: false, errors, predicted: null, method: null };
  }
  if (method.requiresSex && sex !== method.requiresSex) {
    errors.sex = `${method.short} is derived for ${
      method.requiresSex === "female" ? "women" : method.requiresSex
    } only. Choose that sex or another method.`;
  }
  if (!Number.isFinite(age) || age < 18) {
    errors.age = "Enter an age of 18 or older.";
  }
  if (sex !== "" && sex !== "male" && sex !== "female") {
    errors.sex = "Select a valid sex.";
  }

  const predicted = predictMaxHR({ methodId, age, sex });

  // Resting HR is optional. When provided, the predicted max HR must exceed it
  // for a valid Heart Rate Reserve.
  if (
    Number.isFinite(restingHR) &&
    Number.isFinite(predicted) &&
    predicted <= restingHR
  ) {
    errors.reserve = "Maximum heart rate must be higher than resting heart rate.";
  }

  return { valid: Object.keys(errors).length === 0, errors, predicted, method };
}

// ---------------------------------------------------------------------------
// One-repetition maximum
// ---------------------------------------------------------------------------

export const ONE_RM_FORMULAS = [
  {
    id: "brzycki",
    name: "Brzycki",
    formula: (weight, reps) => (weight * 36) / (37 - reps),
    note: "Widely used; most stable at low repetitions.",
  },
  {
    id: "epley",
    name: "Epley",
    formula: (weight, reps) => weight * (1 + reps / 30),
    note: "Common alternative; tends to read slightly higher at low reps.",
  },
  {
    id: "lander",
    name: "Lander",
    formula: (weight, reps) => weight / (1.013 - 0.0267123 * reps),
    note: "Validated in several submaximal studies.",
  },
  {
    id: "lombardi",
    name: "Lombardi",
    formula: (weight, reps) => weight * Math.pow(reps, 0.1),
    note: "Simple power-law model.",
  },
  {
    id: "mayhew",
    name: "Mayhew",
    formula: (weight, reps) => (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps)),
    note: "Exponential model; can read high at very low reps.",
  },
  {
    id: "oconnor",
    name: "O'Conner",
    formula: (weight, reps) => weight * (1 + 0.025 * reps),
    note: "Linear model; tends to underestimate at higher reps.",
  },
  {
    id: "wathan",
    name: "Wathan",
    formula: (weight, reps) => (100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps)),
    note: "Exponential model; often performs well across a wide range.",
  },
];

export const PRIMARY_ONE_RM_ID = "brzycki";
export const ONE_RM_RELIABLE_MAX_REPS = 10;
export const ONE_RM_UNSUPPORTED_MAX_REPS = 15;

// NutriSculpt product applicability policy for repetition counts.
//
// 1–10 reps: better-supported range (estimate allowed).
// 11–15 reps: lower-confidence warning (estimate allowed).
// >15 reps: unsupported (no estimate).
//
// 15 is a NutriSculpt product boundary, not a universal biological cutoff.
// Evidence supports substantially greater caution once rep counts exceed
// about 10; no exact biological cutoff is implied.
export function evaluateOneRmInputPolicy(reps) {
  if (!Number.isFinite(reps) || !Number.isInteger(reps) || reps < 1) {
    return { allowed: false, level: "invalid", label: "Invalid reps" };
  }
  if (reps <= ONE_RM_RELIABLE_MAX_REPS) {
    return {
      allowed: true,
      level: "recommended",
      label: "Better-supported range",
      note: "Estimates are generally more dependable when based on 10 or fewer repetitions.",
    };
  }
  if (reps <= ONE_RM_UNSUPPORTED_MAX_REPS) {
    return {
      allowed: true,
      level: "caution",
      label: "Lower-confidence estimate",
      note: "Prediction error tends to increase at higher repetition counts. Treat this result as a rough programming estimate.",
    };
  }
  return {
    allowed: false,
    level: "unsupported",
    label: "Not supported",
    note: "For a more useful 1RM estimate, use a load you can perform for 15 or fewer repetitions. Estimates are better supported at 10 or fewer.",
  };
}

export function estimateOneRM(weight, reps, formulaId = PRIMARY_ONE_RM_ID) {
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isFinite(reps) || reps < 1 || !Number.isInteger(reps)) return null;
  const formula = ONE_RM_FORMULAS.find((f) => f.id === formulaId);
  if (!formula) return null;
  if (formula.id === "brzycki" && reps >= 37) return null;
  const value = formula.formula(weight, reps);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function estimateAllOneRM(weight, reps) {
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isFinite(reps) || reps < 1 || !Number.isInteger(reps)) return null;
  const out = {};
  for (const formula of ONE_RM_FORMULAS) {
    const value = estimateOneRM(weight, reps, formula.id);
    if (value !== null) out[formula.id] = value;
  }
  return out;
}

export function oneRmReliability(reps) {
  if (!Number.isFinite(reps) || reps < 1 || !Number.isInteger(reps)) return null;
  if (reps <= ONE_RM_RELIABLE_MAX_REPS) {
    return {
      level: "recommended",
      label: "Better-supported range",
      note: "Submaximal 1RM prediction is generally more dependable when the estimate is based on 10 or fewer repetitions.",
    };
  }
  if (reps <= ONE_RM_UNSUPPORTED_MAX_REPS) {
    return {
      level: "caution",
      label: "Lower-confidence estimate",
      note: "Prediction error tends to increase at higher repetition counts. Treat this result as a rough programming estimate.",
    };
  }
  return {
    level: "unsupported",
    label: "Not supported",
    note: "For a more useful 1RM estimate, use a load you can perform for 15 or fewer repetitions. Estimates are better supported at 10 or fewer.",
  };
}

// ---------------------------------------------------------------------------
// Body Mass Index (BMI)
//
// BMI = weight (kg) / height (m)^2. Classification thresholds follow the WHO
// adult categories: underweight < 18.5, normal 18.5–24.9, overweight
// 25–29.9, obese ≥ 30. The healthy weight range is derived from a BMI of
// 18.5–24.9 for a given height.
// ---------------------------------------------------------------------------

export const BMI_CATEGORIES = [
  { min: 0, max: 18.5, label: "Underweight", category: "underweight", color: "text-amber-500" },
  { min: 18.5, max: 25, label: "Healthy Weight", category: "normal", color: "text-emerald-600" },
  { min: 25, max: 30, label: "Overweight", category: "overweight", color: "text-orange-600" },
  { min: 30, max: Infinity, label: "Obesity", category: "obesity", color: "text-rose-600" },
];

export function calculateBMI(weightKg, heightCm) {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const value = weightKg / (heightM * heightM);
  return Number.isFinite(value) && value > 0 ? value : null;
}

// CDC adult BMI categories apply to age 20+.
// Ages 2-19 require sex- and age-specific BMI-for-age percentile interpretation.
// Under age 2: no standard BMI category interpretation.
// This function returns adult categories only when age >= 20; otherwise it
// signals that categorical interpretation is not applicable.
export function classifyBMI(bmi, age) {
  if (!Number.isFinite(bmi) || bmi <= 0) {
    return { label: "—", category: "unknown", color: "text-gray-500" };
  }
  const isAdult = Number.isFinite(age) && age >= 20;
  if (!isAdult) {
    return {
      label: "—",
      category: "pediatric",
      color: "text-gray-500",
      note: "BMI-for-age percentile interpretation is required for ages 2-19.",
    };
  }
  for (const category of BMI_CATEGORIES) {
    if (bmi >= category.min && bmi < category.max) {
      if (category.label === "Obesity") {
        let obesityClass;
        if (bmi < 35) {
          obesityClass = { label: "Class 1 Obesity" };
        } else if (bmi < 40) {
          obesityClass = { label: "Class 2 Obesity" };
        } else {
          obesityClass = { label: "Class 3 Obesity / Severe Obesity" };
        }
        return { ...category, obesityClass };
      }
      return category;
    }
  }
  return BMI_CATEGORIES[BMI_CATEGORIES.length - 1];
}

export function bmiHealthyRange(heightCm) {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const minKg = 18.5 * heightM * heightM;
  const maxKg = 24.9 * heightM * heightM;
  return {
    min: { kg: round(minKg, 1), lb: round(kgToLb(minKg), 1) },
    max: { kg: round(maxKg, 1), lb: round(kgToLb(maxKg), 1) },
  };
}

// ---------------------------------------------------------------------------
// Weight-for-Height Reference (Reference Weight Estimates)
//
// Historical estimation formulas (height in inches above 5 ft = 60 in):
//   Robinson: men 52 + 1.9×(in−60), women 49 + 1.7×(in−60)
//   Miller:   men 56.2 + 1.41×(in−60), women 53.1 + 1.36×(in−60)
//   Devine:   men 50 + 2.3×(in−60),  women 45.5 + 2.3×(in−60)
//   Hamwi:    men 48 + 2.7×(in−60),  women 45.5 + 2.2×(in−60)
//   BMI:      22 × height(m)^2 (middle of healthy BMI range)
//
// These are historical population-level reference formulas, not a personal
// ideal weight. No frame-size adjustment is applied: the commonly cited
// small/medium/large ±10% rule has no defensible primary scientific source.
// No single average is presented: different formulas can produce different
// values and none defines a biologically "ideal" weight.
// ---------------------------------------------------------------------------

export const IDEAL_WEIGHT_FORMULAS = {
  robinson: (heightCm, gender) => {
    const heightInches = heightCm / 2.54;
    return gender === "male" ? 52 + 1.9 * (heightInches - 60) : 49 + 1.7 * (heightInches - 60);
  },
  miller: (heightCm, gender) => {
    const heightInches = heightCm / 2.54;
    return gender === "male" ? 56.2 + 1.41 * (heightInches - 60) : 53.1 + 1.36 * (heightInches - 60);
  },
  devine: (heightCm, gender) => {
    const heightInches = heightCm / 2.54;
    return gender === "male" ? 50 + 2.3 * (heightInches - 60) : 45.5 + 2.3 * (heightInches - 60);
  },
  hamwi: (heightCm, gender) => {
    const heightInches = heightCm / 2.54;
    return gender === "male" ? 48 + 2.7 * (heightInches - 60) : 45.5 + 2.2 * (heightInches - 60);
  },
  bmi: (heightCm) => {
    const heightM = heightCm / 100;
    return 22 * heightM * heightM;
  },
};

export function calculateIdealWeight({ heightCm, gender, formulaId }) {
  if (!Number.isFinite(heightCm) || heightCm < 100) return null;
  const formula = IDEAL_WEIGHT_FORMULAS[formulaId];
  if (!formula) return null;
  // Sex-specific historical formulas require an explicit sex selection.
  // BMI-based range does not require sex.
  if (formulaId !== "bmi" && gender !== "male" && gender !== "female") {
    return null;
  }
  const result = formulaId === "bmi" ? formula(heightCm) : formula(heightCm, gender);
  if (!Number.isFinite(result) || result <= 0) return null;
  return result;
}

export function calculateAllIdealWeights({ heightCm, gender }) {
  if (!Number.isFinite(heightCm) || heightCm < 100) return null;
  const results = {};
  for (const [formulaId, formula] of Object.entries(IDEAL_WEIGHT_FORMULAS)) {
    const result = formulaId === "bmi" ? formula(heightCm) : formula(heightCm, gender);
    if (!Number.isFinite(result) || result <= 0) continue;
    results[formulaId] = {
      kg: round(result, 1),
      lb: round(kgToLb(result), 1),
    };
  }
  return results;
}

export function idealWeightHealthyRange(heightCm) {
  return bmiHealthyRange(heightCm);
}

// ---------------------------------------------------------------------------
// Daily Calorie Calculator (Mifflin–St Jeor resting energy expenditure)
//
// Mifflin estimates resting energy expenditure (RMR/REE), not basal metabolic
// rate (BMR) and not total daily energy expenditure (TDEE).
//
// RMR (men)   = 10×weight + 6.25×height − 5×age + 5
// RMR (women) = 10×weight + 6.25×height − 5×age − 161
// ---------------------------------------------------------------------------

export const ADULT_PAL_CATEGORIES = [
  {
    id: "inactive",
    label: "Inactive",
    description: "Mostly activities of daily living with little additional occupational or recreational activity.",
  },
  {
    id: "low_active",
    label: "Low Active",
    description: "Some additional activity beyond daily living.",
  },
  {
    id: "active",
    label: "Active",
    description: "Substantial regular activity beyond daily living.",
  },
  {
    id: "very_active",
    label: "Very Active",
    description: "High levels of occupational and/or recreational activity, including vigorous activity.",
  },
];

export const ADULT_PAL_DESCRIPTION_NOTE =
  "Activity categories are approximate. Daily occupation, transport, recreation and overall movement all contribute.";

// Adult PAL ranges (approximate context, not user-measurable precisely):
//   Inactive:       1.00 ≤ PAL < 1.53
//   Low Active:     1.53 ≤ PAL < 1.68
//   Active:         1.68 ≤ PAL < 1.85
//   Very Active:    1.85 ≤ PAL < 2.50

export function calculateAdultEER({ age, sex, weightKg, heightCm, palCategory }) {
  if (!Number.isFinite(age) || age < 19) return null;
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  if (sex !== "male" && sex !== "female") return null;

  let result;
  if (sex === "male") {
    switch (palCategory) {
      case "inactive": result = 753.07 - 10.83 * age + 6.50 * heightCm + 14.10 * weightKg; break;
      case "low_active": result = 581.47 - 10.83 * age + 8.30 * heightCm + 14.94 * weightKg; break;
      case "active": result = 1004.82 - 10.83 * age + 6.52 * heightCm + 15.91 * weightKg; break;
      case "very_active": result = -517.88 - 10.83 * age + 15.61 * heightCm + 19.11 * weightKg; break;
      default: return null;
    }
  } else {
    switch (palCategory) {
      case "inactive": result = 584.90 - 7.01 * age + 5.72 * heightCm + 11.71 * weightKg; break;
      case "low_active": result = 575.77 - 7.01 * age + 6.60 * heightCm + 12.14 * weightKg; break;
      case "active": result = 710.25 - 7.01 * age + 6.54 * heightCm + 12.34 * weightKg; break;
      case "very_active": result = 511.83 - 7.01 * age + 9.07 * heightCm + 12.56 * weightKg; break;
      default: return null;
    }
  }

  return Number.isFinite(result) ? result : null;
}

export const ADULT_AMDR = {
  protein: { min: 10, max: 35 },
  carbs: { min: 45, max: 65 },
  fat: { min: 20, max: 35 },
};

export function evaluateAdultAmdr(percentages) {
  const out = {};
  for (const macro of Object.keys(ADULT_AMDR)) {
    const range = ADULT_AMDR[macro];
    const pct = percentages[macro];
    const isFiniteNumber = Number.isFinite(pct);
    out[macro] = {
      pct,
      within: isFiniteNumber && pct >= range.min && pct <= range.max,
      min: range.min,
      max: range.max,
    };
  }
  const entries = Object.entries(out).filter(([k]) => k !== "withinRange" && k !== "outOfRangeMacros");
  out.withinRange = entries.every(([, v]) => v.within);
  out.outOfRangeMacros = entries.filter(([, v]) => !v.within).map(([k]) => k);
  return out;
}

export function evaluateFitnessProtein(gramsPerKg) {
  if (!Number.isFinite(gramsPerKg)) return null;
  if (gramsPerKg < 1.4) return "below";
  if (gramsPerKg <= 2.0) return "within";
  return "above";
}

// ---------------------------------------------------------------------------
// Legacy Mifflin–St Jeor resting energy expenditure (RMR).
// Kept for /transformation and as a resting reference in /calories.
// Not maintenance energy; do not multiply by activity factors.
// ---------------------------------------------------------------------------

export function calculateBMR(weightKg, heightCm, age, gender) {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  if (!Number.isFinite(age) || age < 1 || age > 120) return null;
  if (gender === "male") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export const CALORIE_GOALS = [
  { value: -500, label: "Lose Weight", description: "Illustrative 500 kcal/day deficit" },
  { value: -250, label: "Mild Weight Loss", description: "Illustrative 250 kcal/day deficit" },
  { value: 0, label: "Maintain Weight", description: "Maintenance estimate" },
  { value: 250, label: "Mild Weight Gain", description: "Illustrative 250 kcal/day surplus" },
  { value: 500, label: "Gain Weight", description: "Illustrative 500 kcal/day surplus" },
];

// ---------------------------------------------------------------------------
// Legacy activity multipliers (pre-DRI).
// Kept only for /transformation which still uses Mifflin RMR × factor.
// /calories and /macros no longer use these; they use 2023 DRI adult EER.
// ---------------------------------------------------------------------------

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: "Sedentary", description: "Little to no exercise" },
  { value: 1.375, label: "Lightly Active", description: "Light exercise 1-3 days/week" },
  { value: 1.55, label: "Moderately Active", description: "Moderate exercise 3-5 days/week" },
  { value: 1.725, label: "Very Active", description: "Hard exercise 6-7 days/week" },
  { value: 1.9, label: "Extremely Active", description: "Very hard exercise, physical job" },
];

export function calculateTDEE(bmr, activityLevel) {
  // LEGACY: Mifflin RMR × activity factor heuristic.
  // Not used by /calories or /macros after adoption of 2023 DRI EER.
  if (!Number.isFinite(bmr) || bmr <= 0) return null;
  if (!Number.isFinite(activityLevel) || activityLevel <= 0) return null;
  return bmr * activityLevel;
}

export function calculateTargetCalories(maintenanceEnergy, goalAdjustment) {
  // Goal adjustment applied to maintenance energy (EER or user-provided).
  // Not a prescription; illustrative scenario only.
  if (!Number.isFinite(maintenanceEnergy) || maintenanceEnergy <= 0) return null;
  if (!Number.isFinite(goalAdjustment)) return null;
  return maintenanceEnergy + goalAdjustment;
}

// ---------------------------------------------------------------------------
// Macronutrient Calculator
//
// Energy density: protein 4 kcal/g, carbohydrates 4 kcal/g, fat 9 kcal/g.
// Grams = (total calories × percentage / 100) ÷ calories per gram.
// ---------------------------------------------------------------------------

export const MACRO_PRESETS = [
  { name: "Balanced", protein: 25, carbs: 45, fat: 30 },
  { name: "High Protein", protein: 35, carbs: 35, fat: 30 },
  { name: "Low Carb", protein: 30, carbs: 20, fat: 50 },
  { name: "Keto", protein: 25, carbs: 5, fat: 70 },
  { name: "High Carb", protein: 20, carbs: 60, fat: 20 },
];

export const CALORIES_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };

export function calculateMacros(totalCalories, percentages) {
  if (!Number.isFinite(totalCalories) || totalCalories <= 0) return null;
  const protein = percentages?.protein ?? 0;
  const carbs = percentages?.carbs ?? 0;
  const fat = percentages?.fat ?? 0;
  const out = {};
  for (const [macro, pct] of [["protein", protein], ["carbs", carbs], ["fat", fat]]) {
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;
    const kcal = totalCalories * (pct / 100);
    out[macro] = {
      percentage: pct,
      calories: round(kcal, 0),
      grams: round(kcal / CALORIES_PER_GRAM[macro], 0),
    };
  }
  return out;
}