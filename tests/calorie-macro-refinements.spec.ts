import { test, expect } from "@playwright/test";
import * as fs from "fs";

/*
 * NutriSculpt — 04F-1 Calories & Macro output refinement coverage.
 *
 * Focused, high-risk flows only. Full Desktop + Mobile site regression is
 * deferred to 04J. Tests run against the production build served by
 * `npm run start` (http://localhost:3000), NOT the broken Turbopack dev server.
 *
 * Expected values (age 25, 70 kg, 170 cm, male, Active PAL):
 *   RMR = 1643, Maintenance EER = 2956
 *   goal -250 → 2706, goal 0 → 2956, goal +500 → 3456
 *   Balanced macros from raw EER: P185 / C333 / F99 g
 *   Manual 2000 kcal Balanced: P125 / C225 / F67 g
 */

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const fillCaloriesInputs = async (page) => {
  await page.getByLabel("Age").fill("25");
  await page.getByLabel("Weight (kg)").fill("70");
  await page.getByLabel("Height(cm)").fill("170");
  await page.locator('input[name="gender"]').first().click();
  await page.locator('label:has-text("Physical Activity Level") + select').selectOption("active");
};

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

test.describe("Calorie & macro refinements", () => {
  // ------------------------------------------------------------------
  // 1. Calories goal-responsive primary result
  // ------------------------------------------------------------------
  test("Calories: maintenance, deficit and surplus update the primary result", async ({
    page,
  }) => {
    await page.goto("/calories");
    await fillCaloriesInputs(page);
    const goalSelect = page.locator('label:has-text("Goal") + select');

    // Deficit -250 → 2706 (maintenance 2956, RMR 1643).
    await goalSelect.selectOption("-250");
    await expect(page.getByText("2706", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("2956", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("1643", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Main planning result")).toBeVisible();

    // Maintenance 0 → 2956 (no adjustment).
    await goalSelect.selectOption("0");
    await expect(page.getByText("2956", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/No adjustment/)).toBeVisible();

    // Surplus +500 → 3456.
    await goalSelect.selectOption("500");
    await expect(page.getByText("3456", { exact: true }).first()).toBeVisible();
  });

  // ------------------------------------------------------------------
  // 2. Calories share preview + PNG contain goal-adjusted, RMR, maintenance
  // ------------------------------------------------------------------
  test("Calories: preview and PNG show goal-adjusted value, RMR and maintenance", async ({
    page,
  }) => {
    await page.goto("/calories");
    await fillCaloriesInputs(page);
    await page.locator('label:has-text("Goal") + select').selectOption("-250");

    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();
    const card = page.locator('[data-shareable-card]').first();
    await expect(card).toContainText("2706");
    await expect(card).toContainText("kcal/day");
    await expect(card).toContainText("Maintenance");
    await expect(card).toContainText("2956");
    await expect(card).toContainText("RMR");
    await expect(card).toContainText("1643");

    await exportPng(page);
  });

  // ------------------------------------------------------------------
  // 3. Macro calculated + manual modes; invalid custom does not leak
  // ------------------------------------------------------------------
  test("Macro: calculated mode uses full-precision EER (P185/C333/F99)", async ({
    page,
  }) => {
    await page.goto("/macros");
    await page.getByLabel("Age").fill("25");
    await page.getByLabel("Weight (kg)").fill("70");
    await page.getByLabel("Height (cm)").fill("170");
    await page.locator('input[name="gender"]').first().click();
    await page.locator('label:has-text("Physical Activity Level") + select').selectOption("active");

    await expect(page.getByText(/Calculated Daily Calories:\s*2956/)).toBeVisible();
    await expect(page.getByText("185g", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("333g", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("99g", { exact: true }).first()).toBeVisible();
  });

  test("Macro: invalid custom distribution shows message and leaks no results", async ({
    page,
  }) => {
    await page.goto("/macros");
    await page.getByRole("radio", { name: "Enter manually" }).click();
    await page.getByLabel("Daily Calorie Target").fill("2000");
    await page.locator('label:has-text("Choose Preset") + select').selectOption("Custom");

    await page.getByLabel("Protein %").fill("25");
    await page.getByLabel("Carbohydrates %").fill("45");
    await page.getByLabel("Fat %").fill("40"); // total 110 → invalid

    await expect(page.getByText(/must add up to 100%/)).toBeVisible();
    // No macro result cards, no meal distribution, no share preview.
    await expect(page.getByRole("heading", { name: "Protein", exact: true })).not.toBeVisible();
    await expect(page.getByText("Daily Meal Distribution (Example)")).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).not.toBeVisible();

    // Fix to a valid 25/45/30 → results return.
    await page.getByLabel("Fat %").fill("30");
    await expect(page.getByText("125g", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();
  });

  test("Macro: manual calorie mode and share PNG work", async ({ page }) => {
    await page.goto("/macros");
    await page.getByRole("radio", { name: "Enter manually" }).click();
    await page.getByLabel("Daily Calorie Target").fill("2000");

    await expect(page.getByText("125g", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("225g", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("67g", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();

    const card = page.locator('[data-shareable-card]').first();
    await expect(card).toContainText("125g");
    await expect(card).toContainText("225g");
    await expect(card).toContainText("67g");
    await expect(card).toContainText("2000");

    await exportPng(page);
  });

  // ------------------------------------------------------------------
  // 4. Meal-count selection updates distribution, preserves daily totals
  // ------------------------------------------------------------------
  test("Macro: meal count changes distribution but not daily totals", async ({
    page,
  }) => {
    await page.goto("/macros");
    await page.getByRole("radio", { name: "Enter manually" }).click();
    await page.getByLabel("Daily Calorie Target").fill("2000");

    // Default 3 meals: Breakfast/Lunch/Dinner present.
    await expect(page.getByText("Breakfast", { exact: true })).toBeVisible();
    await expect(page.getByText("Dinner", { exact: true })).toBeVisible();
    // Daily protein total unchanged.
    await expect(page.getByText("125g", { exact: true }).first()).toBeVisible();

    // Switch to 4 meals.
    await page.locator('label:has-text("Meals per day") select').selectOption("4");
    await expect(page.getByText("Meal 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Meal 4", { exact: true })).toBeVisible();
    await expect(page.getByText("Breakfast", { exact: true })).not.toBeVisible();
    // Daily totals preserved.
    await expect(page.getByText("125g", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("225g", { exact: true }).first()).toBeVisible();
    // 125 g protein across 4 meals → 32/31/31/31 (sum 125).
    await expect(page.getByText("32g", { exact: true })).toBeVisible();
  });

  // ------------------------------------------------------------------
  // 5. Focused mobile layout check (changed surfaces, no horizontal scroll)
  // ------------------------------------------------------------------
  test("Mobile layout: calories share card and meal cards fit without overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/calories");
    await fillCaloriesInputs(page);
    await page.locator('label:has-text("Goal") + select').selectOption("-250");
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();
    let overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.goto("/macros");
    await page.getByRole("radio", { name: "Enter manually" }).click();
    await page.getByLabel("Daily Calorie Target").fill("2000");
    await page.locator('label:has-text("Meals per day") select').selectOption("6");
    await expect(page.getByText("Meal 6", { exact: true })).toBeVisible();
    overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});