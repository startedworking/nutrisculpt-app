import Link from "next/link";
import { BRAND } from "@/constants";

export default function Disclaimer() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
        >
          <span>&larr;</span> Back to Homepage
        </Link>
      </div>

      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        Health & Fitness Disclaimer
      </h1>

      <p className="mb-6 text-gray-600 dark:text-gray-400">
        <strong>Status: Draft &mdash; pending owner review and approval.</strong> This
        disclaimer applies to all calculators, the Fitness & Health Snapshot,
        and educational content on the NutriSculpt website.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          1. Estimates and population references
        </h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
          <li>All calculator outputs (BMI, energy needs, macronutrient
            distributions, 1RM, reference weight, water intake, heart-rate
            zones) are estimates derived from published population-level
            formulas.</li>
          <li>They do not measure your individual physiology, body composition,
            metabolic rate, or actual maximum heart rate.</li>
          <li>They are not individualized prescriptions, targets, or medical
            diagnoses.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          2. Not a substitute for professional advice
        </h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
          <li>This website does not provide medical advice, diagnosis, or
            treatment.</li>
          <li>It does not replace consultation with a qualified healthcare
            professional (doctor, physiotherapist, registered dietitian, etc.).</li>
          <li>It does not replace the guidance of a certified exercise
            professional who has assessed you in person.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          3. Existing medical advice takes precedence
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          If you have a diagnosed medical condition, metabolic disorder, heart
          condition, kidney disease, diabetes, eating disorder history, are
          pregnant or postpartum, take medication (especially heart-rate-
          altering medications such as beta blockers), or have specific dietary
          or exercise restrictions from a healthcare provider, that guidance
          takes precedence over any estimate or general information on this
          website.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          4. Exercise and nutrition needs vary
        </h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
          <li>Individual responses to exercise and nutrition vary significantly.</li>
          <li>Population references (e.g., BMI 18.5&ndash;24.9, total water 3.7 L/day
            for men) describe groups, not individuals.</li>
          <li>Age-specific guidance for minors, older adults, and special
            populations is not fully implemented in these calculators.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          5. Calculator-specific notes
        </h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
          <li><strong>BMI / Reference Weight:</strong> Screening measures only.
            Do not account for muscle mass, bone density, body composition, or
            individual health status.</li>
          <li><strong>Energy / Macros:</strong> Based on the 2023 DRI adult
            Estimated Energy Requirement and AMDR ranges. Not a weight-loss or
            weight-gain prescription.</li>
          <li><strong>1RM:</strong> Prediction equations have inherent error.
            Not a measured maximum.</li>
          <li><strong>Water Intake:</strong> Total-water population reference
            from beverages and food. Not an individualized drinking-water
            target. Fluid restrictions require medical guidance.</li>
          <li><strong>Heart Rate:</strong> Age-predicted estimates (Tanaka,
            Gulati, Traditional). Actual maximum heart rate varies
            significantly. Zone percentages are general ranges, not measured
            thresholds.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          6. NutriSculpt enquiries do not replace emergency care
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          Submitting a &ldquo;Connect to an Expert&rdquo; enquiry is not a way to obtain
          urgent medical help. If you experience chest pain or pressure,
          fainting or severe dizziness, unusual severe breathlessness, or other
          concerning symptoms during or after exercise, stop immediately and
          contact emergency services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          7. Use as a starting point
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          These estimates are intended as a starting reference for general
          fitness education and coaching discussions. Adjust your approach based
          on your body&rsquo;s response, professional guidance, and any medical
          restrictions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          8. Related pages
        </h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
          <li><Link href="/privacy-policy" className="text-blue-600 hover:underline dark:text-blue-400">Privacy Notice</Link></li>
          <li><Link href="/terms" className="text-blue-600 hover:underline dark:text-blue-400">Terms of Use</Link></li>
        </ul>
      </section>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Last updated: <time dateTime="2026-11-25">25 November 2026</time>
        (draft)
      </p>
    </main>
  );
}