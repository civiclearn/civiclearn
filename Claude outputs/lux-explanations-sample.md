# Lux explanations — format proposal + sample for sign-off

Prepared 15 September 2026. Nothing has been written to the repo yet.

---

## 1. Proposed format

**A separate file, not a field inside `questions.json`.**

`banks/lux/explanations-lu.json`:

```json
{
  "version": 1,
  "microtopics": {
    "Judiciary": { "fr": "…", "en": "…", "de": "" },
    "Limits of rights": { "fr": "…", "en": "…", "de": "" }
  },
  "questions": {
    "LUX_00513": { "fr": "…", "en": "…", "de": "" }
  },
  "qMicrotopic": { "LUX_00001": "Origins", "LUX_00002": "Origins" }
}
```

Why a separate file rather than `"explanation"` inside each question:

- `questions.json` stays at 825 KB and is never rewritten, so there is no risk of
  a bulk edit disturbing the bank while corrections are in flight.
- It answers the `sequential-lu.json` question for free. Lookup is by `id` first,
  then by microtopic via the `qMicrotopic` index — both files have ids, so
  `sequential-lu.json` needs **no change at all**.
- German can be filled in later by writing into the same keys; the UI can hide the
  card when the string for the active language is empty.
- Keyed on `microtopic.en`, which is already what progress keys use, so nothing
  about it can reset anyone's progress.

**Lookup order for the card:** `questions[id][lang]` → `microtopics[qMicrotopic[id]][lang]` → no card.

**Length:** microtopic explainers 2–4 sentences; per-question trap cards 1–3 sentences.
Both sized to sit under a question on a phone without scrolling.

---

## 2. The trap list is real, not an estimate

The traps page computes traps per user from `localStorage`, so there was no global
list — but progress blobs sync to Supabase, and the Lux bank is covered there:

- **370 users, 207,378 question-level records, all 718 questions present**
- 632,715 recorded answers, 95,351 of them wrong — a 15.1 % overall miss rate

Ranking by miss rate (minimum 150 answers) gives a solid top 50, from 55.3 % down to 31.8 %.
The worst ten:

| # | id | miss | question (EN) |
|---|---|---:|---|
| 1 | LUX_00513 | 55.3 % | Are the administrative courts part of the judicial order? |
| 2 | LUX_00123 | 49.3 % | Which treaty strengthened free movement and citizens' rights? |
| 3 | LUX_00134 | 48.4 % | In which year was the UDHR proclaimed? |
| 4 | LUX_00138 | 48.0 % | In which year was the ECHR adopted? |
| 5 | LUX_00522 | 45.8 % | Which court ensures consistency of administrative case law? |
| 6 | LUX_00602 | 44.0 % | Can an alderman be regarded as a municipal civil servant? |
| 7 | LUX_00121 | 43.0 % | Which 1997 treaty strengthened the European Parliament? |
| 8 | LUX_00030 | 43.0 % | In which year was the County elevated to a duchy? |
| 9 | LUX_00021 | 43.0 % | Which Netherlands did Luxembourg belong to in the 18th c.? |
| 10 | LUX_00512 | 42.8 % | Which administrative court rules on appeal? |

The 50 are not scattered. They cluster into six families, which is good news for
the writing — one well-made distinction serves six or eight questions at once:

1. **EU treaties** (Rome / Maastricht / Amsterdam / Lisbon) — 6 questions
2. **Dates of rights texts** (1789 / 1948 / 1951 / 2000) — 4 questions
3. **Council of Europe vs European Union** — 4 questions
4. **Judicial order vs administrative order** — 6 questions
5. **Municipal bodies** (council vs board of mayor and aldermen) — 4 questions
6. **Spanish vs Austrian Netherlands** — 2 questions

---

## 3. Sample microtopic explainer — *Juridictions / Judiciary* (98 questions)

**FR**

> Le Luxembourg a deux ordres de juridictions distincts, sans lien hiérarchique
> entre eux. L'ordre judiciaire — justices de paix, tribunaux d'arrondissement,
> Cour supérieure de justice — tranche les litiges entre particuliers et les
> affaires pénales ; les juridictions du travail et de la sécurité sociale en font
> également partie. L'ordre administratif — tribunal administratif en première
> instance, Cour administrative en appel — juge les litiges entre les citoyens et
> l'administration, et contrôle la légalité, non l'opportunité, des décisions.
> La Cour constitutionnelle relève du pouvoir judiciaire mais n'appartient à aucun
> des deux ordres : elle contrôle la conformité des lois à la Constitution,
> uniquement lorsqu'une juridiction lui renvoie la question.

**EN**

> Luxembourg has two separate court orders, with no hierarchy between them. The
> judicial order — justices of the peace, district courts, Superior Court of
> Justice — settles disputes between private parties and criminal matters; the
> labour and social security courts belong to it too. The administrative order —
> Administrative Tribunal at first instance, Administrative Court on appeal —
> settles disputes between citizens and the administration, and reviews the
> legality of decisions, not their expediency. The Constitutional Court belongs to
> the judicial power but to neither order: it reviews the conformity of laws with
> the Constitution, and only when a court refers the question to it.

---

## 4. Sample trap cards

### LUX_00513 — *Are the administrative courts part of the judicial order?* → No (55.3 % miss)

**FR**

> Non. Les juridictions administratives forment un ordre à part : tribunal
> administratif, puis Cour administrative en appel. L'ordre judiciaire, lui, se
> compose des justices de paix, des tribunaux d'arrondissement et de la Cour
> supérieure de justice. Les deux ordres sont indépendants, aucun n'est supérieur
> à l'autre.

**EN**

> No. The administrative courts form an order of their own: the Administrative
> Tribunal, then the Administrative Court on appeal. The judicial order is made up
> of the justices of the peace, the district courts and the Superior Court of
> Justice. The two orders are independent; neither is above the other.

### LUX_00138 — *In which year was the ECHR adopted?* → 1951 (48.0 % miss)

The standing rule (1951, matching the bank and the official *matières*) is kept.
The card teaches the distinction that is actually being missed — learners are
answering 1948 — without touching the signature year.

**FR**

> 1951. À ne pas confondre avec 1948, la Déclaration universelle des droits de
> l'homme, qui est un texte des Nations unies. La Convention européenne des droits
> de l'homme relève du Conseil de l'Europe, et c'est elle qui a créé la Cour
> européenne des droits de l'homme à Strasbourg.

**EN**

> 1951. Not to be confused with 1948, the Universal Declaration of Human Rights,
> which is a United Nations text. The European Convention on Human Rights belongs
> to the Council of Europe, and it is the Convention that created the European
> Court of Human Rights in Strasbourg.

---

## 5. Three things to decide or note

1. **The lesson scripts are not on disk.** Neither `civiclearn` nor `luxembourg`
   contains `ve-quiz-tracker.md` or the 24 lesson scripts — the handover calls them
   the single best source. The samples above were written from the bank itself
   (which is the stricter test: every sentence has to be consistent with all 98
   Judiciary questions). If you can drop the tracker and scripts into the lux
   folder, the remaining 20 microtopics will match the course's phrasing exactly.

2. **LUX_00415 sits at 39.9 % miss, and the bank answer is the wrong one.** It is
   trap #20 and it is also pending correction #1 (15 → 12 years). Part of that miss
   rate is the question, not the learners. Worth fixing before, not after, its
   explanation is written.

3. **A terminology split inside the options.** LUX_00660/00661 say "Supreme Court
   of Justice" where the other 96 Judiciary questions say "Superior Court of
   Justice" (FR is "Cour supérieure de Justice" in both — only the EN differs).
   Not part of the label fixes you set aside; flagging it because the explanations
   have to pick one and I have used "Superior".

---

## 6. If the sample is approved

Blocks, signed off one at a time, mirroring the audio-course method:

| Block | Content | Texts |
|---|---|---:|
| A | Rights microtopics (4) | 8 |
| B | History microtopics (7) | 14 |
| C | Institutions microtopics (10) | 20 |
| D | Trap cards, families 1–3 (EU treaties, dates, CoE vs EU) | 28 |
| E | Trap cards, families 4–6 + singles | 72 |
| — | Bank corrections LUX_00415 / 00557 / 00579 | — |
| **Total** | | **142 texts** |

Note this is 21 microtopics, not the 26 the handover states — five of the 26 are
duplicate French spellings of the same microtopic (including a curly-vs-straight
apostrophe in "De l'industrialisation à 1945", which splits 60 questions into 45 + 15).
All duplicate pairs share the same `microtopic.en`, so they collapse correctly here
and, separately, renaming their display labels later cannot reset anyone's progress.
