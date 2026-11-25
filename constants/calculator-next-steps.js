// Shared calculator-to-service/expert navigation configuration.
//
// Every standalone calculator renders exactly three next-step cards through
// components/atoms/CalculatorNextStep.jsx. Keeping the mapping and copy here
// avoids duplicating it across seven page files and keeps the service slugs
// aligned with constants/services.js.
//
// Recommendations are deterministic and educational only. They must never
// imply that a calculator result diagnoses a condition or that a service
// provides medical treatment.

const SNAPSHOT_HEADING = "Explore Your Fitness & Health Snapshot";
const SNAPSHOT_CTA = "Explore Your Fitness & Health Snapshot";
const SERVICE_HEADING = "Explore a Relevant Service";
const EXPERT_HEADING = "Connect to an Expert";
const EXPERT_CTA = "Connect to an Expert";

export const CALCULATOR_NEXT_STEPS = {
  bmi: {
    source: "calculator-bmi",
    serviceSlug: "strength-fitness-performance",
    serviceCta: "Explore Strength Coaching",
    snapshot: {
      heading: SNAPSHOT_HEADING,
      description:
        "Combine a weight-for-height screening result with body measurements, estimated energy needs and activity context in one broader snapshot.",
      cta: SNAPSHOT_CTA,
    },
    service: {
      heading: SERVICE_HEADING,
      description:
        "Explore general fitness coaching that looks beyond a single screening number toward strength, movement and health-related goals.",
      cta: "Explore Strength Coaching",
    },
    expert: {
      heading: EXPERT_HEADING,
      description:
        "Discuss your results and goals with a coach who can suggest an exercise approach suited to your circumstances.",
      cta: EXPERT_CTA,
    },
  },
  calories: {
    source: "calculator-calories",
    serviceSlug: "strength-fitness-performance",
    serviceCta: "Explore Strength Coaching",
    snapshot: {
      heading: SNAPSHOT_HEADING,
      description:
        "See how your estimated energy needs fit alongside body measurements, activity and exercise intensity.",
      cta: SNAPSHOT_CTA,
    },
    service: {
      heading: SERVICE_HEADING,
      description:
        "Explore personal training that uses energy estimates alongside your activity and fitness goals.",
      cta: "Explore Strength Coaching",
    },
    expert: {
      heading: EXPERT_HEADING,
      description:
        "Talk through your energy estimate and goals with a coach before changing your training or nutrition approach.",
      cta: EXPERT_CTA,
    },
  },
  macros: {
    source: "calculator-macros",
    serviceSlug: "fitness-education-independence",
    serviceCta: "Explore Fitness Education",
    snapshot: {
      heading: SNAPSHOT_HEADING,
      description:
        "Understand nutrition-related estimates in the context of your broader fitness picture.",
      cta: SNAPSHOT_CTA,
    },
    service: {
      heading: SERVICE_HEADING,
      description:
        "Learn training and nutrition principles so you can plan independently and train with confidence.",
      cta: "Explore Fitness Education",
    },
    expert: {
      heading: EXPERT_HEADING,
      description:
        "Discuss your nutrition-related estimates and goals with a coach who can help you plan independently.",
      cta: EXPERT_CTA,
    },
  },
  "one-rm": {
    source: "calculator-one-rm",
    serviceSlug: "strength-fitness-performance",
    serviceCta: "Explore Strength Coaching",
    snapshot: {
      heading: SNAPSHOT_HEADING,
      description:
        "Put an estimated 1RM in context with your body measurements, activity and exercise intensity.",
      cta: SNAPSHOT_CTA,
    },
    service: {
      heading: SERVICE_HEADING,
      description:
        "Explore strength development and progressive programming built around your estimated strength.",
      cta: "Explore Strength Coaching",
    },
    expert: {
      heading: EXPERT_HEADING,
      description:
        "Discuss your strength estimate and goals with a coach to plan appropriate training loads.",
      cta: EXPERT_CTA,
    },
  },
  "ideal-weight": {
    source: "calculator-ideal-weight",
    serviceSlug: "fitness-education-independence",
    serviceCta: "Explore Fitness Education",
    snapshot: {
      heading: SNAPSHOT_HEADING,
      description:
        "Interpret a population weight-for-height reference alongside your broader fitness picture.",
      cta: SNAPSHOT_CTA,
    },
    service: {
      heading: SERVICE_HEADING,
      description:
        "Learn how to interpret population references and train independently without treating them as personal targets.",
      cta: "Explore Fitness Education",
    },
    expert: {
      heading: EXPERT_HEADING,
      description:
        "Discuss what a population reference means for you and explore a suitable exercise approach.",
      cta: EXPERT_CTA,
    },
  },
  "water-intake": {
    source: "calculator-water-intake",
    serviceSlug: "fitness-education-independence",
    serviceCta: "Explore Fitness Education",
    snapshot: {
      heading: SNAPSHOT_HEADING,
      description:
        "See hydration guidance alongside your body measurements, activity and exercise intensity.",
      cta: SNAPSHOT_CTA,
    },
    service: {
      heading: SERVICE_HEADING,
      description:
        "Learn practical hydration and training habits so you can manage your own fitness routine.",
      cta: "Explore Fitness Education",
    },
    expert: {
      heading: EXPERT_HEADING,
      description:
        "Discuss hydration in the context of your training and daily routine with a coach.",
      cta: EXPERT_CTA,
    },
  },
  "heart-rate": {
    source: "calculator-heart-rate",
    serviceSlug: "functional-fitness-life-stages",
    serviceCta: "Explore Performance Coaching",
    snapshot: {
      heading: SNAPSHOT_HEADING,
      description:
        "Understand exercise-intensity estimates alongside your body measurements and activity.",
      cta: SNAPSHOT_CTA,
    },
    service: {
      heading: SERVICE_HEADING,
      description:
        "Explore aerobic conditioning and exercise programming built around your intensity guidance.",
      cta: "Explore Performance Coaching",
    },
    expert: {
      heading: EXPERT_HEADING,
      description:
        "Discuss your heart-rate guidance and goals with a coach to plan aerobic conditioning.",
      cta: EXPERT_CTA,
    },
  },
};

export const CALCULATOR_IDS = Object.keys(CALCULATOR_NEXT_STEPS);

export function getCalculatorNextStep(calculatorId) {
  return CALCULATOR_NEXT_STEPS[calculatorId] || null;
}