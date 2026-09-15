# Lux explanations tracker

**Product:** CivicLearn Luxembourg (Vivre-Ensemble), `civiclearn.com/lux/dashboard`
**File produced:** `banks/lux/explanations-lu.json`
**Opened:** 15 September 2026

---

## Status

| | FR | EN | DE |
|---|---|---|---|
| Microtopic explainers (21) | ✅ 21 | ✅ 21 | ⬜ 0 |
| Trap cards (50) | ✅ 50 | ✅ 50 | ⬜ 0 |

**Coverage:** 718 / 718 questions resolve to a card (50 own, 668 by microtopic fallback).
`sequential-lu.json` resolves through the same file and needed no change.

**Bank corrections:** all applied 15 Sep 2026 — see §4.

---

## 1. The file

`banks/lux/explanations-lu.json`, CRLF, ~90 KB.

```
{
  "version": 1,
  "microtopics": { "<microtopic.en>": { "fr": "…", "en": "…", "de": "" } },
  "questions":   { "<id>":           { "fr": "…", "en": "…", "de": "" } },
  "qMicrotopic": { "<id>": "<microtopic.en>" }
}
```

**Lookup order for the "Bon à savoir" card:**
`questions[id][lang]` → `microtopics[qMicrotopic[id]][lang]` → no card.

An empty string means "not written yet" — the card should be hidden, not rendered blank.
That is currently the case for every `de` value.

**Why a separate file:** `questions.json` and `sequential-lu.json` stay untouched;
both are keyed by `id`, so the same file serves both. Keys use `microtopic.en`,
which is also what progress keys use, so nothing here can affect stored progress.

---

## 2. Conventions

- Microtopic explainers: 2–5 sentences, longer for the large microtopics
  (65–217 words FR, average 136). Written to be consistent with **every** question
  in that microtopic, since the card appears under all of them.
- Trap cards: 1–3 sentences (24–54 words FR, average 35). Each one names the
  distinctions the wrong answers are actually testing.
- Source of truth is the **question bank**, not the audio course. The course is a
  bonus product; explanations must never contradict the bank.
- Standing editorial rules kept: ECHR = **1951** (LUX_00138, matches the official
  *matières*) — not to be "corrected"; no claims about what residents or most
  people know or think; no generic study advice.

---

## 3. What is written

### Microtopic explainers — 21

**History (7):** Origins · From County to Duchy · From Duchy to Grand Duchy ·
From Independence to Neutrality · From Industrialization to 1945 ·
From 1945 to the Present · European Integration

**Institutions (10):** The State · The Grand Duke · Chamber of Deputies ·
Government · Council of State · Elections · Political parties · Municipalities ·
Consultative bodies · Judiciary

**Rights (4):** Concept and Sources · Constitution of Luxembourg ·
Limits of rights · Protection of rights

> Note: the handover said 26 microtopics. There are 21 distinct `microtopic.en`
> values; five of the 26 are duplicate FR spellings (including a curly-vs-straight
> apostrophe in "De l'industrialisation à 1945", splitting 60 questions into 45 + 15).
> All duplicate pairs share the same `.en`, so renaming their FR/DE display labels
> later is safe and cannot reset progress. Not done in this pass, by decision.

### Trap cards — 50

Ranked from real data, not estimate: progress blobs sync to Supabase `user_sync`
(`key='civicedge_progress'`, entry keys filtered on `:LUX_`) — 370 users,
207,378 records, 632,715 answers, all 718 questions present, 15.1 % overall miss rate.

Query to reproduce the ranking:

```sql
with p as (
  select substring(e.k from 'LUX_[0-9]+') as qid,
         coalesce((e.v->>'wrongs')::int,0) w, coalesce((e.v->>'rights')::int,0) r
  from public.user_sync us, lateral jsonb_each(us.data) as e(k,v)
  where us.key='civicedge_progress' and e.k like '%:LUX\_%' and jsonb_typeof(e.v)='object'
), agg as (select qid, sum(w) w, sum(r) r, sum(w)+sum(r) n from p group by qid)
select qid, w, n, round(100.0*w/n,1) wrong_pct from agg where n >= 150
order by 100.0*w/n desc limit 60;
```

Do **not** filter on `site='lu'` — those rows also contain other products' progress.

The 50 cluster into six families, and the cards are written as families so the
distinctions stay consistent:

| Family | Questions |
|---|---|
| EU treaties (Rome / Maastricht / Amsterdam / Lisbon) | 00112, 00113, 00121, 00123, 00125, 00127 |
| Dates of the rights texts (1789 / 1948 / 1951 / 2000 / 1848) | 00131, 00132, 00134, 00138, 00140, 00142 |
| Council of Europe vs European Union | 00101, 00102, 00116, 00137, 00146, 00191 |
| Judicial order vs administrative order | 00462, 00482, 00493, 00497, 00512, 00513, 00517, 00522 |
| Municipal bodies | 00575, 00576, 00600, 00602 |
| Spanish vs Austrian Netherlands | 00020, 00021 |
| History singles | 00022, 00030, 00070, 00669, 00693, 00713, 00714 |
| Institutions singles | 00148, 00256, 00296, 00330, 00381, 00415, 00429, 00437, 00550, 00568, 00638 |

---

## 4. Bank corrections applied 15 September 2026

All three pending corrections were **already present in `questions.json`** and were
missing only from `sequential-lu.json`, which had not been updated since June.
Fixed there:

- **LUX_00415** — Council of State term 15 → **12 years**. "Non-renewable" not added.
- **LUX_00557** — communal-vote condition: legal-residence period → **registration
  on the electoral roll** (law of 22 July 2022 abolished the residence clause).
- **LUX_00579** — alderman appointment → **cities = the Grand Duke, other communes =
  the Minister of the Interior**. The fourth option in that question was
  "Le ministre de l'Intérieur", which would have overlapped the new correct answer,
  so it was replaced with "Le Conseil d'État" to match `questions.json`.

Terminology uniformity, in `questions.json`:

- **LUX_00660 / LUX_00661** — EN "Supreme Court of Justice" → **"Superior Court of
  Justice"**, FR "Cour supérieure de Justice" → **"Cour supérieure de justice"**,
  matching the other 96 Judiciary questions. German already used
  "Oberste(r) Gerichtshof" consistently and was left alone.

Both files verified after patching: JSON parses, question counts unchanged
(718 and 644), and only the intended ids differ.

---

## 5. Still open

1. **German (63 texts: 21 microtopics + 50 traps, minus none).** No source exists in
   the product's voice — the audio course is FR/EN only. To be written against the
   official *matières* PDF and `reference-de.html`. Slots are already in the file.
2. **The UI card.** The field now exists; the "Bon à savoir" card under each answered
   question still has to be built into the quiz pages, honouring the lookup order
   and the hide-when-empty rule.
3. **Label duplicates** (21 vs 26 microtopics, "Droits fondamentaux" vs "Droits" on
   LUX_00645–00656). Deliberately left for a later pass. Safe to do — verified that
   all pairs share `microtopic.en`.
4. **Refresh the trap ranking** after the explanations ship, to see whether the
   cards move the miss rates. LUX_00415 in particular should fall now that the
   `sequential-lu.json` answer is correct.
