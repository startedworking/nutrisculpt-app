import Link from "next/link";
import { BRAND } from "@/constants";

export default function PrivacyPolicy() {
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
        Privacy Notice
      </h1>

      <p className="mb-6 text-gray-600 dark:text-gray-400">
        <strong>Status: Draft &mdash; pending owner review and approval.</strong> This
        notice describes how NutriSculpt handles information on this website.
        It will be finalized after the owner confirms the details marked below.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          1. Information visitors provide
        </h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
          <li>
            <strong>Coaching enquiries:</strong> When you submit the &ldquo;Connect to
            an Expert&rdquo; form, we collect your full name, email address, optional
            phone number, age group, coaching preference, service category of
            interest, and your stated fitness goals.
          </li>
          <li>
            <strong>Calculator and Transformation inputs:</strong> Age, sex,
            height, weight, waist circumference, activity level, and fitness
            goals are processed in your browser to generate estimates. These
            values are stored locally in <code>sessionStorage</code> (for the
            Transformation snapshot) and <code>localStorage</code> (for theme
            preference). They are not transmitted to our servers unless you
            explicitly share them.
          </li>
          <li>
            <strong>Theme preference:</strong> Your light/dark mode choice is
            stored in <code>localStorage</code> and persisted across visits.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          2. Purposes of processing
        </h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
          <li>To respond to coaching enquiries and provide information about
            our services.</li>
          <li>To generate fitness-related estimates (energy needs, macro
            distributions, heart-rate zones, etc.) in your browser.</li>
          <li>To remember your theme preference and Transformation session
            between page loads.</li>
          <li>To operate and improve the website (see Analytics below).</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          3. Browser-based calculator processing
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          All standalone calculators (BMI, Calories, Macros, 1RM, Reference
          Weight, Water Intake, Heart Rate) and the Transformation Snapshot
          perform calculations entirely in your browser using standard web APIs.
          No personal measurement data leaves your device unless you use the
          &ldquo;Share Result&rdquo; feature, which generates a client-side PNG image and
          optional text that you choose to share.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          4. Transformation session storage
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          If you complete the Fitness & Health Snapshot, the inputs and
          computed results are saved to <code>sessionStorage</code> so the
          snapshot can be restored on return visits. This storage is cleared
          when you use &ldquo;Adjust Inputs&rdquo; or close the browser session. It is not
          sent to our servers.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          5. Theme preference storage
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          Your light/dark mode selection is stored in <code>localStorage</code>
          and applied on subsequent visits. This preference is not transmitted
          to our servers.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          6. Hosting and service providers
        </h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
          <li><strong>Hosting:</strong> Vercel (vercel.com)</li>
          <li><strong>Database (enquiries):</strong> Supabase (supabase.com)</li>
          <li><strong>Analytics:</strong> Vercel Web Analytics (analytics.vercel.com)</li>
          <li><strong>Fonts:</strong> Self-hosted / Google Fonts (fonts.googleapis.com, fonts.gstatic.com)</li>
          <li><strong>Icons:</strong> Font Awesome (cdnjs.cloudflare.com / use.fontawesome.com)</li>
        </ul>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          <strong>Owner action required:</strong> Confirm the above providers
          and add any others in use. Add data processing agreement (DPA) status
          for each.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          7. Sharing functionality and external platforms
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          When you use &ldquo;Share Result&rdquo;, a PNG is generated client-side. If you
          choose the native share dialog or a social platform (Pinterest,
          Facebook, WhatsApp, Instagram, Snapchat), the image and/or a text
          summary with a link to the calculator are sent to that platform. We
          do not control their data practices; please review their privacy
          policies.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          8. Analytics
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          We use Vercel Web Analytics to understand aggregate site usage (page
          views, referrers, device type). Events from admin routes and
          <code>/expert-connect</code> query parameters are excluded. No
          personal identifiers are collected by the analytics script.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          9. Security safeguards
        </h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
          <li>HTTPS enforced via Vercel.</li>
          <li>Enquiry submissions use idempotency keys to prevent duplicate
            processing.</li>
          <li>Anti-spam honeypot field on the enquiry form.</li>
          <li>Referral-source identifiers are validated against an allowlist.</li>
          <li>Safe-return navigation uses an allowlist to prevent open
            redirects.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          10. Data retention and deletion
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Owner action required:</strong> Define and document retention
          periods for:
        </p>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5 mt-2">
          <li>Enquiry records in Supabase</li>
          <li>Analytics data in Vercel</li>
          <li>Any backup or log retention</li>
        </ul>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          Visitors may request deletion of their enquiry data by contacting us
          (see Contact below).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          11. Contact and privacy requests
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Owner action required:</strong> Provide a verified privacy
          contact channel (e.g., <code>privacy@nutrisculpt.com</code> or a
          contact form link).
        </p>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          You may request access to, correction of, or deletion of your
          personal data. We will respond within a reasonable timeframe.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          12. Business identity and jurisdiction
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Owner action required:</strong> Confirm legal business name,
          registered address, company number, and applicable jurisdiction for
          data protection purposes.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          13. Changes to this notice
        </h2>
        <p className="text-gray-700 dark:text-gray-300">
          We may update this notice. The &ldquo;Last updated&rdquo; date below will reflect
          the most recent revision. Material changes will be highlighted on the
          homepage.
        </p>
      </section>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Last updated: <time dateTime="2026-11-25">25 November 2026</time>
        (draft)
      </p>
    </main>
  );
}