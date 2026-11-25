import { test, expect } from "@playwright/test";
import {
  CALCULATOR_NEXT_STEPS,
  CALCULATOR_IDS,
} from "../constants/calculator-next-steps";

/*
 * NutriSculpt — 04G calculator-to-service/expert navigation coverage.
 *
 * Focused flows only; the full 192-test matrix remains deferred to 04J.
 * Runs against the production build via `npm run start` (http://localhost:3000).
 */

const ROUTES: Record<string, string> = {
  bmi: "/bmi",
  calories: "/calories",
  macros: "/macros",
  "one-rm": "/one-rm",
  "ideal-weight": "/ideal-weight",
  "water-intake": "/water-intake",
  "heart-rate": "/heart-rate",
};

// The five existing service categories (slugs must not be invented).
const VALID_SERVICE_SLUGS = new Set([
  "strength-fitness-performance",
  "metabolic-bone-health",
  "pain-posture-movement",
  "functional-fitness-life-stages",
  "fitness-education-independence",
]);

const PERSONAL_DATA_PARAM =
  /[?&](age|weight|height|bmi|calories|protein|carbs|fat|heartRate|restingHR|exercise|sex)=/i;

test.describe("Calculator next-step navigation", () => {
  test("all seven calculators map to an existing service slug", () => {
    expect([...CALCULATOR_IDS].sort()).toEqual(
      Object.keys(ROUTES).sort()
    );
    for (const id of CALCULATOR_IDS) {
      expect(VALID_SERVICE_SLUGS.has(CALCULATOR_NEXT_STEPS[id].serviceSlug)).toBe(
        true
      );
    }
  });

  for (const id of CALCULATOR_IDS) {
    test(`${id}: exactly three next-step cards with valid destinations`, async ({
      page,
    }) => {
      await page.goto(ROUTES[id]);

      const cards = page.locator("[data-next-step-card]");
      await expect(cards).toHaveCount(3);

      const source = CALCULATOR_NEXT_STEPS[id].source;
      const slug = CALCULATOR_NEXT_STEPS[id].serviceSlug;
      const back = ROUTES[id];

      await expect(
        page.locator('[data-next-step-card="snapshot"] a')
      ).toHaveAttribute("href", `/transformation?source=${source}`);
      await expect(
        page.locator('[data-next-step-card="service"] a')
      ).toHaveAttribute(
        "href",
        `/services/category/${slug}?source=${source}&back=${back}`
      );
      await expect(
        page.locator('[data-next-step-card="expert"] a')
      ).toHaveAttribute("href", `/expert-connect?source=${source}&back=${back}`);
    });
  }

  test("calculator → service → expert carries source and serviceReturnTo", async ({
    page,
  }) => {
    await page.goto("/bmi");
    await page.locator('[data-next-step-card="service"] a').click();
    await expect(page).toHaveURL(
      /\/services\/category\/strength-fitness-performance\?.*source=calculator-bmi.*back=(?:%2F|\/)bmi/
    );

    const expert = page.getByRole("link", { name: "Connect to an Expert" });
    await expect(expert).toHaveAttribute("href", /source=calculator-bmi/);
    await expect(expert).toHaveAttribute("href", /serviceReturnTo=%2Fbmi/);
  });

  test("calculator → service → back to calculator", async ({ page }) => {
    await page.goto("/heart-rate");
    await page.locator('[data-next-step-card="service"] a').click();
    await expect(page).toHaveURL(
      /\/services\/category\/functional-fitness-life-stages\?.*back=(?:%2F|\/)heart-rate/
    );

    await page.getByRole("link", { name: "Back to Calculator" }).click();
    await expect(page).toHaveURL("/heart-rate");
  });

  test("completed snapshot → expert → restored snapshot", async ({ page }) => {
    await page.goto("/transformation");
    await page.getByLabel("Age (years)").fill("35");
    await page.getByLabel(/Equation-Specific Sex Input/).selectOption("female");
    await page.getByLabel("Physical Activity Level").selectOption("active");
    await page
      .getByLabel(/What would you like to work on/)
      .selectOption("strength");
    await page
      .getByLabel(/How much aerobic activity do you usually do each week/)
      .selectOption("75_149");
    await page.getByLabel(/Typical intensity/).selectOption("vigorous");
    await page
      .getByLabel(/How many days per week do you perform strength-training exercises/)
      .selectOption("3_4");
    await page.getByLabel(/Weight \(kg\)/).fill("65");
    await page.getByLabel(/Height \(cm\)/).fill("165");

    await page.getByRole("button", { name: /View My Fitness Snapshot/ }).click();
    await expect(
      page.getByRole("heading", { name: "Your Fitness & Health Snapshot" })
    ).toBeVisible();
    const before = await page
      .locator("body")
      .innerText();

    await page.getByRole("link", { name: /Connect to an Expert/ }).click();
    await expect(page).toHaveURL(/expert-connect/);
    await page.getByRole("link", { name: /Back/ }).click();

    await expect(page).toHaveURL(/transformation/);
    await expect(
      page.getByRole("heading", { name: "Your Fitness & Health Snapshot" })
    ).toBeVisible();
    expect(await page.locator("body").innerText()).toBe(before);
  });

  test("referral URLs contain no personal measurement data", async ({ page }) => {
    for (const id of CALCULATOR_IDS) {
      await page.goto(ROUTES[id]);
      const hrefs = await page
        .locator("[data-next-step-card] a")
        .evaluateAll((els) => els.map((el) => el.getAttribute("href") || ""));
      for (const href of hrefs) {
        expect(href).not.toMatch(PERSONAL_DATA_PARAM);
      }
    }
  });
});