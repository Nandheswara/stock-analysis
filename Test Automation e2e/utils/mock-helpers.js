/**
 * Mock & Network Helper Utilities for Playwright Tests
 * 
 * Provides network interception for Firebase Auth, Realtime Database,
 * external market data APIs, and DOM ready verification.
 */

/**
 * Waits for dynamic navbar and footer injected by navigation-loader.js
 * @param {import('@playwright/test').Page} page
 */
export async function waitForAppReady(page) {
  // Wait for DOM content
  await page.waitForLoadState('domcontentloaded');

  // Wait for dynamic navbar component injection (navBrandLink or .navbar)
  await page.locator('#navBrandLink, .navbar').first().waitFor({
    state: 'attached',
    timeout: 5000
  }).catch(() => {
    // Gracefully continue if page does not load navbar
  });

  // Wait for dynamic footer component injection (footer element replaces #footer-placeholder)
  await page.locator('footer, .footer-links').first().waitFor({
    state: 'attached',
    timeout: 5000
  }).catch(() => {
    // Gracefully continue if page does not load footer
  });
}

/**
 * Intercepts external CORS proxy and market data API calls to provide fast, deterministic responses
 * @param {import('@playwright/test').Page} page
 * @param {Object} [customData]
 */
export async function mockStockApiRoutes(page, customData = {}) {
  await page.route('**/api/groww/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'SUCCESS',
        data: {
          symbol: 'RELIANCE',
          name: 'Reliance Industries Limited',
          price: 2980.5,
          marketCap: '20,54,320 Cr',
          pe: 28.5,
          pb: 2.4,
          roe: 9.8,
          roce: 11.2,
          debtToEquity: 0.35,
          ...customData
        }
      })
    });
  });

  await page.route('**/api/yahoo/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        symbol: 'RELIANCE.NS',
        regularMarketPrice: 2980.5,
        fiftyTwoWeekHigh: 3024.9,
        fiftyTwoWeekLow: 2220.3,
        beta: 1.05
      })
    });
  });
}

/**
 * Mocks Firebase Auth network endpoints for hermetic testing
 * @param {import('@playwright/test').Page} page
 * @param {Object} [mockUser]
 */
export async function mockFirebaseAuthEndpoints(page, mockUser = null) {
  const defaultUser = {
    localId: 'test_user_uid_12345',
    email: 'testuser@equitylabs.app',
    displayName: 'Test User',
    idToken: 'mock-jwt-token',
    registered: true
  };

  const user = mockUser || defaultUser;

  // Intercept sign-in with password
  await page.route('**/identitytoolkit.googleapis.com/**/accounts:signInWithPassword**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        idToken: user.idToken,
        email: user.email,
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: user.localId,
        displayName: user.displayName,
        registered: true
      })
    });
  });

  // Intercept sign-up with password
  await page.route('**/identitytoolkit.googleapis.com/**/accounts:signUp**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        idToken: user.idToken,
        email: user.email,
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: user.localId,
        displayName: user.displayName
      })
    });
  });

  // Intercept password reset
  await page.route('**/identitytoolkit.googleapis.com/**/accounts:sendOobCode**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: user.email
      })
    });
  });
}

/**
 * Listens for uncaught browser errors during page execution
 * @param {import('@playwright/test').Page} page
 * @returns {Array<Error>}
 */
export function trackPageErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => {
    // Filter out expected external network failures if any
    errors.push(err);
  });
  return errors;
}
