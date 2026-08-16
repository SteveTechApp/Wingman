/**
 * API contract check — the CI pin for the declarative route table.
 *
 * Boots the REAL competitor-lookup server on a dedicated port (file-mode
 * store, no Supabase), then drives it over real HTTP:
 *
 *   1. Public surfaces answer with uniform envelopes and status codes.
 *   2. The permission gate is uniform: protected routes 401 without a session,
 *      admin-only routes 403 for a fresh sales session.
 *   3. A throwaway workspace signup issues a session cookie, and the authed
 *      surfaces keep the {ok:true} envelope contract.
 *   4. Business outcomes are status-code honest: resolveMatch no-match is a
 *      200 with ok:false, never a 400.
 *   5. Unknown routes fall through to the uniform 404 envelope.
 *
 * The signup writes only to gitignored data/runtime/ sandbox files. Exit code
 * is non-zero on any contract violation, so CI fails loudly.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
// Distinct from check:workflow's 8899 so the two spawn-server checks can run
// side by side without colliding.
const port = 8898;
const base = `http://127.0.0.1:${port}`;

const errors = [];
const passed = [];

function assert(name, condition, detail) {
  if (condition) {
    passed.push(name);
    console.log(`  ✓ ${name}`);
  } else {
    errors.push(name);
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function waitForHealth() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("Backend health endpoint did not become ready.");
}

async function request(pathname, { method = "GET", body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    // non-JSON responses (e.g. OPTIONS 204) leave json null
  }
  return {
    status: response.status,
    json,
    setCookie: response.headers.get("set-cookie"),
  };
}

const child = spawn(process.execPath, ["server/competitor-lookup-server.mjs"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: String(port),
    WINGMAN_UI_PORT: "3998",
  },
  stdio: "ignore",
  windowsHide: true,
});

try {
  await waitForHealth();

  // --- 1. Public surfaces: uniform envelopes, no session needed ---
  const health = await request("/api/health");
  assert(
    "GET /api/health → 200 {status:\"ok\"}",
    health.status === 200 && health.json?.status === "ok",
    `${health.status} ${JSON.stringify(health.json)?.slice(0, 120)}`,
  );

  const ready = await request("/api/ready");
  assert(
    "GET /api/ready → 200 {ready:true}",
    ready.status === 200 && ready.json?.ready === true,
    `${ready.status} ${JSON.stringify(ready.json)?.slice(0, 120)}`,
  );

  // --- 2. The permission gate is uniform: protected routes 401 without a session ---
  const unauthChecks = [
    ["POST", "/api/competitor/resolveMatch", { manufacturer: "Extron", model: "IN1608" }],
    ["POST", "/api/competitor-lookup", { brand: "Extron", sku: "IN1608", query: "Extron IN1608" }],
    ["POST", "/api/compare/match", { input: "Extron IN1608" }],
    ["GET", "/api/wingman/projects"],
  ];
  for (const [method, pathname, body] of unauthChecks) {
    const response = await request(pathname, { method, body });
    assert(
      `${method} ${pathname} → 401 {ok:false}`,
      response.status === 401 && response.json?.ok === false,
      `${response.status} ${JSON.stringify(response.json)?.slice(0, 120)}`,
    );
  }

  // The local-only intelligence draft bypass is a route-table flag: from
  // loopback, the drafts endpoint is served without a session at all.
  const draftsBypass = await request("/api/intelligence/drafts");
  assert(
    "GET /api/intelligence/drafts (loopback bypass) → 200 {ok:true}",
    draftsBypass.status === 200 && draftsBypass.json?.ok === true,
    `${draftsBypass.status} ${JSON.stringify(draftsBypass.json)?.slice(0, 120)}`,
  );

  // --- 3. Unknown routes fall through to the uniform 404 envelope ---
  const missing = await request("/api/does-not-exist");
  assert(
    "GET /api/does-not-exist → 404 {ok:false, route}",
    missing.status === 404 && missing.json?.ok === false && typeof missing.json?.route === "string",
    `${missing.status} ${JSON.stringify(missing.json)?.slice(0, 120)}`,
  );

  // --- 4. Signup a throwaway workspace and capture the session cookie ---
  const email = `contract-${Date.now()}@wingman.test`;
  const signup = await request("/api/wingman/auth/signup", {
    method: "POST",
    body: { name: "Contract Test", company: "Contract Workspace", email, password: "contract-pass-123" },
  });
  assert(
    "POST /api/wingman/auth/signup → 200 {ok:true}",
    signup.status === 200 && signup.json?.ok === true,
    `${signup.status} ${JSON.stringify(signup.json)?.slice(0, 120)}`,
  );
  const cookie = (signup.setCookie || "").split(";")[0];
  assert(
    "signup issues a wingman_session cookie",
    cookie.startsWith("wingman_session="),
    signup.setCookie || "no set-cookie header",
  );

  const session = await request("/api/wingman/auth/session", { cookie });
  assert(
    "GET /api/wingman/auth/session → 200 {ok:true}",
    session.status === 200 && session.json?.ok === true,
    `${session.status} ${JSON.stringify(session.json)?.slice(0, 120)}`,
  );

  // --- 5. Authed envelope contracts ---
  const compare = await request("/api/compare/match", {
    method: "POST",
    body: { input: "Kramer VS-42H" },
    cookie,
  });
  assert(
    "POST /api/compare/match → 200 {ok:true, competitor, matches}",
    compare.status === 200 &&
      compare.json?.ok === true &&
      typeof compare.json?.competitor === "object" &&
      Array.isArray(compare.json?.matches),
    `${compare.status} ${JSON.stringify(compare.json)?.slice(0, 140)}`,
  );

  const analyze = await request("/api/compare/analyze?input=Kramer%20VS-42H", { cookie });
  assert(
    "GET /api/compare/analyze → 200 {ok:true, competitor}",
    analyze.status === 200 && analyze.json?.ok === true && typeof analyze.json?.competitor === "object",
    `${analyze.status} ${JSON.stringify(analyze.json)?.slice(0, 140)}`,
  );

  // Business outcome, not a client error: resolveMatch with empty input
  // returns the ok:false shape at 200 (the synthetic fallback can resolve
  // unknown models, so the no-match branch is forced with empty input).
  const noMatch = await request("/api/competitor/resolveMatch", {
    method: "POST",
    body: { manufacturer: "", model: "" },
    cookie,
  });
  assert(
    "POST /api/competitor/resolveMatch no-match → 200 {ok:false} (not 400)",
    noMatch.status === 200 && noMatch.json?.ok === false,
    `${noMatch.status} ${JSON.stringify(noMatch.json)?.slice(0, 140)}`,
  );

  // --- 6. Admin-only routes return the uniform 403 for a non-admin member ---
  // The signup user is the workspace OWNER (admin), so a real second member is
  // invited as "sales" and accepts, giving a session scoped to the workspace
  // without canManageWorkspace.
  const memberEmail = `member-${Date.now()}@wingman.test`;
  const invite = await request("/api/wingman/workspace/invitations", {
    method: "POST",
    body: { email: memberEmail, role: "sales" },
    cookie,
  });
  // The raw token is not exposed directly; it rides inside invitation.acceptUrl.
  const inviteAcceptUrl = invite.json?.invitation?.acceptUrl;
  const inviteToken = inviteAcceptUrl ? new URL(inviteAcceptUrl, base).searchParams.get("token") : null;
  assert(
    "POST /api/wingman/workspace/invitations → 200 {ok:true, invitation.acceptUrl}",
    invite.status === 200 && invite.json?.ok === true && typeof inviteToken === "string" && inviteToken.length > 0,
    `${invite.status} ${JSON.stringify(invite.json)?.slice(0, 160)}`,
  );

  const accept = await request("/api/wingman/invitations/accept", {
    method: "POST",
    body: { token: inviteToken, name: "Member Test", password: "member-pass-123" },
  });
  const memberCookie = (accept.setCookie || "").split(";")[0];
  assert(
    "POST /api/wingman/invitations/accept → 200 {ok:true} with a member session cookie",
    accept.status === 200 && accept.json?.ok === true && memberCookie.startsWith("wingman_session="),
    `${accept.status} ${JSON.stringify(accept.json)?.slice(0, 140)}`,
  );

  const adminOnly = await request("/api/governance/competitor-decisions/approve", {
    method: "POST",
    body: { manufacturer: "Extron", model: "IN1608" },
    cookie: memberCookie,
  });
  assert(
    "POST /api/governance/competitor-decisions/approve (sales member) → 403 {ok:false}",
    adminOnly.status === 403 && adminOnly.json?.ok === false,
    `${adminOnly.status} ${JSON.stringify(adminOnly.json)?.slice(0, 140)}`,
  );

  // --- 7. Authed data surfaces keep the envelope contract ---
  const projects = await request("/api/wingman/projects", { cookie });
  assert(
    "GET /api/wingman/projects → 200 {ok:true}",
    projects.status === 200 && projects.json?.ok === true,
    `${projects.status} ${JSON.stringify(projects.json)?.slice(0, 140)}`,
  );

  const queue = await request("/api/governance/competitor-decisions/queue", { cookie });
  assert(
    "GET /api/governance/competitor-decisions/queue → 200 {ok:true}",
    queue.status === 200 && queue.json?.ok === true,
    `${queue.status} ${JSON.stringify(queue.json)?.slice(0, 140)}`,
  );
} finally {
  child.kill("SIGTERM");
}

if (errors.length) {
  console.error(`\n[api-contract] FAILED ${errors.length} of ${errors.length + passed.length} checks:`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`\n[api-contract] All ${passed.length} contract checks passed (server booted on :${port}, throwaway workspace, real HTTP).`);
