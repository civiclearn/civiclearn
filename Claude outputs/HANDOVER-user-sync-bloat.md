# HANDOVER — `user_sync` bloat, history trim, and sync-endpoint findings

**Date of investigation:** 16 September 2026
**Supabase project:** `htgliokekeaovdiafrgs` (CivicLearn, eu-central-2, Postgres 17.6)
**Repo involved:** `civiclearn` (`C:\Users\koivu\Documents\GitHub\civiclearn`)
**Status:** analysis complete, **nothing written to the database, no files changed, no deploys**
**Next action:** write `sync` edge function v44 diff for Denis to review (see §8)

---

## 0. How this started, and the conclusion

Denis asked whether to purge idle Denmark users to save Supabase resources. The
investigation established that idle users cost nothing, and that the real
storage issue is the shape of the `user_sync` payloads. The chain of findings
then led to a user-facing bug (silent progress loss at the browser
`localStorage` quota) and to an unauthenticated destructive endpoint.

**Decisions taken by Denis during the session:**

1. **Do NOT purge idle users.** Leave them as they are.
2. **Fix `user_sync`.** Denis confirmed "let's definitely fix it".
3. History detail is considered low-value by Denis ("barely anyone uses it,
   it is just proper to have") — so collapsing old sessions to summaries is
   acceptable product-wise.

---

## 1. The original question: idle Denmark users — ANSWERED, NO ACTION

| metric | value |
|---|---|
| Total rows in `auth.users` | 13,153 |
| Never signed in since new auth launched | 9,219 |
| DK users (`access_path like '/denmark%'`) | 10,720 |
| …of which never signed in | 8,618 |
| Created in the January 2026 bulk import | 10,522 DK (8,605 never signed in) |
| Of the 8,618 idle DK users: have `user_sync` data | 16 |
| Of the 8,618 idle DK users: have a `login_history` row | 94 |

So ~8,500 DK users have zero footprint. **But:**

- `auth.users` = **9 MB**, `auth.identities` = **7 MB**. Purging all 8,500 frees
  roughly **6 MB out of a 2,618 MB database** (0.2%).
- Supabase MAU billing counts users who authenticate in the period. Dormant
  users never authenticate, so they cost nothing there either.
- Oldest `created_at` is 2025-12-08, so *no* user can be "dormant 12 months" —
  the auth system is only ~9 months old. Age-based metrics are meaningless here.

**Conclusion: idle users are not a cost problem.** The only legitimate argument
for purging is GDPR data minimisation (EU data subjects, no retention policy),
which is a policy decision, not a cost one. If ever revisited, the right shape
is a written retention rule applied to all countries (archive → wait → delete),
not a one-off Denmark purge — and note that **public signups are disabled** on
this project, so a deleted user cannot re-register themselves.

---

## 2. Where the database size actually is

```
db_total              2,618 MB
  public.user_sync    1,168 MB   ← 45% of the entire database
  auth.refresh_tokens    88 MB
  auth.users              9 MB
  auth.identities         7 MB
  auth.audit_log_entries 24 kB
```

Inside `user_sync` (12,289 rows, 3,255 distinct emails), by key —
`pg_column_size` (i.e. TOAST-compressed on-disk size):

| key | rows | stored total | avg | max |
|---|---|---|---|---|
| `civicedge_stats` | 3,683 | **472 MB** | 131 kB | 2,547 kB |
| `civicedge_progress` | 3,700 | **149 MB** | 41 kB | 205 kB |
| `civicedge_saved` | 853 | 893 kB | 1,072 B | 17 kB |
| `civicedge_stats_pretrim_20260725` | 1 | 491 kB | — | — |
| `dk_phase1_progress` | 1,992 | 208 kB | 107 B | 107 B |
| `civiclearn_answered_mcqs` | 67 | 82 kB | 1,253 B | 2,801 B |
| `dk_phase2_unlocked` | 1,905 | 17 kB | 9 B | 9 B |
| `civicedge_testDate` | 89 | 4,691 B | 53 B | 53 B |

**Measured compression ratios** (raw JSON text ÷ stored size), needed for any
`localStorage` estimate because the browser stores raw:

- `civicedge_stats`: **5.62×**
- `civicedge_progress`: **5.18×**

### Age is not a factor

| `updated_at` bucket | rows | emails | size |
|---|---|---|---|
| < 1 month | 2,422 | 928 | 173 MB |
| 1–3 months | 1,395 | 627 | 84 MB |
| 3–6 months | 7,803 | 2,397 | 344 MB |
| **> 6 months** | 670 | 291 | **21 MB** |

No `civicedge_progress` entry anywhere has a `lastSeen` older than 12 months,
and there are **zero** zero-attempt entries. **There is no stale data to purge
on any axis.** Retention rules would free 21 MB of 1,168 MB. The problem is
payload shape, not age.

---

## 3. `civicedge_stats` — why it is 472 MB

`history` is the **only** top-level key. Scan of all 3,683 rows found only
`history` (3,683 rows) and `totalVisibleSec` (32 rows). **There are no
precomputed aggregates**, so every simulation figure on the dashboard is derived
from this array at render time. Deleting `history` therefore deletes all
simulation statistics, not just a history page.

Each `history[]` element is a session; the bulk is `questions[]`, which embeds
static content already present in `questions.json`:

```json
{ "id": "DK-0445", "qText": "Hvilken by er Danmarks næststørste?",
  "topic": "Temaopslag", "correct": false, "userAnswer": 1, "correctAnswer": 0,
  "userAnswerText": "København", "correctAnswerText": "Århus",
  "firstAttemptCorrect": 0 }
```

~341 bytes per question, of which ~165 are the removable text fields.
553,000 attempt-question records stored this way.

Attempts per user: **median 86, p90 359, p99 950, max 2,486**.

### Cost by mode — the single most useful breakdown

Measured over the 60 largest rows (~30,700 sessions):

| mode | sessions | avg bytes | avg `questions[]` | avg `attemptLog[]` | share of bytes |
|---|---|---|---|---|---|
| **topics** | 12,420 | **15,291** | 49 | 43 | **64.3%** |
| simulation | 9,798 | 9,072 | 31 | 0 | 30.1% |
| quick | 7,534 | 1,630 | 5 | 0 | 4.2% |
| traps | 846 | 3,281 | 12 | 0 | 0.9% |
| sequential | 75 | 12,811 | 38 | 0 | 0.3% |
| official | 55 | 5,238 | 25 | 0 | 0.1% |
| essentiel | 16 | 5,921 | 12 | 0 | 0.0% |

**Topics mode is two thirds of the entire problem.** It is the only mode that
writes *both* `questions[]` and `attemptLog[]`, and it runs ~49 questions rather
than 5. One topics session ≈ nine quick tests.

---

## 4. `civicedge_progress` — why it is 149 MB, and a correctness bug

Keyed by **question text**, not ID:

```
"Aktuelle begivenheder:Hvad annoncerede legetøjsgiganten Lego i marts 2026?"
  → { _raw:{depth,topic,source,topicKey,topicLabel},
      topic, rights, wrongs, correct, attempts, lastSeen }
```

- Average key length **65 characters**; `_raw` duplicates bank metadata and is
  present on 78% of entries (106,893 of 137,061 sampled).
- Dropping `_raw` + the duplicated top-level `topic` saves **42.4% of raw bytes**.

**Blocking finding for any re-key work:** checked 137,061 entries across the 40
largest rows — **there is no question ID anywhere**. Not in the key, not in the
value, not in `_raw` (`has_id: 0`, `raw_has_id: 0`, `key_is_bare_id: 0`).

Consequences:

1. Re-keying by `DK-####` requires text-matching against `questions.json`, and
   **every question re-worded for the Aug 2026 SIRI edition would fail to
   match** → silent progress loss. Do not attempt this as a migration.
2. More seriously, this is a live bug: progress is bound to question *wording*,
   so each time a question is re-worded the user's counters for it silently
   orphan and reset. Relevant given the Aug 2026 material update and the
   twice-yearly current-events additions.
3. The correct fix is forward-only: start writing an `id` field client-side, then
   backfill only what can be matched unambiguously.

---

## 5. The pile-up — root cause found, smaller than feared

### Mechanism

`localStorage` is per-origin. Every product on `civiclearn.com` shares one
`civicedge_stats` / `civicedge_progress` key. `sync.js` `pull()` fetches rows for
*one* site and merges them into that shared key; `mergeStats` / `mergeProgress`
are unions. So opening Indfødsret and then Lux writes the combined blob back
under `site = 'lu'`. **The `site` column isolates nothing.**

(vivre-ensemble.lu is a separate origin and so is unaffected; `civiclearn.com/lux/`
is not.)

### Actual scale — much better than expected

Excluding test accounts, of 3,700 `civicedge_progress` rows:

| site | rows | has DK topics | has LU topics | mixed |
|---|---|---|---|---|
| dk | 2,365 | 2,297 | 3 | 3 |
| dk-pr | 534 | 511 | 2 | 2 |
| lu | 368 | 6 | 350 | 3 |
| dkpr | 110 | 74 | 1 | 1 |

**~12 genuinely mixed rows out of 3,700.** Real users mostly escape it because
they don't open two countries.

Caveat: the topic markers cannot distinguish Indfødsret from Medborgerskab
(shared Danish topic names), so DK-internal cross-use is *not* measured by this.

### The extreme rows are Denis's own test accounts

The 3,900+-entry rows replicated under `fi` / `dk` / `lu` / `se` with an
identical Danish+Luxembourgish topic mix belong to:

- `montarasse@gmail.com` (md5 `15cec2d4b3385cef928f83aa48125408`)
- `denkor@gmail.com` (md5 `2434021ed63ec4126d0e925052889fe5`)

### Site label inconsistencies

- `dk-pr` **and** `dkpr` are both live for Denmark-PR; `dkpr` first appears
  2026-05-14. 646 progress rows split across the two spellings. A user hitting
  both gets two disconnected records.
- `site = 'unknown'` on 20 rows — `getSiteCode()` returns
  `window.CIVIC_SITE_CODE || "unknown"`, so these are pages missing that global.
- Leftover `civicedge_stats_pretrim_20260725` row (491 kB) from a trim attempt
  on 25 July 2026 — ask Denis what happened there before assuming it is junk.

---

## 6. Why this matters — the user-facing harm

Storage cost is negligible (cents per month). **The real harm is the browser
`localStorage` quota**, roughly 5 MB per origin.

Estimated per-user `localStorage` footprint (stats + progress, stored size ×
measured compression):

| footprint | users |
|---|---|
| **over ~5 MB (past the cap)** | **52** |
| 4–5 MB | 44 |
| 2–4 MB | 269 |
| average | 918 kB |
| p90 | 2,231 kB |
| worst | 14 MB |

Both write paths swallow the quota exception silently:

```js
// engine-dk.js:201
function writeJsonLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.warn("LS write failed for", key, e); }
}
// sync.js writeLS — identical pattern
```

**The save fails, nothing is surfaced to the user, the app behaves as if it
succeeded.** This is silent progress loss — which Denis has stated must be
avoided at all costs. Safari compounds it by evicting `localStorage` after 7 days
without a visit.

### Who the 52 are

| | over 5 MB (52) | 2–5 MB (313) | under 2 MB (2,814) |
|---|---|---|---|
| median attempts | 464 | 322 | 76 |
| avg attempts | 587 | 426 | 115 |
| on >1 site | 69% (36/52) | 40% (126/313) | 10% (277/2,814) |
| avg distinct site labels | 2.13 | 1.50 | 1.12 |

Profile: **heavy users, practising in topics mode, across more than one
product.** Three multipliers stacking. These are the most committed customers —
topics mode is where a serious candidate lives before an exam.

Activity of the 52: 22 synced in the last 30 days, 18 in the last 7. One is
`denkor@gmail.com`. Last-sync dates for the group span 2026-04-23 to 2026-09-16.
The 30 that went quiet *may* have churned after their saves stopped working —
**this is a hypothesis, not a finding**; there is no version history to test it.

Secondary harm: `pull()` runs on every page load; a p90 user downloads ~2 MB,
`JSON.parse`s it, and `mergeStats` + `stableStringify` serialise the whole
structure twice synchronously on the main thread, possibly followed by
`location.reload()`. Noticeably slow on mid-range Android over mobile data.

---

## 7. What reads `history` — full audit

### `assets/js/history.js` (the History page)

- List view: scalars only — `mode`, `percent`, `total`, `correct`,
  `durationSec`, `startedAt`.
- Click-to-expand detail panel: `session.questions[]` (`qText`, `topic` /
  `topicLabel`, `userAnswerText`, `correctAnswerText`, `correct`) and, for
  topics mode, `session.attemptLog[]` (`qId`, `wave`, `correct`).
- If `questions` is absent it renders an empty list — no crash, but an empty
  "Questions in this session" header. Needs a guard.

### `assets/js/dashboard-v2-dk.js` (and `-lu`, `dashboard-v2.js` — identical family)

| function | status | needs |
|---|---|---|
| `computeTrendPointsFromFirstAttempts` | **LIVE** (called line 639) | `questions[].firstAttemptCorrect`, **`.slice(-9)` only** |
| `computeRollingAccuracy` | defined, **never called** — dead | — |
| `computePerTopicProgressFromHistory` | defined, **never called** — dead | — |

The two dead functions were the only code walking question detail across all of
history. Everything else (`getStats`, `getStreakFromHistory`) uses scalars only.

**Critical detail — the fallback in `computeTrendPointsFromFirstAttempts`:**

```js
if (sess.mode === "topics" && !hasFirstAttemptData) return 0;
return sess.percent || 0;
```

If `questions` is stripped, non-topics sessions fall back to `percent` (fine),
but **topics-mode sessions plot as 0%**. A naive strip-everything would collapse
users' trend charts to zeros. This is why the plan precomputes `firstAttemptPct`.

### `assets/js/engine-dk.js` — the writer

- Line 1748–1776 builds `answeredQuestions` with `id`, `topic`, `correct`,
  `firstAttemptCorrect`, `qText`, `userAnswerText`, `correctAnswerText`,
  `userAnswer`, `correctAnswer`.
- Line 1779–1798 builds the session with `id` (`sess-${mode}-${startedAt}`),
  `mode`, `correct`, `total`, `percent`, `startedAt`, `finishedAt`,
  `durationSec`, `topics`, `timed`, `timeUp`, `attemptLog`, `questions`.
- **Line 1801: `stats.history.push(session)` — no cap anywhere.** Unbounded
  growth confirmed at source.
- Line 1806: `CivicSync.push(["civicedge_stats","civicedge_progress"])` on
  session finish.

### Not relevant (checked and ruled out)

`results.js` and `attempt-store.js` are CIPLE-only (`exam_section_results`,
`ciple_attempt_v1` in sessionStorage). They have nothing to do with
`civicedge_stats`.

---

## 8. `sync.js` and the `sync` edge function — THE KEY ARCHITECTURAL FINDING

### Client (`assets/js/sync.js` v1.3)

- `SYNC_KEYS = [civicedge_stats, civicedge_progress, civicedge_saved,
  dk_active_phase, dk_phase2_unlocked, dk_phase1_progress]`
- `pushOne(key)` sends the **entire blob** for that key. Debounced 2 s.
- `mergeStats(local, remote)` = union of both arrays, deduped by `session.id`,
  sorted by `startedAt`, **never trimmed**.
- `mergeStats` returns `{ history: merged }` — **it silently discards
  `totalVisibleSec`**. That is why only 32 of 3,684 rows still have it: any user
  who syncs loses it. Probably unintentional; flag to Denis.
- `mergeProgress` unions per key with `Math.max` on counters.
- `mergeSaved` is last-write-wins on `_ts` (v1.3 fix, works correctly).

### Edge function `sync` (v43, `verify_jwt: false`)

**It performs a server-side merge on every push**, using the same union logic:

```ts
if (PROTECTED_KEYS.includes(key)) {
  const { data: existingRow } = await supabase.from("user_sync")
    .select("data").eq("email", …).eq("site", site).eq("key", key).single();
  if (existingRow?.data) finalData = serverMerge(key, data, existingRow.data);
}
```

`PROTECTED_KEYS = [civicedge_progress, civicedge_stats, civicedge_saved,
dk_phase1_progress, dk_phase2_unlocked]`.

**Two consequences, both decisive:**

1. **Good:** the server never accepts a shrink. A client pushing
   `{history: []}` gets unioned back to the full array. There is no code path
   where pushing bad data destroys good data. Both layers are additive.
2. **Bad for the plan:** a client-side trim is **impossible**. The server
   re-inflates every trimmed push. Patching `engine-dk.js` / `sync.js` /
   `history.js` / the dashboards alone would achieve **nothing** in the database.

**The edge function is the authority. The collapse must live in `serverMerge`.**

Silver lining: if the collapse lives there, every active user's row shrinks on
their next push automatically. **No bulk `UPDATE` migration is needed** — rows
self-heal. Dormant rows stay big and harmless.

### SECURITY — unauthenticated destructive endpoint (unrelated to this work)

```ts
if (action === "reset") {
  await supabase.from("user_sync").delete()
    .eq("email", email.toLowerCase()).eq("site", site);
}
```

No merge, no backup, no confirmation. The function is `verify_jwt: false` and
the publishable key is hardcoded in `sync.js`
(`sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp`).

**Anyone who knows a user's email address can wipe that user's sync data with
one HTTP request, with no login.** The same applies to `pull`, which returns a
user's full progress data to anyone with their email — a disclosure issue for EU
users, distinct from the loss issue.

This is the **largest total-loss vector in the system**, it is live now, and it
predates this work. Raised with Denis; **not yet actioned**. Note this is a
different risk class from the deliberate no-per-product-entitlement design
decision, because `reset` is destructive.

---

## 9. Sizing the fix — measured, not estimated

All measured on a fixed 120-row sample of `civicedge_stats`, comparing **raw
JSON text bytes** (the honest comparison; `pg_column_size` on a freshly built
in-memory jsonb returns uncompressed size and is not comparable to a stored
value — an earlier attempt produced nonsense "-313%" figures this way).

Current: **803 kB raw per user** average.

| variant | what survives | raw saved | bytes/user |
|---|---|---|---|
| **V1 — drop `questions`+`attemptLog` from all sessions** | every attempt's scalars; all counters; streak | **94.8%** | 41,745 |
| V2 — full detail newest 5, scalars for rest | + recent question-by-question review | 90.7% | 74,302 |
| V3 — scalars, newest 50 only | as V1 but truncated | 98.7% | ~10 kB |
| V4 — delete `history` entirely | nothing; no stats, no trend chart | 100% | 0 |
| V5 — full newest 5, scalars to 200, drop older | as V2, capped | 92.4% | 61,017 |

Also measured: stripping only the text fields (`qText`, `topic`,
`userAnswerText`, `correctAnswerText`) saves **33%** of raw bytes, *not* the 85%
initially assumed — the removable fields are ~165 of ~341 bytes per question,
and repeated text compresses extremely well (hence the 5.6× ratio), so it is
mostly an egress win rather than a disk win. **Capping/collapsing whole records
is the lever that moves disk.**

Cap-at-200 would affect 917 of 3,684 rows.

Note V2 costs *more* than V1 despite keeping fewer attempts in detail — five
full attempts outweigh thousands of summaries.

---

## 10. THE PLAN (agreed in principle, not yet written)

### Target shape for a collapsed (archived) session

```json
{ "id": "sess-topics-1780256649079", "mode": "topics",
  "correct": 21, "total": 25, "percent": 84,
  "startedAt": 1780256649079, "finishedAt": 1780257261079,
  "durationSec": 612, "topics": ["Historie","Demokrati"],
  "timed": true, "timeUp": false,
  "firstAttemptPct": 76 }
```

`questions` and `attemptLog` dropped. `firstAttemptPct` is **precomputed from
the data being discarded**, so the trend chart keeps working — and becomes more
accurate for old sessions than it is today.

Keep full detail for the **newest 10** sessions (dashboard needs 9; 1 margin).

Expected result: **472 MB → ~25 MB**; average user 918 kB → ~50 kB.

### Order of work — the edge function comes FIRST

1. **`sync` edge function v44** — apply the collapse inside `serverMerge`'s
   `mergeStats`, after the union. This is the load-bearing change; everything
   else is cosmetic without it.
   - **Hard invariant: never reduce the number of sessions.** If
     `merged.length < existing.length`, throw and write nothing. This makes
     "lost history" a class of bug that cannot reach the database.
   - Roll out behind a flag / one site first, watch, then widen.
   - **Denis's standing rule: never deploy edge functions without explicit
     approval.** Write the diff, do not deploy.
2. **`engine-dk.js`** (+ siblings) — compute `firstAttemptPct` at save time;
   collapse sessions beyond the newest 10 before `writeJsonLS`.
3. **`dashboard-v2*.js`** — in `computeTrendPointsFromFirstAttempts`, read
   `sess.firstAttemptPct` when `questions` is absent, **before** the
   topics-mode-returns-0 fallback.
4. **`sync.js` `mergeStats`** — same collapse after the union, so a stale device
   cannot reinflate locally.
5. **`history.js`** — guard the detail panel when `questions` is empty; show
   "detail not kept for older sessions" rather than an empty list.
6. **DB migration — probably unnecessary.** Active rows self-heal on next push.
   Only consider a migration for dormant rows, and only after the above has run
   for a while.

### Risk table

| risk | mitigation |
|---|---|
| Bad collapse drops sessions | Invariant check — refuse to write if count fell |
| Bad collapse corrupts a blob | Flag/one-site rollout, watch, widen |
| Wrong 10 kept | Sort by `startedAt` with fallback; only *detail* is lost, never the attempt record |
| Version skew across the two repos | Merge is additive — skew fails toward keeping too much, never too little |
| Quota write failure | Today's silent loss; the fix reduces it |

**`civicedge_progress` is not touched by this plan.** That is the per-question
mastery data. Only redundant text in the `civicedge_stats` session log is
trimmed. Even total failure of this work would not lose what a user has
mastered.

---

## 11. Open questions for Denis

1. **Approval to deploy `sync` v44** once the diff is reviewed (standing rule).
2. **Backup situation** — daily backups vs point-in-time recovery. The
   management API does not expose it; needs checking in the Supabase dashboard.
   Wanted before changing the function that owns this data.
3. **The `reset` endpoint** — harden it? It is the biggest total-loss vector and
   is independent of the storage work.
4. **`dk-pr` vs `dkpr`** — pick a canonical label, find where the second
   spelling is written, merge the split rows.
5. **`totalVisibleSec`** — is it wanted? `mergeStats` currently discards it.
6. **`civicedge_stats_pretrim_20260725`** — leftover from 25 July; safe to drop?
7. **Forward-only `id` in `civicedge_progress`** — schedule separately; it fixes
   the question-rewording orphan bug.

---

## 12. Reusable SQL

Per-user `localStorage` footprint estimate (compression ratios baked in):

```sql
with per_email as (
  select lower(email) as email,
    max(case when key='civicedge_stats' then pg_column_size(data) else 0 end)*5.62
  + max(case when key='civicedge_progress' then pg_column_size(data) else 0 end)*5.18
    as raw_bytes
  from user_sync where key in ('civicedge_stats','civicedge_progress')
  group by 1
)
select count(*) filter (where raw_bytes > 5*1024*1024) as over_quota,
       count(*) filter (where raw_bytes between 4*1024*1024 and 5*1024*1024) as near_quota,
       pg_size_pretty(avg(raw_bytes)::bigint) as avg_footprint
from per_email;
```

Bytes by session mode (run on the largest rows; full-table `::text` casts time out):

```sql
with samp as (
  select data from user_sync where key='civicedge_stats'
  order by pg_column_size(data) desc limit 60
), h as (select e.h from samp, jsonb_array_elements(samp.data->'history') e(h))
select coalesce(h->>'mode','(null)') as mode, count(*) as sessions,
  round(avg(octet_length(h::text))) as avg_bytes,
  round(avg(jsonb_array_length(h->'questions'))) as avg_questions,
  round(avg(coalesce(jsonb_array_length(h->'attemptLog'),0))) as avg_attemptlog
from h group by 1 order by 2 desc;
```

**Performance notes for the next session:** full-table `octet_length(data::text)`
aggregates time out (statement timeout). Use `pg_column_size` for stored size,
sample 60–250 rows for raw-size work, and avoid correlated subqueries joining
`user_sync` to `auth.users` — join on `lower(email)` via CTEs instead
(`user_sync` has no `user_id` column; its columns are
`email, site, key, data, updated_at`).
