"use client";

import Link from "next/link";
import { getCalculatorNextStep } from "@/constants/calculator-next-steps";

/**
 * Standardized "What's Next" section for standalone calculators.
 *
 * Renders exactly three cards:
 *   1. Explore Your Fitness & Health Snapshot  -> /transformation
 *   2. Explore a Relevant Service              -> /services/category/[slug]
 *   3. Connect to an Expert                    -> /expert-connect
 *
 * Source attribution and return navigation are derived from the shared
 * calculator configuration, so the mapping is defined in one place.
 */
export default function CalculatorNextStep({ calculatorId }) {
  const config = getCalculatorNextStep(calculatorId);
  if (!config) return null;

  const sourceQuery = `?source=${config.source}`;
  const backQuery = `&back=/${calculatorId}`;

  const cards = [
    {
      key: "snapshot",
      ...config.snapshot,
      href: `/transformation${sourceQuery}`,
      primary: true,
    },
    {
      key: "service",
      ...config.service,
      href: `/services/category/${config.serviceSlug}${sourceQuery}${backQuery}`,
      primary: false,
    },
    {
      key: "expert",
      ...config.expert,
      href: `/expert-connect${sourceQuery}${backQuery}`,
      primary: false,
    },
  ];

  return (
    <section
      className="mt-8 rounded-xl bg-white p-6 sm:p-8 shadow-lg ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
      aria-labelledby="calculator-next-step-heading"
      data-next-step-section
    >
      <h2
        id="calculator-next-step-heading"
        className="mb-3 text-lg font-semibold text-gray-900 dark:text-white"
      >
        What&apos;s Next
      </h2>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        Choose a meaningful next step. You can explore these options whether or not
        you have entered your details.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.key}
            data-next-step-card={card.key}
            className="flex h-full flex-col rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/40"
          >
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {card.heading}
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {card.description}
            </p>
            <Link
              href={card.href}
              className={
                card.primary
                  ? "mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
                  : "mt-4 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus-visible:ring-offset-gray-800"
              }
            >
              {card.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}