import { test, expect } from "@playwright/test";

/*
 * NutriSculpt — 04E-2G final numerical accuracy & session persistence coverage.
 *
 * Focused, high-risk regressions only. Full Desktop + Mobile site regression is
 * deferred to 04J. These tests run against the production build served by
 * `npm run start` (http://localhost:3000), NOT the broken Turbopack dev server.
 *
 * Exact numeric values are asserted (not just the presence of "kg"/"lbs").
 */

const fillByLabel = async (page, label, value) => {
  const byLabel = page.getByLabel(label);
  if ((await byLabel.count()) > 0) {
    const el = byLabel.first();
    const tag = await el.evaluate((n) => n.tagName);
    if (tag === "SELECT") await el.selectOption(value);
    else await el.fill(value);
    return;
  }
  const adj = page.locator(
    `label:has-text('${label}') + input, label:has-text('${label}') + select`
  );
  if ((await adj.count()) > 0) {
    const el = adj.first();
    const tag = await el.evaluate((n) => n.tagName);
    if (tag === "SELECT") await el.selectOption(value);
    else await el.fill(value);
    return;
  }
  await page.getByRole("radio", { name: value, exact: true }).first().click();
};

const maintenanceText = async (page) =>
  (await page.getByText(/\d+ kcal\/day/).first().textContent())?.trim() ?? "";

test.describe("Scientific final regression", () => {
  // ------------------------------------------------------------------
  // 1. Transformation complete snapshot → reload → restored snapshot
  // ------------------------------------------------------------------
  test("Transformation: snapshot survives reload with matching results and PAL", async ({
    page,
  }) => {
    await page.goto("/transformation");

    await page.getByLabel("Age (years)").fill("30");
    await page.getByLabel(/Equation-Specific Sex Input/).selectOption("male");
    await page.getByLabel("Physical Activity Level").selectOption("low_active");
    await page.getByLabel(/What would you like to work on/).selectOption("health");
    await page
      .getByLabel(/How much aerobic activity do you usually do each week/)
      .selectOption("150_299");
    await page.getByLabel(/Typical intensity/).selectOption("moderate");
    await page
      .getByLabel(/How many days per week do you perform strength-training exercises/)
      .selectOption("2");
    await page.getByLabel(/Weight \(kg\)/).fill("70");
    await page.getByLabel(/Height \(cm\)/).fill("175");

    await page.getByRole("button", { name: /View My Fitness Snapshot/ }).click();

    await expect(
      page.getByRole("heading", { name: "Your Fitness & Health Snapshot" })
    ).toBeVisible();
    const before = await maintenanceText(page);
    expect(before).toMatch(/^\d+ kcal\/day$/);

    // Reload: the completed snapshot must be restored from session storage.
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Your Fitness & Health Snapshot" })
    ).toBeVisible();
    expect(await maintenanceText(page)).toBe(before);

    // Adjust Inputs reveals the form with the restored PAL selection.
    await page.getByRole("button", { name: "Adjust Inputs" }).click();
    await expect(page.getByLabel("Physical Activity Level")).toHaveValue(
      "low_active"
    );
  });

  // ------------------------------------------------------------------
  // 2. Transformation → Expert Connect → return → snapshot restored
  // ------------------------------------------------------------------
  test("Transformation: snapshot restored after Expert Connect return", async ({
    page,
  }) => {
    await page.goto("/transformation");

    await page.getByLabel("Age (years)").fill("35");
    await page.getByLabel(/Equation-Specific Sex Input/).selectOption("female");
    await page.getByLabel("Physical Activity Level").selectOption("active");
    await page.getByLabel(/What would you like to work on/).selectOption("strength");
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
    const before = await maintenanceText(page);

    // Navigate to Expert Connect and return via the in-app back link.
    await page.getByRole("link", { name: /Connect to an Expert/ }).click();
    await expect(page).toHaveURL(/expert-connect/);
    await page.getByRole("link", { name: /Back/ }).click();

    await expect(page).toHaveURL(/transformation/);
    await expect(
      page.getByRole("heading", { name: "Your Fitness & Health Snapshot" })
    ).toBeVisible();
    expect(await maintenanceText(page)).toBe(before);
  });

  // ------------------------------------------------------------------
  // 3. 1RM Imperial page/share numerical agreement (80 kg × 10 reps)
  // ------------------------------------------------------------------
  test("1RM: Metric 107 kg and Imperial 235 lb agree across page and share", async ({
    page,
  }) => {
    await page.goto("/one-rm");
    await page.getByLabel("Weight (kg)").fill("80");
    await page.getByLabel("Reps Performed").fill("10");

    // Metric primary display (Brzycki 106.695… → 107 kg).
    await expect(page.getByText("107", { exact: true }).first()).toBeVisible();

    // Toggle to Imperial: the same canonical 80 kg must display/share 235 lb.
    await page.getByRole("button", { name: /Imperial/ }).click();
    await expect(page.getByText("235", { exact: true }).first()).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();
    const card = page.locator('[data-shareable-card]').first();
    await expect(card).toContainText("235");
    await expect(card).toContainText("lb");
    // No unconverted kilogram value leaked into the Imperial share.
    await expect(card).not.toContainText("107");
  });

  // ------------------------------------------------------------------
  // 4. Reference Weight Imperial range + BMI-22 reference agreement
  // ------------------------------------------------------------------
  test("Reference Weight: Imperial range and BMI-22 reference convert correctly", async ({
    page,
  }) => {
    await page.goto("/ideal-weight");
    await page.getByLabel("Height (cm)").fill("170");
    await page.getByLabel("Age").fill("20");

    // Metric reference point and range (BMI 22 → 63.6 kg; 18.5–24.9 → 53.5–72 kg).
    await expect(page.getByText("53.5 - 72 kg").first()).toBeVisible();
    await expect(page.getByText("63.6 kg").first()).toBeVisible();

    // Toggle to Imperial (canonical 170 cm persists).
    await page.getByRole("button", { name: /Imperial/ }).click();

    // Imperial range: 53.5 kg → 117.9 lb, 72 kg → 158.6 lb.
    await expect(page.getByText("117.9 - 158.6 lbs").first()).toBeVisible();
    // Imperial BMI-22 reference point: 63.6 kg → 140.2 lb.
    await expect(page.getByText("140.2 lbs").first()).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();
    const card = page.locator('[data-shareable-card]').first();
    await expect(card).toContainText("117.9-158.6");
    await expect(card).toContainText("140.2");
    await expect(card).toContainText("lbs");
  });
});