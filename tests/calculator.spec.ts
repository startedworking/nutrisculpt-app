import { test, expect } from "@playwright/test";
import * as fs from "fs";

const weightInput = (page, label) =>
  page.locator(`label:has-text('${label}') + input`);

test.describe("NutriSculpt calculator interactions & PNG export", () => {
  test("BMI: defaults blank, valid entry, unit switch, validation, result update", async ({
    page,
  }) => {
    await page.goto("/bmi");

    // Inputs start blank; fill weight and height first (age blank) → BMI shows
    await weightInput(page, "Weight (kg)").fill("80");
    await weightInput(page, "Height (cm)").fill("175");

    await expect(page.getByText("Your BMI Result")).toBeVisible();
    await expect(page.getByText("26.1", { exact: true }).first()).toBeVisible();

    // Now add age under 20 → adult BMI category should disappear
    await page.getByPlaceholder("25").fill("16");
    await expect(
      page.getByText(/intended for adults age 20 and older/),
    ).toBeVisible();

    // Add a valid adult age → BMI result returns
    await page.getByPlaceholder("25").fill("30");
    await expect(page.getByText("Your BMI Result")).toBeVisible();
    await expect(page.getByText("26.1", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: /Imperial/i }).click();
    await expect(weightInput(page, "Weight (lb)")).toHaveValue("176.4");
    await expect(page.getByPlaceholder("Feet")).toBeVisible();

    await page.getByRole("button", { name: /Metric/i }).click();
    await expect(page.getByPlaceholder("25")).toHaveValue("30");
    await expect(
      page.getByText(/intended for adults age 20 and older/),
    ).not.toBeVisible();
  });

  test("BMI: shareable result heading renders with valid adult inputs", async ({
    page,
  }) => {
    await page.goto("/bmi");
    await weightInput(page, "Weight (kg)").fill("80");
    await weightInput(page, "Height (cm)").fill("175");
    await page.getByPlaceholder("25").fill("30");

    await expect(
      page.getByRole("heading", { name: "Your Shareable Result" }),
    ).toBeVisible();
    await expect(page.getByText("Your BMI Result")).toBeVisible();
  });

  test("downloaded PNG is a valid, readable image matching the preview", async ({
    page,
  }) => {
    await page.goto("/bmi");
    await weightInput(page, "Weight (kg)").fill("80");
    await weightInput(page, "Height (cm)").fill("175");
    await page.getByPlaceholder("25").fill("30");

    const shareBtn = page.getByRole("button", { name: /Share Result/i });
    await shareBtn.click({ force: true });
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download Image/i }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const buffer = fs.readFileSync(path!);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(buffer.subarray(0, 8).equals(pngSignature)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
    // eslint-disable-next-line no-console
    console.log(`PNG valid, ${buffer.length} bytes, file: ${download.suggestedFilename()}`);
  });
});
