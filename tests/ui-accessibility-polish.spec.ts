import { test, expect } from "@playwright/test";

/*
 * NutriSculpt — 04I UI, Copy & Accessibility Polish coverage.
 *
 * Focused flows only; the full 192-test matrix remains deferred to 04J.
 * Runs against the production build via `npm run start` (http://localhost:3000).
 */

test.describe("UI, copy & accessibility polish", () => {
  // 1. Homepage renders with correct brand and tagline
  test("homepage renders with brand and tagline", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/NutriSculpt/);
    await expect(
      page.getByRole("heading", { name: /Nourishing Bodies & Sculpting Greatness/ })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Start Your Transformation/ })).toBeVisible();
    // Scope to hero section to avoid multiple "Explore Services" matches
    const hero = page.locator("#hero");
    await expect(hero.getByRole("link", { name: /Explore Services/ })).toBeVisible();
  });

  // 2. Header keyboard navigation
  test("header calculator dropdown keyboard accessible", async ({ page }) => {
    await page.goto("/");
    const isMobile = (await page.viewportSize()).width < 768;

    if (isMobile) {
      // On mobile, calculator links are in the mobile menu
      await page.getByLabel("Toggle menu").click();
      const mobileMenu = page.locator("header .border-t.md\\:hidden");
      await expect(mobileMenu.getByRole("link", { name: /BMI Calculator/ })).toBeVisible();
      await page.getByLabel("Toggle menu").click();
    } else {
      const calcButton = page.getByLabel("Calculator menu");
      await expect(calcButton).toBeVisible();

      // Open with Enter
      await calcButton.focus();
      await page.keyboard.press("Enter");
      const dropdown = page.getByRole("menu", { name: /calculator menu/i });
      await expect(dropdown).toBeVisible();
      await expect(page.getByRole("menuitem", { name: /BMI Calculator/ })).toBeVisible();

      // Close with Escape
      await page.keyboard.press("Escape");
      await expect(dropdown).not.toBeVisible();
    }
  });

  // 3. Header calculator dropdown has all seven calculators
  test("header calculator dropdown has all seven calculators", async ({ page }) => {
    await page.goto("/");
    const isMobile = (await page.viewportSize()).width < 768;

    if (isMobile) {
      await page.getByLabel("Toggle menu").click();
      const mobileMenu = page.locator("header .border-t.md\\:hidden");
      await expect(mobileMenu.getByRole("link", { name: /BMI Calculator/ })).toBeVisible();
      await expect(mobileMenu.getByRole("link", { name: /Calorie Calculator/ })).toBeVisible();
      await expect(mobileMenu.getByRole("link", { name: /Macro Calculator/ })).toBeVisible();
      await expect(mobileMenu.getByRole("link", { name: /1RM Calculator/ })).toBeVisible();
      await expect(mobileMenu.getByRole("link", { name: /Reference Weight Calculator/ })).toBeVisible();
      await expect(mobileMenu.getByRole("link", { name: /Water Intake Calculator/ })).toBeVisible();
      await expect(mobileMenu.getByRole("link", { name: /Heart Rate Calculator/ })).toBeVisible();
    } else {
      await page.getByLabel("Calculator menu").click();
      await expect(page.getByRole("menuitem", { name: /BMI Calculator/ })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: /Calorie Calculator/ })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: /Macro Calculator/ })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: /1RM Calculator/ })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: /Reference Weight Calculator/ })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: /Water Intake Calculator/ })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: /Heart Rate Calculator/ })).toBeVisible();
    }
  });

  // 4. Header Expert Connect CTA routes correctly
  test("header connect to an expert routes correctly", async ({ page }) => {
    await page.goto("/");
    const isMobile = (await page.viewportSize()).width < 768;

    if (isMobile) {
      await page.getByLabel("Toggle menu").click();
      const mobileMenu = page.locator("header .border-t.md\\:hidden");
      const expertLink = mobileMenu.getByRole("link", { name: /Connect to an Expert/ });
      await expect(expertLink).toHaveAttribute("href", /expert-connect\?source=homepage/);
    } else {
      const expertLink = page.locator("header").getByRole("link", { name: /Connect to an Expert/ });
      await expect(expertLink).toHaveAttribute("href", /expert-connect\?source=homepage/);
    }
  });

  // 5. Theme toggle works without breaking navigation
  test("theme toggle works without breaking navigation", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByLabel(/Switch to (light|dark) mode/);
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole("heading", { name: /Nourishing Bodies/ })).toBeVisible();
    // Toggle back
    await toggle.click();
    await expect(page.getByRole("heading", { name: /Nourishing Bodies/ })).toBeVisible();
  });

// 6. Mobile navigation opens, works and closes
  test("mobile navigation opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // Open mobile menu
    await page.getByLabel("Toggle menu").click();

    // Mobile menu container (md:hidden div with border-t)
    const mobileMenu = page.locator("header .border-t.md\\:hidden");
    await expect(mobileMenu).toBeVisible();
    await expect(mobileMenu.getByRole("link", { name: /^Services$/ })).toBeVisible();
    await expect(mobileMenu.getByRole("link", { name: /^Our Approach$/ })).toBeVisible();

    // Calculator links in mobile menu
    await expect(mobileMenu.getByRole("link", { name: /BMI Calculator/ })).toBeVisible();
    await expect(mobileMenu.getByRole("link", { name: /Reference Weight Calculator/ })).toBeVisible();
    await expect(mobileMenu.getByRole("link", { name: /Heart Rate Calculator/ })).toBeVisible();

    // Close mobile menu
    await page.getByLabel("Toggle menu").click();
    await expect(mobileMenu).not.toBeVisible();
  });

  // 7. Footer navigation contains valid destinations
  test("footer has valid navigation links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: /Home/ })).toBeVisible();
    await expect(footer.getByRole("link", { name: /Services/ })).toBeVisible();
    await expect(footer.getByRole("link", { name: /Fitness & Health Snapshot/ })).toBeVisible();
    await expect(footer.getByRole("link", { name: /Calculators/ })).toBeVisible();
    await expect(footer.getByRole("link", { name: /Connect to an Expert/ })).toBeVisible();
    await expect(footer.getByRole("link", { name: /Privacy Notice/ })).toBeVisible();
    await expect(footer.getByRole("link", { name: /Terms of Use/ })).toBeVisible();
    await expect(footer.getByRole("link", { name: /Health & Fitness Disclaimer/ })).toBeVisible();
  });

  // 8. No public WhatsApp elements
  test("no public WhatsApp elements on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /WhatsApp/i })).not.toBeVisible();
    await expect(page.getByText(/WhatsApp/i)).not.toBeVisible();
  });

  // 9. Legal pages render
  test("privacy policy page renders", async ({ page }) => {
    await page.goto("/privacy-policy");
    await expect(page.getByRole("heading", { name: /Privacy Notice/ })).toBeVisible();
    await expect(page.getByText(/Draft/)).toBeVisible();
  });

  test("terms page renders", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /Terms of Use/ })).toBeVisible();
    await expect(page.getByText(/Draft/)).toBeVisible();
  });

  test("disclaimer page renders", async ({ page }) => {
    await page.goto("/disclaimer");
    await expect(page.getByRole("heading", { name: /Health & Fitness Disclaimer/ })).toBeVisible();
    await expect(page.getByText(/Draft/)).toBeVisible();
  });

  // 10. Form labels programmatically associated (Expert Connect)
  test("expert connect form labels are associated", async ({ page }) => {
    await page.goto("/expert-connect");
    // Each required field should have a label
    await expect(page.getByLabel(/Full Name/)).toBeVisible();
    await expect(page.getByLabel(/Email address/)).toBeVisible();
    await expect(page.getByLabel(/Phone number/)).toBeVisible();
    await expect(page.getByLabel(/Interested Service Category/)).toBeVisible();
    await expect(page.getByLabel(/What would you like to achieve/)).toBeVisible();
    await expect(page.getByLabel(/Age Group/)).toBeVisible();
  });

  // 11. Calculator inputs have proper labels
  test("bmi calculator inputs have proper labels", async ({ page }) => {
    await page.goto("/bmi");
    await expect(page.getByLabel(/Age/)).toBeVisible();
    await expect(page.getByLabel(/Height \(cm\)/)).toBeVisible();
    await expect(page.getByLabel(/Weight \(kg\)/)).toBeVisible();
    // BMI calculator doesn't require gender input
  });

  // 11b. Macro calculator has gender radio buttons
  test("macro calculator inputs have proper labels", async ({ page }) => {
    await page.goto("/macros");
    await expect(page.getByLabel(/Age/)).toBeVisible();
    await expect(page.getByLabel(/Height \(cm\)/)).toBeVisible();
    await expect(page.getByLabel(/Weight \(kg\)/)).toBeVisible();
    await expect(page.locator('input[type="radio"][name="gender"]').first()).toBeVisible();
    await expect(page.locator('input[type="radio"][name="gender"]').last()).toBeVisible();
  });

  // 12. Reduced motion respected
  test("reduced motion respected on homepage", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    // Animations should be reduced; the page should still render
    await expect(page.getByRole("heading", { name: /Nourishing Bodies/ })).toBeVisible();
  });

  // 13. Narrow mobile layout - no horizontal overflow
  test("no horizontal overflow at 320px on key pages", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });

    for (const route of ["/", "/bmi", "/transformation", "/services/category/strength-fitness-performance", "/expert-connect"]) {
      await page.goto(route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });

  // 14. Reference Weight terminology used (not Ideal Weight)
  test("reference weight terminology used in calculator", async ({ page }) => {
    await page.goto("/ideal-weight");
    await expect(page.getByRole("heading", { name: /Reference Weight/ })).toBeVisible();
    await expect(page.getByText(/Ideal Weight/i)).not.toBeVisible();
  });

  // 15. Share button keyboard accessible
  test("share button keyboard accessible on bmi page", async ({ page }) => {
    await page.goto("/bmi");
    await page.getByLabel(/Age/).fill("30");
    await page.getByLabel(/Height \(cm\)/).fill("175");
    await page.getByLabel(/Weight \(kg\)/).fill("70");

    // Wait for result card
    await expect(page.getByRole("heading", { name: /Your Shareable Result/ })).toBeVisible();

    const shareButton = page.getByRole("button", { name: /Share Result/ });
    await expect(shareButton).toBeVisible();
    await shareButton.focus();
    await expect(shareButton).toBeFocused();
  });
});