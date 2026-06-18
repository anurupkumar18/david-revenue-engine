#!/usr/bin/env tsx
/**
 * Smoke-check email connection API (demo mode: unauthenticated session auto-resolves).
 * Run with backend on :8000 — e.g. ./start.sh or uvicorn in backend/.
 */

const API = process.env.API_BASE || "http://127.0.0.1:8000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const health = await fetch(`${API}/api/health`);
  assert(health.ok, `Backend not reachable at ${API} (${health.status})`);

  const conn = await fetch(`${API}/api/email/connection`, { credentials: "include" });
  assert(conn.ok, `GET /api/email/connection failed: ${conn.status}`);
  const body = (await conn.json()) as {
    connected: boolean;
    oauth_configured: { google: boolean; microsoft: boolean };
  };

  console.log("Email connection status:", {
    connected: body.connected,
    google_oauth: body.oauth_configured?.google,
    microsoft_oauth: body.oauth_configured?.microsoft,
  });

  const oauth = await fetch(`${API}/api/email/oauth-status`);
  assert(oauth.ok, "GET /api/email/oauth-status failed");
  console.log("OAuth env:", await oauth.json());

  console.log("\nManual E2E checklist:");
  console.log("  1. Set AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, PUBLIC_BASE_URL=http://localhost:3000");
  console.log("  2. Sign up / sign in in the UI");
  console.log("  3. Connect Gmail from Send & Schedule section");
  console.log("  4. Send test email to sanjay.bhatia@quantiedge.com");
  console.log("  5. Start sequence on a business profile with discovered contact emails");
  console.log("  6. Confirm inbox delivery and esp_message_id on sent jobs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
