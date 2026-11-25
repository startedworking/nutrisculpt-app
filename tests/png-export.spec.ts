import { test, expect } from "@playwright/test";
import * as fs from "fs";

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const fillByLabel = async (page, label, value) => {
  // 1) Proper label association (InputField / transformation use htmlFor).
  const byLabel = page.getByLabel(label);
  if ((await byLabel.count()) > 0) {
    const el = byLabel.first();
    const tag = await el.evaluate((n) => n.tagName);
    if (tag === "SELECT") await el.selectOption(value);
    else await el.fill(value);
    return;
  }
  // 2) Raw label + adjacent input/select (calories/macros PAL & Goal have no
  //    htmlFor association).
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
  // 3) Radio: click by accessible name (React removes the value attribute after
  //    hydration, so input[value=...] is unreliable).
  await page.getByRole("radio", { name: value, exact: true }).first().click();
};

// Assert share-card semantics that this checkpoint must preserve:
//   * value and unit are separate (no duplicated/mixed unit)
//   * no legacy "Ideal Weight" terminology
//   * no fabricated percentages
//   * no sensitive input fields rendered into the share output
const assertShareCardSemantics = async (page) => {
  const card = page.locator('[data-shareable-card]').first();
  await expect(card).toBeVisible();

  const cardText = await card.textContent();
  expect(cardText).not.toMatch(/\bkg\s*kg\b/);
  expect(cardText).not.toMatch(/\blbs\s*lbs\b/);
  expect(cardText).not.toMatch(/\blbs\s*kg\b/);
  expect(cardText).not.toMatch(/\bIdeal Weight\b/i);
  // No fabricated percentage score on the card.
  expect(cardText).not.toMatch(/\d+%/);
  // No raw sensitive input values rendered as standalone fields (the card
  // shows only the computed result, category and reference range).
  expect(cardText).not.toMatch(/\b(age|height|resting heart rate)\s*:/i);
};

const verifyPngExport = async ({ page, calculator, inputs }) => {
  await page.goto(`/${calculator}`);

  // Fill synthetic inputs
  for (const [label, value] of Object.entries(inputs)) {
    await fillByLabel(page, label, value);
  }

  // Shareable preview renders
  await expect(
    page.getByRole("heading", { name: "Your Shareable Result" })
  ).toBeVisible({ timeout: 10000 });

  // Share-card semantics (no duplicated unit, no Ideal Weight, no fabricated
  // percentages, no sensitive inputs).
  await assertShareCardSemantics(page);

  // Open share menu (normal user click; no force).
  const shareBtn = page.getByRole("button", { name: /Share Result/i });
  await shareBtn.click();

  // Download PNG
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download Image/i }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();

  // Validate PNG
  const buffer = fs.readFileSync(path!);
  expect(buffer.subarray(0, 8).equals(pngSignature)).toBe(true);
  expect(buffer.length).toBeGreaterThan(500);

  // Sensible filename
  expect(download.suggestedFilename()).toMatch(/\.png$/);

  // Brand text present in preview card
  await expect(
    page.locator('[data-shareable-card]').getByText(/NutriSculpt/i).first()
  ).toBeVisible();

  // eslint-disable-next-line no-console
  console.log(
    `PNG OK: ${calculator} -> ${download.suggestedFilename()} (${buffer.length} bytes)`
  );
};

test.describe("Shareable PNG export — all seven calculators", () => {
  test("BMI", async ({ page }) => {
    await verifyPngExport({
      page,
      calculator: "bmi",
      inputs: { "Weight (kg)": "80", "Height (cm)": "175", Age: "30" },
    });
  });

  test("Calories", async ({ page }) => {
    await verifyPngExport({
      page,
      calculator: "calories",
      inputs: {
        Age: "25",
        "Weight (kg)": "70",
        "Height(cm)": "170",
        "Sex Used by Equation": "male",
        "Physical Activity Level": "active",
        Goal: "-250",
      },
    });
  });

  test("Macros", async ({ page }) => {
    await verifyPngExport({
      page,
      calculator: "macros",
      inputs: {
        Age: "30",
        "Weight (kg)": "70",
        "Height (cm)": "175",
        "Sex Used by Equation": "male",
        "Physical Activity Level": "active",
      },
    });
  });

  test("1RM", async ({ page }) => {
    await verifyPngExport({
      page,
      calculator: "one-rm",
      inputs: { "Weight (kg)": "80", "Reps Performed": "5" },
    });
  });

  test("Reference Weight", async ({ page }) => {
    await verifyPngExport({
      page,
      calculator: "ideal-weight",
      inputs: { "Height (cm)": "170", Age: "30", "Sex Used by Historical Formulas": "male" },
    });
  });

  test("Water Intake", async ({ page }) => {
    await verifyPngExport({
      page,
      calculator: "water-intake",
      inputs: {
        Age: "25",
        "Sex Used by Reference": "male",
      },
    });
  });

  test("Heart Rate Zones", async ({ page }) => {
    await verifyPngExport({
      page,
      calculator: "heart-rate",
      inputs: { Age: "30", "Resting Heart Rate (bpm)": "60" },
    });
  });
});

test.describe("Share semantics & unit normalization", () => {
  test("BMI youth share is blocked", async ({ page }) => {
    await page.goto("/bmi");
    await page.getByLabel("Weight (kg)").fill("80");
    await page.getByLabel("Height (cm)").fill("175");
    // Age left blank → no share preview.
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).not.toBeVisible();

    await page.getByLabel("Age").fill("16");
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).not.toBeVisible();

    await page.getByLabel("Age").fill("30");
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();
  });

  test("Reference Weight says REFERENCE WEIGHT; Metric unit correct", async ({
    page,
  }) => {
    await page.goto("/ideal-weight");
    await page.getByLabel("Height (cm)").fill("170");
    await page.getByLabel("Age").fill("20");
    await page.locator('input[name="gender"]').first().click();

    await expect(page.getByText(/REFERENCE WEIGHT/).first()).toBeVisible();
    await expect(page.getByText("53.5 - 72.3 kg").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();
    const card = page.locator('[data-shareable-card]').first();
    await expect(card).toContainText("53.5-72.3");
    await expect(card).toContainText("kg");
    await expect(page.locator("body")).not.toContainText("kg kg");
    await expect(page.locator("body")).not.toContainText("Ideal Weight");
  });

  test("Reference Weight: Imperial unit correct, no duplicated unit", async ({
    page,
  }) => {
    await page.goto("/ideal-weight");
    await page.getByRole("button", { name: /Imperial/ }).click();
    await page.getByLabel("Height (ft)").fill("5");
    await page.getByLabel("Height (in)").fill("7");
    await page.getByLabel("Age").fill("20");
    await page.locator('input[name="gender"]').first().click();

    await expect(page.getByText(/\d+(\.\d+)? - \d+(\.\d+)? lbs/).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" })
    ).toBeVisible();
    const card = page.locator('[data-shareable-card]').first();
    await expect(card).toContainText("lbs");
    await expect(page.locator("body")).not.toContainText("lbs lbs");
    await expect(page.locator("body")).not.toContainText("lbs kg");
    await expect(page.locator("body")).not.toContainText("Ideal Weight");
  });

  test("Heart Rate share label fits", async ({ page }) => {
    await page.goto("/heart-rate");
    await page.getByLabel("Age").fill("30");
    await page.getByLabel("Resting Heart Rate (bpm) — optional").fill("60");

    await expect(page.getByRole("heading", { name: "Your Shareable Result" })).toBeVisible();
    const card = page.locator('[data-shareable-card]').first();
    await expect(card).toBeVisible();
    // Label is rendered with text-overflow truncation and must not break layout.
    await expect(card.getByText(/HRMAX ESTIMATE/)).toBeVisible();
  });

  test("No fabricated percentages on share cards", async ({ page }) => {
    await page.goto("/bmi");
    await page.getByLabel("Weight (kg)").fill("80");
    await page.getByLabel("Height (cm)").fill("175");
    await page.getByLabel("Age").fill("30");

    const card = page.locator('[data-shareable-card]').first();
    const cardText = await card.textContent();
    expect(cardText).not.toMatch(/\d+%/);
  });
});
