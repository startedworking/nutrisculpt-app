"use client";

import Link from "next/link";
import { BRAND, LINKS } from "@/constants";
import { useState, useEffect } from "react";

const EXPLORE_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "Fitness & Health Snapshot", href: "/transformation" },
  { label: "Calculators", href: "/bmi" },
];

const SOCIAL_LINKS = [
  { label: "Instagram", href: LINKS?.instagram },
  { label: "YouTube", href: LINKS?.youtube },
].filter((link) => Boolean(link.href));

const Footer = () => {
  const [year, setYear] = useState(2024);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full bg-gray-800 text-gray-200 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-lg font-bold text-white">{BRAND}</p>
            <p className="mt-1 text-sm font-medium text-blue-300">
              Nourishing Bodies &amp; Sculpting Greatness
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Evidence-informed exercise coaching for strength, health-focused
              fitness, movement and independent training.
            </p>
          </div>

          <nav aria-label="Footer explore">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              Explore
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="rounded text-gray-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer connect">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              Connect
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/expert-connect?source=homepage&back=%2F"
                  className="rounded text-gray-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  Connect to an Expert
                </Link>
              </li>
              {SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded text-gray-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
          <p>
            &copy; {year} {BRAND}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;