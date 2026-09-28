# HANDOVER — "The Hardest Citizenship Test Questions in the World"

Insights article + interactive quiz for civiclearn.com/insights. Started 28 Sep 2026 in a Fable chat; continue here.

## What Denis wants

A challenge page for true érudits: the hardest / most interesting questions from CivicLearn's own question banks across all countries, as one interactive "test your knowledge" quiz. Goal: get indexed for "hardest citizenship test questions", earn inbound links to civiclearn.com (inbound links are the gap he has named in CivicLearn marketing).

Title agreed: **The Hardest Citizenship Test Questions in the World**.

## Decisions already taken

- Where real answer data exists, rank by actual failure rate. Where it doesn't, hand-pick the hardest/most interesting — "it doesn't matter which countries have more users". Label which is which.
- Work in **two rounds**: (1) a shortlist document for Denis to veto, (2) then build the page. Do NOT build the page before he has struck the badly-worded ones — the data can't distinguish "obscure" from "poorly phrased".
- Default scope unless he says otherwise: **all 16 banks**, Denmark-PR folded into Denmark.
- Quiz is in English; non-English questions get a careful translation with the original shown underneath.
- Show the real failure rate after answering where known ("56% of candidates got this wrong").
- End with score + country difficulty ranking + shareable result. List it in insights.json like the other articles.

## Standing rules that apply (from Denis)

- Never imply CivicLearn offers the real exam questions — these are CivicLearn's own bank questions. Never cite an exact bank size; use "700+" style rounding.
- He deploys via GitHub Desktop only. Don't give git/terminal commands. Write files into the repo on his computer; he commits.
- He wants plain-language numbered steps, and Claude doing the steps itself where possible.

## Where things are

Repo on his computer: `C:\Users\webas\Documents\GitHub\civiclearn` (request folder access; use the device shell). Insights lives in `insights/`:
- `insights/insights.json` — article registry. Fields: slug, title, subtitle, category, type (cornerstone | deep-dive | interactive), date "YYYY-MM", dateLabel, readTime, badge, excerpt, featured.
- `insights/world-citizenship-quiz.html` — existing interactive quiz (Feb 2026, 15 questions, 8 countries, hand-picked, purple #7c3aed brand, Lexend font). **Clone its structure and quiz JS for the new page** — same header/footer/CSS variables. The new page must be clearly bigger and different: data-driven, more countries, failure rates, ranking.
- Other Insights pages (for tone): `dna-of-a-citizen.html`, `denmark-failure-rate.html`.
- `insights/index.html` + `insights.js` render the list from insights.json.

## Question banks (16, ~15,000 questions)

| Product | File in repo | Language(s) | Answer data? |
|---|---|---|---|
| Australia | australia/banks/australia/questions.json (665) | en | no |
| Austria | austria/banks/austria/questions.json (1012) | de | no |
| Canada (FR) | canadafr/banks/canada-fr/questions.json (500) | fr | no |
| Spain CCSE | ccse/banks/ccse/questions.json (300) | es | no |
| Cyprus | cyprus/banks/questions.json (714) | el + others (object per question) | no |
| Denmark citizenship | indfodsret/banks/questions.json (3176) — fields id, topic, subtopic, source, depth, q, options[{t,correct}] | da | **yes, site 'dk'** |
| Denmark PR | medborgerskab/banks/questions.json (835) | da+en | yes, sites 'dkpr' and 'dk-pr' |
| Switzerland/Geneva | geneva/banks/geneva/questions.json (951) | fr | yes, site 'ch' (61 users) |
| Finland | kansalaisuuskoe/banks/questions.json (800) | fi+sv | no |
| Lithuania | lt/banks/lt/questions.json (400) | lt+en | no |
| Luxembourg | lux/banks/lux/questions.json (718) | fr (+de/en?) | yes, site 'lu' (375 users) |
| Portugal | portugal/banks/questions.json (800) | pt+en | no |
| Romania | romania/banks/romania/questions.json (710) | ro | no |
| Slovakia | slovensko/data/questions.json (800) | sk | no |
| Sweden | sweden/banks/questions.json (1015) — id/topic/microtopic/q{sv,en}/options/correctIndex/explanation | sv+en | yes, site 'se' (46 users) |
| UK | uk/banks/uk/questions.json (1341) | en | no |
| France | not found under *question*.json — check `france/` folder | fr | yes, site 'fr-cr' (39 users) |

`denmark/` and `denmark-pr/` folders are obsolete — don't use them; current DK products are `indfodsret/` and `medborgerskab/`.

## Answer data (Supabase project htgliokekeaovdiafrgs)

Table `user_sync`, key `civicedge_progress`, one row per user per site; `data` is a JSON object keyed `"Topic:Question text"` with `rights`, `wrongs`, `attempts`. Rows are large (~275 KB avg for dk) — always aggregate in SQL, never pull rows.

Query that works (Denmark, min 400 attempts):

```sql
with q as (
  select e.key qk, (e.value->>'rights')::int r, (e.value->>'wrongs')::int w
  from user_sync u, jsonb_each(u.data) e
  where u.site='dk' and u.key='civicedge_progress' and jsonb_typeof(u.data)='object'
)
select qk, sum(r) rights, sum(w) wrongs, count(*) users,
       round(100.0*sum(w)/nullif(sum(r)+sum(w),0),1) wrong_pct
from q group by qk having sum(r)+sum(w) >= 400
order by wrong_pct desc limit 40;
```

Run the same for sites `dkpr` + `dk-pr` (union them), `lu`, `ch`, `se`, `fr-cr` — lower the threshold (e.g. 40–100) for the small sites and treat those as indicative only.

Denmark top results already seen (all ~52–58% wrong): kvinder valgret til sogne- og byråd (56.5%, 658 users); Grønland forlod EF (55.3%); svenskerne 1658 mod København (55.2%); Færøerne hjemmestyre (54.6%); Nobelprisen i kemi 1997 = Skou (54.1%); Christian 3.'s Bibel (52.7%); homoseksualitet fjernet fra sygdomsliste (52.7%); lige arveret til tronen (52.5%); hvilken myndighed efterforsker strafbare forhold (51.9%); blodigste slag juli 1850 (51.8%). Note the #1 by rate ("flertalsregeringen siden 2022", 58.8%) has only 74 users — flag as thin.

Question text in user_sync keys matches the `q` field in the bank, so join on that to recover options/correct answer.

## Round 1 deliverable — the shortlist

One document (markdown is fine, written to `civiclearn/Claude outputs/` and sent to him): per country, 6–8 candidates, each with: original text, English rendering, options, correct answer, failure rate + user count if known, and a one-line "why it's hard" (obscure date / trick wording / counter-intuitive fact). Mark data-driven vs hand-picked. Ask him to strike and approve. Also ask: any country to drop, and whether the France bank is usable.

## Round 2 — the page

- `insights/hardest-citizenship-questions.html` cloned from `world-citizenship-quiz.html`; ~40 questions, grouped or shuffled by country; per-question reveal with failure rate where known; final score, "harder than X% of candidates" only where data supports it; country difficulty ranking table; share buttons.
- Add entry to `insights.json` (type "interactive", featured true probably — ask).
- Sitemap: check how civiclearn.com/sitemap.xml is maintained (`sitemap.xml` at repo root) and add the URL.
- Each country section links to that product's CivicLearn page (the link-back is half the point).

## Related recent work (same day, done, for context only)

Six free printable Danish crosswords (Krydsord) were built and deployed on indfodsretsprove.dk/krydsord/ with an article and homepage block; generator pipeline zipped in `indfodsretsprove/Claude outputs/krydsord-pipeline.zip`. Not part of this task.
