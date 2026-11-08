/**
 * Centralized Authentication Credentials for E2E Test Automation
 * Uses user-specified credentials with environment variable fallback.
 */
export const TEST_CREDENTIALS = {
  email: process.env.TEST_USER_EMAIL || 'testing@gmail.com',
  password: process.env.TEST_USER_PASSWORD || 'Test@1234'
};

