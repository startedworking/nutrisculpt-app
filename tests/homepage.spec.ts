import { test, expect } from "@playwright/test";

test.describe("NutriSculpt homepage", () => {
  test("loads and shows brand identity", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/NutriSculpt/);
    await expect(
      page.getByRole("heading", {
        name: "Nourishing Bodies & Sculpting Greatness",
      }),
    ).toBeVisible();
    // On mobile the desktop nav is hidden; open the mobile menu instead.
    const isMobile = (await page.viewportSize()).width < 768;
    if (isMobile) {
      await page.getByLabel("Toggle menu").click();
      await expect(
        page.locator('a[href="/#services"].block.rounded.px-2.py-2'),
      ).toBeVisible();
    } else {
      await expect(page.getByRole("navigation").first()).toBeVisible();
    }
    await expect(
      page.getByRole("link", { name: /Start Your Transformation/ }),
    ).toBeVisible();
    await expect(
      page.locator("#hero").getByRole("link", { name: /Explore Services/ }),
    ).toBeVisible();
  });

  test("navigates to transformation page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Start Your Transformation/ }).click();
    await expect(page).toHaveURL("/transformation");
    await expect(
      page.getByRole("heading", { name: "Start Your Transformation" }),
    ).toBeVisible();
  });

  test("explore services link reaches services section", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero").getByRole("link", { name: /Explore Services/ }).click();
    await expect(page).toHaveURL(/#services/);
  });

  test("header calculator dropdown has all seven calculators", async ({
    page,
  }) => {
    await page.goto("/");
    const isMobile = (await page.viewportSize()).width < 768;
    if (isMobile) {
      await page.getByLabel("Toggle menu").click();
      // On mobile, calculators are in the mobile menu
      const items = page.locator(".border-t nav a");
      await expect(items.filter({ hasText: "BMI Calculator" })).toHaveCount(1);
      await expect(items.filter({ hasText: "Calorie Calculator" })).toHaveCount(1);
      await expect(items.filter({ hasText: "Macro Calculator" })).toHaveCount(1);
      await expect(items.filter({ hasText: "1RM Calculator" })).toHaveCount(1);
      await expect(items.filter({ hasText: "Reference Weight Calculator" })).toHaveCount(1);
      await expect(items.filter({ hasText: "Water Intake Calculator" })).toHaveCount(1);
      await expect(items.filter({ hasText: "Heart Rate Calculator" })).toHaveCount(1);
    } else {
      await page.getByLabel("Calculator menu").click();
      const items = page.getByRole("menuitem");
      await expect(items).toHaveCount(7);
      await expect(items.filter({ hasText: "BMI Calculator" })).toHaveCount(1);
      await expect(items.filter({ hasText: "Calorie Calculator" })).toHaveCount(1);
      await expect(items.filter({ hasText: "Macro Calculator" })).toHaveCount(1);
      await expect(items.filter({ hasText: "1RM Calculator" })).toHaveCount(1);
      await expect(items.filter({ hasText: "Reference Weight Calculator" })).toHaveCount(1);
      await expect(items.filter({ hasText: "Water Intake Calculator" })).toHaveCount(1);
      await expect(items.filter({ hasText: "Heart Rate Calculator" })).toHaveCount(1);
    }
  });

  test("header connect to an expert routes correctly", async ({ page }) => {
    await page.goto("/");
    const isMobile = (await page.viewportSize()).width < 768;
    if (isMobile) {
      await page.getByLabel("Toggle menu").click();
      const expertLink = page.locator(".border-t nav").getByRole("link", { name: /Connect to an Expert/ });
      await expect(expertLink).toHaveAttribute(
        "href",
        /expert-connect\?source=homepage/,
      );
    } else {
      const expertLink = page.locator("header").getByRole("link", { name: /Connect to an Expert/ });
      await expect(expertLink).toHaveAttribute(
        "href",
        /expert-connect\?source=homepage/,
      );
    }
  });

  test("footer has valid navigation links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(
      footer.getByRole("link", { name: /Fitness & Health Snapshot/ }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /Connect to an Expert/ }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /Calculators/ }),
    ).toBeVisible();
  });

  test("no public WhatsApp elements on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /WhatsApp/i })).not.toBeVisible();
    await expect(page.getByText(/WhatsApp/i)).not.toBeVisible();
  });

  test("theme toggle works without breaking navigation", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByLabel(/Switch to (light|dark) mode/);
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole("heading", { name: /Nourishing Bodies/ })).toBeVisible();
  });
});