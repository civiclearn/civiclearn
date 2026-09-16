import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================================================
// sync — v44
//
// Changes vs v43 (see HANDOVER-user-sync-bloat.md):
//
//  SAFETY (always on, no flag):
//   S1. The existing-row read before a protected-key merge no longer ignores
//       errors. v43 did `const { data: existingRow } = ...single()` and, if the
//       read failed for any reason other than "no row", proceeded to upsert the
//       client's blob unmerged — overwriting the server copy. v44 distinguishes
//       "no row" (fine, first push) from "read failed" (refuse to write, 503).
//   S2. History invariant: after mergeStats, every session id present in the
//       existing row AND in the incoming payload must still be present in the
//       merged result. If not, nothing is written and a 500 is returned with
//       the reason logged. This makes "lost session" a class of bug that cannot
//       reach the database.
//   S3. mergeStats preserves `totalVisibleSec` (study-timer) as the max of both
//       sides. v43 silently discarded it on every merge.
//   S4. `reset` archives the rows into `user_sync_trash` BEFORE deleting them.
//       If the archive insert fails, the delete is refused. (Table DDL is in
//       user_sync_trash.sql; create it before deploying, otherwise reset simply
//       fails closed.)
//
//  COLLAPSE (gated, off by default):
//   C1. Inside mergeStats, after the union, sessions older than the newest
//       SYNC_KEEP_DETAIL (default 10, by startedAt) are collapsed: `questions[]`
//       and `attemptLog[]` are dropped, `firstAttemptPct` is precomputed from
//       the data being dropped (null when there is none, so the dashboard
//       renders those sessions exactly as it does today), and
//       `detailTrimmed: true` is stamped so history pages can say so.
//       Session COUNT never changes; only per-question detail is removed.
//   C2. Gate: collapse runs only when
//         - SYNC_COLLAPSE_EMAILS contains the (lowercased) email, or
//         - SYNC_COLLAPSE_SITES contains the site, or "*" for every site.
//       Both env vars are comma-separated. With neither set, v44 behaves
//       exactly like v43 apart from S1–S4.
//
//  Env vars (Edge Function secrets):
//    SYNC_COLLAPSE_EMAILS  e.g. "denkor@gmail.com,montarasse@gmail.com"
//    SYNC_COLLAPSE_SITES   e.g. "lt,at"   later "lt,at,lu"   finally "*"
//    SYNC_KEEP_DETAIL      default "10"
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function envList(name: string): string[] {
  return (Deno.env.get(name) || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const COLLAPSE_EMAILS = envList("SYNC_COLLAPSE_EMAILS");
const COLLAPSE_SITES = envList("SYNC_COLLAPSE_SITES");
const KEEP_DETAIL = Math.max(1, parseInt(Deno.env.get("SYNC_KEEP_DETAIL") || "10", 10) || 10);

function collapseEnabled(email: string, site: string): boolean {
  if (COLLAPSE_SITES.includes("*")) return true;
  if (COLLAPSE_EMAILS.includes(email)) return true;
  return COLLAPSE_SITES.includes((site || "").toLowerCase());
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Server-side merge functions (same logic as client, but enforced server-side) ──

function mergeProgress(incoming: any, existing: any): any {
  const merged: any = { ...(existing || {}) };
  for (const key of Object.keys(incoming || {})) {
    const l = incoming[key];
    const r = merged[key];
    if (!r) {
      merged[key] = l;
      continue;
    }
    merged[key] = {
      attempts: Math.max(l.attempts || 0, r.attempts || 0),
      rights: Math.max(l.rights || 0, r.rights || 0),
      wrongs: Math.max(l.wrongs || 0, r.wrongs || 0),
      correct: (l.correct === 1 || r.correct === 1) ? 1 : 0,
      topic: l.topic || r.topic,
      lastSeen: Math.max(l.lastSeen || 0, r.lastSeen || 0),
    };
    if (l._raw || r._raw) {
      merged[key]._raw = l._raw || r._raw;
    }
  }
  return merged;
}

// ---- history collapse helpers (C1) ----

function sessionId(s: any): string {
  return (s && s.id) || JSON.stringify(s && s.startedAt);
}

function sessionHasDetail(s: any): boolean {
  if (!s || typeof s !== "object") return false;
  return (Array.isArray(s.questions) && s.questions.length > 0) ||
    (Array.isArray(s.attemptLog) && s.attemptLog.length > 0);
}

// Same rule as dashboard-v2*.js computeTrendPointsFromFirstAttempts:
// only questions whose firstAttemptCorrect casts to exactly 0 or 1 count.
function firstAttemptPctOf(s: any): number | null {
  const qs = Array.isArray(s && s.questions) ? s.questions : [];
  let n = 0, sum = 0;
  for (const q of qs) {
    const v = Number(q && q.firstAttemptCorrect);
    if (v === 0 || v === 1) { n += 1; sum += v; }
  }
  return n > 0 ? Math.round((sum / n) * 100) : null;
}

function collapseSession(s: any): any {
  if (!sessionHasDetail(s)) return s; // nothing to drop; leave byte-identical
  const { questions: _q, attemptLog: _a, ...rest } = s;
  const pct = (typeof s.firstAttemptPct === "number" && !isNaN(s.firstAttemptPct))
    ? s.firstAttemptPct
    : firstAttemptPctOf(s);
  return { ...rest, firstAttemptPct: pct, detailTrimmed: true };
}

// Collapse everything except the newest `keep` sessions. `merged` must already
// be sorted ascending by startedAt (mergeStats does that).
function collapseHistory(merged: any[], keep: number): any[] {
  if (merged.length <= keep) return merged;
  const cut = merged.length - keep;
  const out = new Array(merged.length);
  for (let i = 0; i < merged.length; i++) {
    out[i] = i < cut ? collapseSession(merged[i]) : merged[i];
  }
  return out;
}

// S2: every id from both inputs must survive in the output.
function historyInvariantViolation(existingHist: any[], incomingHist: any[], mergedHist: any[]): string | null {
  const mergedIds = new Set(mergedHist.map(sessionId));
  for (const s of existingHist) {
    if (!mergedIds.has(sessionId(s))) return `existing session ${sessionId(s)} missing from merge`;
  }
  for (const s of incomingHist) {
    if (!mergedIds.has(sessionId(s))) return `incoming session ${sessionId(s)} missing from merge`;
  }
  const existingDistinct = new Set(existingHist.map(sessionId)).size;
  if (mergedIds.size < existingDistinct) return `merged distinct count ${mergedIds.size} < existing ${existingDistinct}`;
  return null;
}

function mergeStats(incoming: any, existing: any, doCollapse: boolean): any {
  const incomingHist = (incoming && Array.isArray(incoming.history)) ? incoming.history : [];
  const existingHist = (existing && Array.isArray(existing.history)) ? existing.history : [];
  const seen: Record<string, boolean> = {};
  let merged: any[] = [];
  // existing first: the server's copy of a session wins over the client's.
  // Once a session has been collapsed server-side, a stale full copy pushed by
  // a client can never re-inflate it.
  for (const session of existingHist.concat(incomingHist)) {
    const id = sessionId(session);
    if (!seen[id]) {
      seen[id] = true;
      merged.push(session);
    }
  }
  merged.sort((a: any, b: any) => (a.startedAt || 0) - (b.startedAt || 0));

  if (doCollapse) {
    merged = collapseHistory(merged, KEEP_DETAIL);
  }

  const out: any = { history: merged };

  // S3: keep the study-timer high-water mark instead of discarding it.
  const tv = Math.max(
    Number(incoming && incoming.totalVisibleSec) || 0,
    Number(existing && existing.totalVisibleSec) || 0,
  );
  if (tv > 0) out.totalVisibleSec = tv;

  return out;
}

function mergeSaved(incoming: any, existing: any): any {
  const lts = (incoming && incoming._ts) || 0;
  const rts = (existing && existing._ts) || 0;
  if (lts === rts) return (incoming !== null && incoming !== undefined) ? incoming : existing;
  return lts > rts ? incoming : existing;
}

function mergePhase1Progress(incoming: any, existing: any): any {
  if (!existing) return incoming;
  if (!incoming) return existing;
  const iMastered = incoming.mastered || 0;
  const eMastered = existing.mastered || 0;
  return (iMastered >= eMastered) ? incoming : existing;
}

function serverMerge(key: string, incoming: any, existing: any, doCollapse: boolean): any {
  if (key === "civicedge_progress") return mergeProgress(incoming, existing);
  if (key === "civicedge_stats") return mergeStats(incoming, existing, doCollapse);
  if (key === "civicedge_saved") return mergeSaved(incoming, existing);
  if (key === "dk_phase1_progress") return mergePhase1Progress(incoming, existing);
  if (key === "dk_phase2_unlocked") {
    return (incoming === true || incoming === "true" || existing === true || existing === "true")
      ? true : (incoming !== null && incoming !== undefined ? incoming : existing);
  }
  return incoming;
}

const PROTECTED_KEYS = [
  "civicedge_progress",
  "civicedge_stats",
  "civicedge_saved",
  "dk_phase1_progress",
  "dk_phase2_unlocked",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, email, site, key, data } = body;

    if (!email || !site) {
      return json({ error: "Missing email or site" }, 400);
    }

    const emailLc = String(email).toLowerCase();
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // =====================
    // PULL
    // =====================
    if (action === "pull") {
      const { data: rows, error } = await supabase
        .from("user_sync")
        .select("key, data, updated_at")
        .eq("email", emailLc)
        .eq("site", site);

      if (error) return json({ error: error.message }, 500);
      return json({ rows: rows || [] });
    }

    // =====================
    // RESET — archive to user_sync_trash, THEN delete (S4)
    // =====================
    if (action === "reset") {
      const { data: rows, error: readErr } = await supabase
        .from("user_sync")
        .select("email, site, key, data, updated_at")
        .eq("email", emailLc)
        .eq("site", site);

      if (readErr) {
        console.error(`[Sync] RESET refused for ${emailLc}/${site}: read failed: ${readErr.message}`);
        return json({ error: "reset refused: could not read rows" }, 500);
      }

      if (rows && rows.length > 0) {
        const deletedAt = new Date().toISOString();
        const { error: trashErr } = await supabase
          .from("user_sync_trash")
          .insert(rows.map((r: any) => ({ ...r, deleted_at: deletedAt, reason: "reset" })));

        if (trashErr) {
          console.error(`[Sync] RESET refused for ${emailLc}/${site}: archive failed: ${trashErr.message}`);
          return json({ error: "reset refused: could not archive rows" }, 500);
        }
      }

      const { error } = await supabase
        .from("user_sync")
        .delete()
        .eq("email", emailLc)
        .eq("site", site);

      if (error) return json({ error: error.message }, 500);

      console.log(`[Sync] RESET: archived and deleted ${rows ? rows.length : 0} sync rows for ${emailLc} / ${site}`);
      return json({ ok: true, action: "reset" });
    }

    // =====================
    // PUSH — with server-side merge protection
    // =====================
    if (action === "push") {
      if (!key || data === undefined) {
        return json({ error: "Missing key or data" }, 400);
      }

      let finalData = data;

      if (PROTECTED_KEYS.includes(key)) {
        // S1: maybeSingle() returns data=null with no error when there is no
        // row. Any actual error means we do NOT know the server state, so we
        // must not write.
        const { data: existingRow, error: readErr } = await supabase
          .from("user_sync")
          .select("data")
          .eq("email", emailLc)
          .eq("site", site)
          .eq("key", key)
          .maybeSingle();

        if (readErr) {
          console.error(`[Sync] PUSH refused for ${emailLc}/${site}/${key}: existing-row read failed: ${readErr.message}`);
          return json({ error: "push refused: could not read existing row; nothing written" }, 503);
        }

        if (existingRow && existingRow.data !== null && existingRow.data !== undefined) {
          const doCollapse = key === "civicedge_stats" && collapseEnabled(emailLc, site);
          finalData = serverMerge(key, data, existingRow.data, doCollapse);

          if (key === "civicedge_stats") {
            const existingHist = Array.isArray(existingRow.data.history) ? existingRow.data.history : [];
            const incomingHist = (data && Array.isArray(data.history)) ? data.history : [];
            const mergedHist = Array.isArray(finalData.history) ? finalData.history : [];

            // S2
            const violation = historyInvariantViolation(existingHist, incomingHist, mergedHist);
            if (violation) {
              console.error(`[Sync] PUSH refused for ${emailLc}/${site}/${key}: history invariant violated: ${violation}`);
              return json({ error: "push refused: history invariant violated; nothing written" }, 500);
            }

            console.log(
              `[Sync] stats merge ${emailLc}/${site}: existing=${existingHist.length} incoming=${incomingHist.length} merged=${mergedHist.length} collapse=${doCollapse ? "on" : "off"} withDetail=${mergedHist.filter(sessionHasDetail).length}`,
            );
          } else {
            console.log(`[Sync] Server-side merge for ${key} (${emailLc}/${site})`);
          }
        } else if (key === "civicedge_stats" && collapseEnabled(emailLc, site)) {
          // First push for this user+site: still apply the collapse so a fresh
          // row never starts out bloated. Same invariant applies.
          const incomingHist = (data && Array.isArray(data.history)) ? data.history : [];
          finalData = mergeStats(data, null, true);
          const violation = historyInvariantViolation([], incomingHist, finalData.history);
          if (violation) {
            console.error(`[Sync] PUSH refused (first push) for ${emailLc}/${site}: ${violation}`);
            return json({ error: "push refused: history invariant violated; nothing written" }, 500);
          }
        }
      }

      const { error } = await supabase
        .from("user_sync")
        .upsert(
          {
            email: emailLc,
            site,
            key,
            data: finalData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email,site,key" },
        );

      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action. Use 'pull', 'push', or 'reset'." }, 400);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
