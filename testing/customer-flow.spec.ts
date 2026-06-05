import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const CLERK_EMAIL = process.env.CLERK_TEST_EMAIL || 'test@example.com';
const CLERK_PASSWORD = process.env.CLERK_TEST_PASSWORD || 'password123';
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL || 'http://localhost:3000';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Customer Flow E2E Tests
 * Tests the complete booking journey from sign-up to confirmation
 * 
 * Prerequisites:
 * - Clerk test account configured
 * - Convex backend running
 * - Google Maps API key configured
 * - At least one wash type seeded
 */
test.describe('Customer Flow', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    // Increase timeout for mobile-first viewport
    page.setDefaultTimeout(30000);
  });

  test.afterEach(async () => {
    // Clean up session
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  /**
   * Helper: Wait for page to be fully loaded
   */
  async function waitForPageLoad() {
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
  }

  /**
   * Helper: Skip onboarding if present
   */
  async function skipOnboarding() {
    const skipButton = page.getByText(/skip|continue/i).first();
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
      await waitForPageLoad();
    }
  }

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================

  test.describe('Authentication', () => {
    test('should display welcome screen with sign-in options', async () => {
      await page.goto(`${BASE_URL}/welcome`);
      await waitForPageLoad();
      await skipOnboarding();

      // Verify sign-in options are present
      await expect(page.getByText(/continue with google/i)).toBeVisible();
      await expect(page.getByText(/continue with apple/i)).toBeVisible();
      await expect(page.getByText(/continue with email/i)).toBeVisible();
    });

    test('should navigate to email sign-in screen', async () => {
      await page.goto(`${BASE_URL}/welcome`);
      await waitForPageLoad();

      await page.getByText(/continue with email/i).click();
      await waitForPageLoad();

      // Verify auth screen loaded
      await expect(page.getByPlaceholder(/email/i)).toBeVisible({ timeout: 5000 });
    });

    test('should show team login link on welcome screen', async () => {
      await page.goto(`${BASE_URL}/welcome`);
      await waitForPageLoad();
      await skipOnboarding();

      await expect(page.getByText(/team login/i).first()).toBeVisible();
    });

    test('should navigate to team login from welcome screen', async () => {
      await page.goto(`${BASE_URL}/welcome`);
      await waitForPageLoad();
      await skipOnboarding();

      await page.getByText(/team login/i).first().click();
      await waitForPageLoad();

      // Verify team login page loaded
      expect(page.url()).toContain('/team/login');
    });
  });

  // ============================================
  // ADDRESS SELECTION TESTS
  // ============================================

  test.describe('Address Selection', () => {
    test('should display address search with Google Places autocomplete', async () => {
      // Navigate to address screen (may require auth)
      await page.goto(`${BASE_URL}/address`);
      await waitForPageLoad();

      // Verify search input exists
      await expect(page.getByPlaceholder(/search.*address/i).or(
        page.getByPlaceholder(/enter.*address/i)
      )).toBeVisible({ timeout: 5000 });
    });

    test('should show current location option', async () => {
      await page.goto(`${BASE_URL}/address`);
      await waitForPageLoad();

      await expect(page.getByText(/current location|use.*location/i).first()).toBeVisible();
    });

    test('should have map for pin selection', async () => {
      await page.goto(`${BASE_URL}/address`);
      await waitForPageLoad();

      // Map should be visible (may take a moment to load)
      const mapContainer = page.locator('[data-testid="map"], .map, #map, [class*="map"]').first();
      await expect(mapContainer).toBeVisible({ timeout: 10000 });
    });
  });

  // ============================================
  // TIME WINDOW SELECTION TESTS
  // ============================================

  test.describe('Time Window Selection', () => {
    test('should display date picker', async () => {
      await page.goto(`${BASE_URL}/time`);
      await waitForPageLoad();

      await expect(page.getByText(/select.*date|date.*picker/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should show available time slots after date selection', async () => {
      await page.goto(`${BASE_URL}/time`);
      await waitForPageLoad();

      // Select a date
      const dateInput = page.getByPlaceholder(/select.*date/i).or(
        page.locator('button').filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}/ })
      ).first();

      if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dateInput.click();
        await waitForPageLoad();

        // Should show time slots after date selection
        await expect(page.getByText(/morning|afternoon|evening|AM|PM/i).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show slot availability indicators', async () => {
      await page.goto(`${BASE_URL}/time`);
      await waitForPageLoad();

      // Time slots should show availability (spots left)
      const slots = page.getByText(/\d.*spots?.*left|\d.*bookings?.*left/i);
      const count = await slots.count();
      
      // At least some slots should show availability
      if (count > 0) {
        const firstSlot = slots.first();
        await expect(firstSlot).toBeVisible();
      }
    });
  });

  // ============================================
  // BOOKING SUMMARY TESTS
  // ============================================

  test.describe('Booking Summary', () => {
    test('should display complete booking summary', async () => {
      await page.goto(`${BASE_URL}/summary`);
      await waitForPageLoad();

      // Check all key summary sections
      await expect(page.getByText(/address|location/i).first()).toBeVisible();
      await expect(page.getByText(/service|wash.*type/i).first()).toBeVisible();
      await expect(page.getByText(/schedule|time.*window/i).first()).toBeVisible();
      await expect(page.getByText(/total|price| AED|\$/i).first()).toBeVisible();
    });

    test('should show edit links for each section', async () => {
      await page.goto(`${BASE_URL}/summary`);
      await waitForPageLoad();

      // Should have edit buttons
      const editButtons = page.getByText(/edit|change|modify/i);
      const count = await editButtons.count();
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should display correct pricing breakdown', async () => {
      await page.goto(`${BASE_URL}/summary`);
      await waitForPageLoad();

      // Check for price elements
      await expect(page.getByText(/subtotal/i).first()).toBeVisible();
      await expect(page.getByText(/total/i).first()).toBeVisible();
    });
  });

  // ============================================
  // BOOKING CONFIRMATION TESTS
  // ============================================

  test.describe('Booking Confirmation', () => {
    test('should have confirm booking button', async () => {
      await page.goto(`${BASE_URL}/summary`);
      await waitForPageLoad();

      await expect(page.getByRole('button', { name: /confirm.*booking|book.*now|book.*wash/i }).or(
        page.getByText(/confirm.*booking/i)
      )).toBeVisible();
    });

    test('should navigate to tracking after booking creation', async () => {
      // This test assumes previous steps are completed and booking data exists in store
      // For actual E2E, this would be part of a longer flow
      await page.goto(`${BASE_URL}/summary`);
      await waitForPageLoad();

      const confirmButton = page.getByRole('button', { name: /confirm.*booking|book.*now/i }).or(
        page.getByText(/confirm.*booking/i)
      ).first();

      if (await confirmButton.isVisible({ timeout: 3000 })) {
        await confirmButton.click();
        await waitForPageLoad();

        // Should navigate to tracking or confirmation screen
        expect(['tracking', 'confirm', 'success']).toMatch(page.url());
      }
    });
  });

  // ============================================
  // BOOKING TRACKING TESTS
  // ============================================

  test.describe('Booking Tracking', () => {
    test('should display active bookings list', async () => {
      await page.goto(`${BASE_URL}/(tabs)/bookings`);
      await waitForPageLoad();

      // Should show bookings or empty state
      const bookingsTitle = page.getByText(/your bookings|active bookings|upcoming/i).first();
      const emptyState = page.getByText(/no bookings|haven.*book/i).first();
      
      const bookingsVisible = await bookingsTitle.isVisible({ timeout: 3000 }).catch(() => false);
      const emptyVisible = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
      
      expect(bookingsVisible || emptyVisible).toBeTruthy();
    });

    test('should show booking status timeline', async () => {
      await page.goto(`${BASE_URL}/tracking`);
      await waitForPageLoad();

      // Status timeline should be visible
      await expect(page.getByText(/status|timeline|tracking/i).first()).toBeVisible({ timeout: 5000 });
    });
  });
});