import Link from "next/link";
import { BRAND } from "@/constants";

export default function Terms() {
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
        Terms of Use
      </h1>

      <p className="mb-6 text-gray-600 dark:text-gray-400">
        <strong>Status: Draft &mdash; pending owner review and approval.</strong> These
        terms govern use of the NutriSculpt website. They will be finalized
        after the owner confirms the details marked below.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          1. Scope and nature of the website
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          NutriSculpt provides a public website offering:
        </p>
        <ul className="mt-2 space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
          <li>Standalone fitness calculators (BMI, energy needs, macros, 1RM,
            reference weight, water intake, heart-rate zones).</li>
          <li>A multi-input Fitness & Health Snapshot combining several
            estimates.</li>
          <li>Information about exercise coaching services.</li>
          <li>An enquiry form (&ldquo;Connect to an Expert&rdquo;) to request coaching
            information.</li>
        </ul>
        <p className="mt-3 text-gray-700 dark:text-gray-300">
          All calculator outputs are estimates based on published population-level
          formulas and the data you enter. They are for general educational and
          fitness guidance only. They are not medical diagnoses, individualized
          treatment plans, or guaranteed prescriptions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          2. Appropriate use
        </h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
          <li>You may use the calculators and Snapshot for personal,
            non-commercial reference.</li>
          <li>You may share your own results via the provided sharing
            functionality.</li>
          <li>You must not scrape, reverse-engineer, or republish the
            calculator logic or content without permission.</li>
          <li>You must not submit false, misleading, or harmful information
            through the enquiry form.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          3. Enquiries and coaching services
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          Submitting an enquiry does not create a client relationship, guarantee
          a consultation, or commit NutriSculpt to provide services. It is an
          expression of interest. Any coaching engagement would be subject to a
          separate agreement.
        </p>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          <strong>Owner action required:</strong> If payment, refund,
          cancellation, or consultation policies exist, they should be added
          here or linked to a separate policy page.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          4. Health and fitness disclaimer
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          Calculator outputs and website content do not constitute medical
          advice, diagnosis, or treatment. They do not replace the guidance of
          qualified healthcare professionals. If you have a medical condition,
          are pregnant, take medication, or have exercise restrictions, consult
          a healthcare provider before changing your diet, hydration, or
          exercise routine. In a medical emergency, contact emergency services
          immediately.
        </p>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          See also the dedicated <Link href="/disclaimer" className="text-blue-600 hover:underline dark:text-blue-400">Health & Fitness Disclaimer</Link>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          5. Intellectual property
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          All website content (text, graphics, logos, calculator logic, code)
          is owned by NutriSculpt or its licensors. The brand name
          <strong>NutriSculpt</strong> and tagline <strong>Nourishing Bodies &
          Sculpting Greatness</strong> are proprietary. You may not use them
          without permission.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          6. Third-party links
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          The website may link to external platforms (social media sharing,
          Font Awesome icons, Google Fonts, Vercel Analytics, Neon PostgreSQL,
          Google Apps Script). We are not responsible for their content, privacy
          practices, or terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          7. Limitations of general information
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          The estimates and educational content on this website are based on
          population-level references. Individual needs vary due to genetics,
          body composition, health status, medications, lifestyle, and other
          factors. No calculator output should be treated as a fixed target or
          guarantee of outcomes.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          8. Changes to these terms
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          We may update these terms. The &ldquo;Last updated&rdquo; date below will reflect
          the most recent revision. Continued use of the website after changes
          constitutes acceptance of the revised terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          9. Governing law and jurisdiction
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Owner action required:</strong> Specify the governing law and
          jurisdiction (e.g., &ldquo;England and Wales&rdquo;, &ldquo;State of Delaware, USA&rdquo;,
          etc.).
        </p>
      </section>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Last updated: <time dateTime="2026-11-25">25 November 2026</time>
        (draft)
      </p>
    </main>
  );
}