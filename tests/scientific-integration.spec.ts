import { test, expect } from "@playwright/test";

/*
 * NutriSculpt — 04E-2F targeted scientific integration coverage.
 *
 * High-risk scientific flows only. Full Desktop + Mobile site regression is
 * deferred to 04J Release Readiness. These tests run against the production
 * build served by `npm run start` (http://localhost:3000), NOT the broken
 * Turbopack dev server.
 */

test.describe("Scientific integration", () => {
  // ------------------------------------------------------------------
  // BMI — adult share eligibility
  // ------------------------------------------------------------------
  test("BMI: blank age → no share; age 16 → no adult share; age 30 → share", async ({
    page,
  }) => {
    await page.goto("/bmi");
    await page.getByLabel("Weight (kg)").fill("80");
    await page.getByLabel("Height (cm)").fill("175");

    // Blank age: internal BMI exists but no adult result or share.
    await expect(page.getByText("26.1", { exact: true })).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).not.toBeVisible();

    // Age 16: adult classification unavailable, adult share unavailable.
    await page.getByLabel("Age").fill("16");
    await expect(
      page.getByText(/intended for adults age 20 and older/)
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).not.toBeVisible();

    // Age 30: adult BMI result and share preview available.
    await page.getByLabel("Age").fill("30");
    await expect(page.getByText("Your BMI Result")).toBeVisible();
    await expect(page.getByText("26.1", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Calories — adult EER + goal-adjusted estimate
  // ------------------------------------------------------------------
  test("Calories: adult age, explicit sex, DRI PAL, EER and goal-adjusted estimate", async ({
    page,
  }) => {
    await page.goto("/calories");
    await page.getByLabel("Age").fill("25");
    await page.getByLabel("Weight (kg)").fill("70");
    await page.getByLabel("Height(cm)").fill("170");
    await page.locator('input[name="gender"]').first().click();
    await page.locator('label:has-text("Physical Activity Level") + select').selectOption("active");
    await page.locator('label:has-text("Goal") + select').selectOption("0");

    await expect(page.getByText("Estimated Maintenance Energy").first()).toBeVisible();
    await expect(page.getByText("Goal-Adjusted Estimate").first()).toBeVisible();
    // EER value rendered (whole kcal/day).
    await expect(page.getByText(/\d+ calories\/day/).first()).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Macros — calculated EER mode, AMDR context, manual calories mode
  // ------------------------------------------------------------------
  test("Macros: calculated EER mode works, AMDR context appears", async ({
    page,
  }) => {
    await page.goto("/macros");
    await page.getByLabel("Age").fill("30");
    await page.getByLabel("Weight (kg)").fill("70");
    await page.getByLabel("Height (cm)").fill("175");
    await page.locator('input[name="gender"]').first().click();
    await page.locator('label:has-text("Physical Activity Level") + select').selectOption("active");

    await expect(page.getByText(/Calculated Daily Calories/)).toBeVisible();
    await expect(
      page.getByText(/adult AMDR reference ranges/)
    ).toBeVisible();
  });

  test("Macros: manual calories mode still works", async ({ page }) => {
    await page.goto("/macros");
    await page.getByRole("radio", { name: "Enter manually" }).click();
    await page.getByLabel("Daily Calorie Target").fill("2000");
    await expect(page.getByLabel("Daily Calorie Target")).toBeVisible();
    await expect(page.getByText(/2000 calories\/day/).first()).toBeVisible();
    await expect(page.getByText("Carbohydrates", { exact: true }).first()).toBeVisible();
  });

  // ------------------------------------------------------------------
  // 1RM — rep policy and whole-unit display
  // ------------------------------------------------------------------
  test("1RM: 10 reps allowed, 11–15 warning, 16 rejected, whole-unit display", async ({
    page,
  }) => {
    await page.goto("/one-rm");
    await page.getByLabel("Weight (kg)").fill("80");
    await page.getByLabel("Reps Performed").fill("10");

    // 10 reps allowed; primary display whole unit (Brzycki 80 kg @ 10 reps = 106.67 → 107).
    await expect(page.getByText("Primary Estimate (Brzycki)")).toBeVisible();
    await expect(page.getByText("107", { exact: true }).first()).toBeVisible();

    // 11–15 reps → lower-confidence caution note.
    await page.getByLabel("Reps Performed").fill("12");
    await expect(page.getByText(/Lower-confidence estimate/)).toBeVisible();

    // 16 reps → unsupported/rejected (no primary estimate shown).
    await page.getByLabel("Reps Performed").fill("16");
    await expect(page.getByText(/For a more useful 1RM estimate/)).toBeVisible();
    await expect(page.getByText("Primary Estimate (Brzycki)")).not.toBeVisible();
  });

  // ------------------------------------------------------------------
  // Reference Weight — age gate, sex requirement, share units
  // ------------------------------------------------------------------
  test("Reference Weight: age 19 blocked, age 20 allowed, blank sex BMI-only", async ({
    page,
  }) => {
    await page.goto("/ideal-weight");
    await page.getByLabel("Height (cm)").fill("170");

    // Age 19 → blocked.
    await page.getByLabel("Age").fill("19");
    await expect(
      page.getByText(/Reference Weight Not Available for Your Age/)
    ).toBeVisible();

    // Age 20 → allowed, BMI range works without sex.
    await page.getByLabel("Age").fill("20");
    await expect(page.getByText(/Weight-for-Height Reference Range/)).toBeVisible();
    await expect(page.getByText("53.5 - 72 kg").first()).toBeVisible();

    // Blank sex: BMI range works, no historical sex-specific values.
    await expect(
      page.getByText(/Historical Estimation Formulas/)
    ).not.toBeVisible();
  });

  test("Reference Weight: historical formulas require sex", async ({ page }) => {
    await page.goto("/ideal-weight");
    await page.getByLabel("Height (cm)").fill("170");
    await page.getByLabel("Age").fill("20");

    // No sex selected yet → historical section absent.
    await expect(
      page.getByText(/Historical Estimation Formulas/)
    ).not.toBeVisible();

    // Select a sex → historical formulas appear.
    await page.locator('input[name="gender"]').first().click();
    await expect(page.getByText(/Historical Estimation Formulas/)).toBeVisible();
    await expect(page.getByText(/DevineFormula/)).toBeVisible();
  });

  test("Reference Weight: Metric share unit correct, no duplicated unit", async ({
    page,
  }) => {
    await page.goto("/ideal-weight");
    await page.getByLabel("Height (cm)").fill("170");
    await page.getByLabel("Age").fill("20");
    await page.locator('input[name="gender"]').first().click();

    await expect(page.getByRole("heading", { name: "Your Shareable Result" })).toBeVisible();
    const shareCard = page.locator('[data-shareable-card]').first();
    await expect(shareCard).toContainText("53.5-72");
    await expect(shareCard).toContainText("kg");
    // No duplicated/mixed unit (the subtitle's "63.6 kg" is a legitimate
    // reference point, not a duplicated unit badge).
    await expect(page.locator("body")).not.toContainText("kg kg");
    await expect(page.locator("body")).not.toContainText("Ideal Weight");
  });

  test("Reference Weight: Imperial share unit correct, no duplicated unit", async ({
    page,
  }) => {
    await page.goto("/ideal-weight");
    await page.getByRole("button", { name: /Imperial/ }).click();
    await page.getByLabel("Height (ft)").fill("5");
    await page.getByLabel("Height (in)").fill("7");
    await page.getByLabel("Age").fill("20");
    await page.locator('input[name="gender"]').first().click();

    await expect(page.getByText(/Weight-for-Height Reference Range/)).toBeVisible();
    await expect(page.getByText(/\d+(\.\d+)? - \d+(\.\d+)? lbs/).first()).toBeVisible();

    await expect(page.getByRole("heading", { name: "Your Shareable Result" })).toBeVisible();
    const shareCard = page.locator('[data-shareable-card]').first();
    await expect(shareCard).toContainText("lbs");
    await expect(page.locator("body")).not.toContainText("lbs lbs");
    await expect(page.locator("body")).not.toContainText("lbs kg");
    await expect(page.locator("body")).not.toContainText("Ideal Weight");
  });

  // ------------------------------------------------------------------
  // Water — adult AI, explicit sex, no weight-based rule
  // ------------------------------------------------------------------
  test("Water: age 19+, explicit sex required, male 3.7 L, female 2.7 L", async ({
    page,
  }) => {
    await page.goto("/water-intake");
    await page.getByLabel("Age").fill("25");
    await page.locator('input[name="gender"]').first().click();

    await expect(page.getByText("Reference Total Water").first()).toBeVisible();
    await expect(page.getByText("3.7L").first()).toBeVisible();

    await page.locator('input[name="gender"]').nth(1).click();
    await expect(page.getByText("2.7L").first()).toBeVisible();
  });

  test("Water: blank sex → no reference; no weight input; no weight-based rule wording", async ({
    page,
  }) => {
    await page.goto("/water-intake");
    await page.getByLabel("Age").fill("25");
    // No sex selected → prompt shown, no reference value.
    await expect(page.getByText(/Select a sex/)).toBeVisible();
    await expect(page.getByText("3.7L").first()).not.toBeVisible();

    // No weight-based hydration rule wording.
    await expect(page.locator("body")).not.toContainText("35 ml/kg");
    await expect(page.locator("body")).not.toContainText("33 ml/kg");
    await expect(page.locator("body")).not.toContainText(
      "adult weight-based rules should not be applied"
    );

    // No weight input on this page (total-water reference is sex/age based).
    await expect(page.getByLabel(/weight/i)).not.toBeVisible();
  });

  // ------------------------------------------------------------------
  // Heart Rate — Tanaka default, %HRmax without resting HR, HRR with resting HR
  // ------------------------------------------------------------------
  test("Heart Rate: Tanaka default works without sex; %HRmax without resting HR; HRR after resting HR", async ({
    page,
  }) => {
    await page.goto("/heart-rate");
    await page.getByLabel("Age").fill("40");
    // Tanaka default, no sex selected.

    // Tanaka age 40 → 180 bpm.
    await expect(page.getByText("180 bpm").first()).toBeVisible();

    // %HRmax works without resting HR.
    await expect(page.getByText("Moderate Intensity").first()).toBeVisible();
    await expect(page.getByText("Vigorous Intensity").first()).toBeVisible();
    await expect(page.getByText("117 – 135 bpm").first()).toBeVisible();

    // Resting HR added → HRR appears.
    await page.getByLabel("Resting Heart Rate (bpm) — optional").fill("60");
    await expect(page.getByText("Heart Rate Reserve (Karvonen)").first()).toBeVisible();
    await expect(page.getByText("108 – 131 bpm").first()).toBeVisible();
  });

  // ------------------------------------------------------------------
  // Transformation — one valid complete adult flow
  // ------------------------------------------------------------------
  test("Transformation: complete adult flow shows references, no legacy copy", async ({
    page,
  }) => {
    await page.goto("/transformation");

    await page.getByLabel("Age (years)").fill("30");
    await page.getByLabel(/Equation-Specific Sex Input/).selectOption("male");
    await page.getByLabel("Physical Activity Level").selectOption("low_active");
    await page.getByLabel(/What would you like to work on/).selectOption("health");
    await page.getByLabel(/How much aerobic activity do you usually do each week/).selectOption("150_299");
    await page.getByLabel(/Typical intensity/).selectOption("moderate");
    await page.getByLabel(/How many days per week do you perform strength-training exercises/).selectOption("2");

    // Weight and height.
    await page.getByLabel(/Weight \(kg\)/).fill("70");
    await page.getByLabel(/Height \(cm\)/).fill("175");

    // Waist is inside a collapsed optional <details>; expand it first.
    await page.getByText("Add More Details (Optional)").click();
    await page.getByLabel(/Waist Circumference \(cm\)/).fill("85");

    await page.getByRole("button", { name: /View My Fitness Snapshot/ }).click();

    await expect(page.getByText("Estimated Maintenance Energy").first()).toBeVisible();
    await expect(page.getByText("Total Water Population Reference").first()).toBeVisible();
    await expect(page.getByText("Estimated Maximum Heart Rate").first()).toBeVisible();
    await expect(page.getByText("Moderate Intensity").first()).toBeVisible();
    await expect(page.getByText("Vigorous Intensity").first()).toBeVisible();

    // Legacy / unsupported copy must be absent.
    await expect(page.locator("body")).not.toContainText("33 ml/kg");
    await expect(page.locator("body")).not.toContainText("35 ml/kg");
    await expect(page.locator("body")).not.toContainText("Mifflin × activity factor");
    await expect(page.locator("body")).not.toContainText("220 − age");
  });
});
