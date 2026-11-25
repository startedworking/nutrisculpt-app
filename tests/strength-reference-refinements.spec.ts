import { test, expect } from "@playwright/test";
import * as fs from "fs";

/*
 * NutriSculpt — 04F-2 1RM & Reference Weight refinement coverage.
 *
 * Focused flows only; full site regression deferred to 04J. Runs against the
 * production build via `npm run start` (http://localhost:3000).
 *
 * Expected values:
 *   1RM 80 kg × 10 reps → Brzycki ≈ 106.695 kg → 107 kg (metric) / 235 lb.
 *   Custom load 70% → 74.7 kg; 75% → 80 kg.
 *   Reference Weight 170 cm: range 53.5–72.3 kg / 117.9–159.3 lbs; BMI-22 63.6 kg / 140.2 lb.
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

const fillOneRM = async (page, { exercise, customName, weight, reps }) => {
  if (exercise) {
    await page.locator('label:has-text("Exercise") + select').selectOption(exercise);
  }
  if (customName != null) {
    await page.getByLabel("Exercise Name").fill(customName);
  }
  if (weight != null) await page.getByLabel("Weight (kg)").fill(String(weight));
  if (reps != null) await page.getByLabel("Reps Performed").fill(String(reps));
};

test.describe("Strength & reference refinements", () => {
  // 1. Custom exercise name in results and sharing
  test("1RM: custom exercise name appears in results and share card", async ({ page }) => {
    await page.goto("/one-rm");
    await fillOneRM(page, { exercise: "Other", customName: "Leg Press", weight: 80, reps: 10 });

    await expect(page.getByText("107", { exact: true }).first()).toBeVisible();
    // Exercise name appears in the primary result and the share card.
    await expect(page.getByText("Leg Press", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();
    const card = page.locator('[data-shareable-card]').first();
    await expect(card).toContainText("Leg Press");
    await expect(card).toContainText("107");

    await exportPng(page);
  });

  // 2. Custom percentage updates the calculated training load
  test("1RM: custom percentage updates the calculated load from raw 1RM", async ({ page }) => {
    await page.goto("/one-rm");
    await fillOneRM(page, { exercise: "Squat", weight: 80, reps: 10 });

    // Default 70% → 106.695 × 0.70 = 74.7 kg.
    await expect(page.getByText(/74\.7/).first()).toBeVisible();

    // 75% → 80 kg.
    await page.getByLabel("Custom training percentage value").fill("75");
    await expect(page.getByText("80kg", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Calculated load based on an estimated maximum/)).toBeVisible();
  });

  // 3. Invalid/unsupported inputs remove the custom-load result
  test("1RM: unsupported reps remove the custom-load result", async ({ page }) => {
    await page.goto("/one-rm");
    await fillOneRM(page, { exercise: "Squat", weight: 80, reps: 10 });
    await expect(page.getByText("Calculate a Custom Training Load")).toBeVisible();

    // 20 reps is unsupported (> 15) → no results, no custom load.
    await page.getByLabel("Reps Performed").fill("20");
    await expect(page.getByText("Calculate a Custom Training Load")).not.toBeVisible();
    await expect(page.getByText(/Enter a valid weight and repetition count/)).toBeVisible();
  });

  // 4. Reference Weight Metric/Imperial results and share values agree
  test("Reference Weight: Metric/Imperial results and share agree", async ({ page }) => {
    await page.goto("/ideal-weight");
    await page.getByLabel("Height (cm)").fill("170");
    await page.getByLabel("Age").fill("20");

    await expect(page.getByText("53.5 - 72.3 kg").first()).toBeVisible();
    await expect(page.getByText("63.6 kg").first()).toBeVisible();

    await page.getByRole("button", { name: /Imperial/ }).click();
    await expect(page.getByText("117.9 - 159.3 lbs").first()).toBeVisible();
    await expect(page.getByText("140.2 lbs").first()).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();
    const card = page.locator('[data-shareable-card]').first();
    await expect(card).toContainText("117.9-159.3");
    await expect(card).toContainText("140.2");
    await expect(card).toContainText("lbs");

    await exportPng(page);
  });

  // 5. Historical formulas separate + applicability limitation
  test("Reference Weight: historical formulas separate and respect applicability", async ({ page }) => {
    await page.goto("/ideal-weight");
    await page.getByLabel("Height (cm)").fill("170");
    await page.getByLabel("Age").fill("20");
    await page.locator('input[name="gender"]').first().click();

    // At 170 cm the four historical formulas show, with no BMI duplicate.
    await expect(page.getByText("Robinson Formula")).toBeVisible();
    await expect(page.getByText("Miller Formula")).toBeVisible();
    await expect(page.getByText("Bmi Formula")).not.toBeVisible();

    // Below five feet (150 cm) historical formulas are suppressed.
    await page.getByLabel("Height (cm)").fill("150");
    await expect(
      page.getByText(/Historical formulas are not displayed for this height/)
    ).toBeVisible();
    await expect(page.getByText("Robinson Formula")).not.toBeVisible();
    // BMI-based range still available.
    await expect(page.getByText(/Weight-for-Height Reference Range/)).toBeVisible();
  });

  // 6. Manual Macro mode hides protein g/kg (no hidden body weight)
  test("Macro: manual mode does not show protein g/kg guidance", async ({ page }) => {
    await page.goto("/macros");
    // Enter a body weight in calculated mode first (creates a hidden weight).
    await page.getByLabel("Age").fill("25");
    await page.getByLabel("Weight (kg)").fill("70");
    await page.getByLabel("Height (cm)").fill("170");
    await page.locator('input[name="gender"]').first().click();
    await page.locator('label:has-text("Physical Activity Level") + select').selectOption("active");
    await expect(page.getByText(/g per kg body weight/)).toBeVisible();

    // Switch to manual calorie mode → protein g/kg context must disappear.
    await page.getByRole("radio", { name: "Enter manually" }).click();
    await page.getByLabel("Daily Calorie Target").fill("2000");
    await expect(page.getByText(/g per kg body weight/)).not.toBeVisible();
  });

  // Focused mobile layout check
  test("Mobile layout: custom training controls and reference cards fit", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/one-rm");
    await fillOneRM(page, { exercise: "Other", customName: "Leg Press", weight: 80, reps: 10 });
    await expect(page.getByText("Calculate a Custom Training Load")).toBeVisible();
    let overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.goto("/ideal-weight");
    await page.getByLabel("Height (cm)").fill("170");
    await page.getByLabel("Age").fill("20");
    overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});