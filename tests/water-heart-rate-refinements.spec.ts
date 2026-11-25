import { test, expect } from "@playwright/test";
import * as fs from "fs";

/*
 * NutriSculpt — 04F-3 Water & Heart Rate refinement coverage.
 *
 * Focused flows only; full site regression deferred to 04J. Runs against the
 * production build via `npm run start` (http://localhost:3000).
 *
 * Expected values:
 *   Heart (Tanaka, age 40) → 208 − 0.7×40 = 180 bpm; share label "HRMAX ESTIMATE".
 *   Entered max HR 190 → label "ENTERED MAX HR", detail "Entered value".
 *   Custom max 120 with resting 120 → reserve error only; %HRmax still shown.
 *   Water (male, adult) → 3.7 L/day (≈ 3700 mL); share label "TOTAL WATER REFERENCE".
 */

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const exportPng = async (page) => {
  await page.getByRole("button", { name: /Share Result/i }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download Image/i }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const buffer = fs.readFileSync(path!);
  expect(buffer.subarray(0, 8).equals(pngSignature)).toBe(true);
  expect(buffer.length).toBeGreaterThan(500);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
};

const fillHeart = async (page, { age, resting, customMax }) => {
  if (age != null) await page.getByLabel("Age").fill(String(age));
  if (resting != null) await page.getByLabel(/Resting Heart Rate/).fill(String(resting));
  if (customMax != null) {
    await page.getByLabel("Use known max heart rate").check();
    await page.getByLabel("Known Max Heart Rate (bpm)").fill(String(customMax));
  }
};

test.describe("Water & heart rate refinements", () => {
  // 1. Predicted max HR uses the estimate label and method detail
  test("Heart: predicted max HR shows estimated label and Tanaka detail", async ({ page }) => {
    await page.goto("/heart-rate");
    await fillHeart(page, { age: 40 });

    await expect(page.getByRole("heading", { name: "Your Shareable Result" })).toBeVisible();
    const card = page.locator('[data-shareable-card]').first();
    await expect(card).toContainText("180");
    await expect(card).toContainText("HRMAX ESTIMATE");
    await expect(card).toContainText("Tanaka");

    // Info box distinguishes an estimate from an entered value.
    await expect(page.getByText("Estimated Maximum Heart Rate: 180 bpm")).toBeVisible();
    await expect(page.getByText("About the methods")).toBeVisible();

    await exportPng(page);
  });

  // 2. Entered (measured) max HR uses the entered label and is not called an estimate
  test("Heart: entered max HR shows entered label and value", async ({ page }) => {
    await page.goto("/heart-rate");
    await fillHeart(page, { customMax: 190 });

    await expect(page.getByText(/Entered Maximum Heart Rate/)).toBeVisible();
    const card = page.locator('[data-shareable-card]').first();
    await expect(card).toContainText("190");
    await expect(card).toContainText("ENTERED MAX HR");
    await expect(card).toContainText("Entered value");
  });

  // 3. Reserve-only error keeps %HRmax but blocks Heart Rate Reserve
  test("Heart: reserve error blocks HRR only, %HRmax still shown", async ({ page }) => {
    await page.goto("/heart-rate");
    await fillHeart(page, { customMax: 120, resting: 120 });

    await expect(page.getByRole("heading", { name: "% of Max HR (Moderate / Vigorous)" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Heart Rate Reserve (Karvonen)" })
    ).not.toBeVisible();
    await expect(
      page.getByText(/at or above your maximum heart rate/)
    ).toBeVisible();
  });

  // 4. Method explanation is present and lists the three equations
  test("Heart: method explanation lists the three prediction equations", async ({ page }) => {
    await page.goto("/heart-rate");
    await expect(page.getByText("About the methods")).toBeVisible();
    await expect(page.locator("li", { hasText: /Tanaka \(208/ })).toBeVisible();
    await expect(page.locator("li", { hasText: /Traditional \(220/ })).toBeVisible();
    await expect(page.locator("li", { hasText: /Gulati \(206/ })).toBeVisible();
  });

  // 5. Water population reference with L/day and share card copy
  test("Water: adult reference shows L/day and a population-reference card", async ({ page }) => {
    await page.goto("/water-intake");
    await page.getByLabel("Age").fill("30");
    await page.locator('input[name="gender"]').first().click();

    await expect(page.getByRole("heading", { name: "Total Water Population Reference" })).toBeVisible();
    await expect(page.getByText("3.7 L/day", { exact: true })).toBeVisible();
    await expect(page.getByText(/≈ 3700 mL/)).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();
    const card = page.locator('[data-shareable-card]').first();
    await expect(card).toContainText("TOTAL WATER REFERENCE");
    await expect(card).toContainText("Population reference");
    await expect(card).toContainText("Includes beverages and food");

    await exportPng(page);
  });

  // 6. Context guidance updates, and a medical restriction hides the estimate
  test("Water: context guidance updates and heart disease hides the estimate", async ({ page }) => {
    await page.goto("/water-intake");
    await page.getByLabel("Age").fill("30");
    await page.locator('input[name="gender"]').first().click();

    await page.locator('label:has-text("Activity Context") + select').selectOption("higher_activity");
    await page.locator('label:has-text("Climate Context") + select').selectOption("hot_humid");
    await expect(
      page.locator("p", { hasText: /Regular exercise or a physically demanding job/ })
    ).toBeVisible();
    await expect(
      page.locator("p", { hasText: /Warm or humid conditions/ })
    ).toBeVisible();

    await page.getByLabel("Heart Disease").check();
    await expect(page.getByText("General estimate not shown")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).not.toBeVisible();
  });

  // Focused mobile layout check
  test("Mobile layout: heart and water pages do not overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/heart-rate");
    await fillHeart(page, { age: 40 });
    let overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.goto("/water-intake");
    await page.getByLabel("Age").fill("30");
    await page.locator('input[name="gender"]').first().click();
    overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});