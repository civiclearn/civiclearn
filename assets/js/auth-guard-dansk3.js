/**
 * auth-guard-dansk3.js  —  STUB for local testing (no login required)
 *
 * In production this file is replaced by the real auth-guard which:
 *   1. Checks the session cookie / JWT
 *   2. Redirects to login if unauthenticated
 *   3. Sets window.civicUser = { email, access_token, ... }
 *
 * For local testing it just sets a fake user immediately so all pages
 * that call waitForAuth() / PD3.init() resolve instantly.
 *
 * Deploy path: /assets/js/auth-guard-dansk3.js
 */

window.civicUser = {
  email:        'test@civiclearn.com',
  access_token: 'test-token-local',
  user_id:      'test-user-local',
};
