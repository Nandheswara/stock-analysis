/**
 * Centralized Authentication Credentials for E2E Test Automation
 * Uses user-specified credentials with environment variable fallback.
 * Robustly sanitizes values so that empty strings, GitHub Actions boolean evaluations ("true"/"false"),
 * and extra whitespace cleanly resolve to the working test credentials.
 */

function resolveCredential(val, fallback) {
  if (!val) return fallback;
  const trimmed = String(val).trim();
  if (
    trimmed === '' ||
    trimmed === 'true' ||
    trimmed === 'false' ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  ) {
    return fallback;
  }
  return trimmed;
}

export const TEST_CREDENTIALS = {
  email: resolveCredential(process.env.TEST_USER_EMAIL, 'testing@gmail.com'),
  password: resolveCredential(process.env.TEST_USER_PASSWORD, 'Test@1234')
};
