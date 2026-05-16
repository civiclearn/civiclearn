/* CivicLearn — Help Card
   ─────────────────────────────────────────────────────────────
   A persistent, collapsible explainer card that lives inline in the
   page layout. First visit: expanded by default. After the user
   collapses it: they see a one-line strip on every subsequent visit,
   which can be re-expanded anytime by clicking. State is per-page
   and stored in localStorage.

   Usage on any page:
     1. Drop a placeholder somewhere in the page:
          <div data-help-card="topics"></div>
     2. Define the content for that key in this file's CONTENT map.
     3. Load this script after the DOM is parsed.

   Adding a new help card to another page = one HTML line + one
   entry in CONTENT below. No other changes.
*/
(function () {
  "use strict";

  // ── Per-page help content ──
  // Keep it tight: a title and 2–4 short paragraphs (or list items).
  // Talk about what the user DOES, what's surprising, and the rules of
  // the format. Skip anything they'd intuit on their own.
  const CONTENT = {
    topics: {
      icon: "💡",
      title: "Sådan fungerer Test efter emne",
      body: `
        <p>Vælg ét eller flere emner og start en øvelse på 10 spørgsmål
        ad gangen.</p>
        <p>Forkerte svar kommer tilbage i næste bølge — du fortsætter,
        indtil du har svaret rigtigt på alle 10. Sådan bygger du
        gradvist mestring op.</p>
        <p>Procenttallet på hvert emne afspejler din samlede fremgang
        — også fra <em>Officielle prøvespørgsmål</em>, <em>Hurtig test</em>
        og <em>Prøvesimulation</em>. Det er alt sammen samme materiale.</p>
        <p>Når et emne når 100 %, kan du øve det som genopfriskning uden
        at miste din fremgang.</p>
      `
    },

    simulation: {
      icon: "⏱️",
      title: "Sådan fungerer Prøvesimulation",
      body: `
        <p>Prøvesimulationen følger den officielle indfødsretsprøve
        nøjagtigt: <em>45 spørgsmål på 45 minutter</em>, og du skal
        have mindst <em>36 rigtige (80 %)</em> for at bestå.</p>
        <p>Sammensætningen afspejler den rigtige prøve: 35 spørgsmål
        fra læremidlerne, 5 om danske værdier, og 5 om aktuelle
        begivenheder.</p>
        <p>Pas på "danske værdier"-spørgsmålene: du skal have mindst
        <em>4 ud af 5 rigtige</em> her — ellers består du ikke, uanset
        hvor godt du klarer resten af prøven.</p>
        <p>Vi anbefaler at gemme simulationen til når du har øvet i
        nogle dage. Brug den som en parathedstest, ikke som første
        træning. Spørgsmål du svarer rigtigt på, tæller som mestret
        i alle andre testformater.</p>
      `
    },

    official: {
      icon: "📜",
      title: "Sådan fungerer Officielle prøvespørgsmål",
      body: `
        <p>Alle spørgsmål her stammer fra tidligere officielle
        indfødsretsprøver. <em>Cirka halvdelen af spørgsmålene i hver
        prøve kommer fra et lille sæt tilbagevendende emner</em> — du
        får langt mest ud af at mestre dem her først.</p>
        <p>Vi har udeladt spørgsmål om aktuelle begivenheder og
        spørgsmål, der ikke længere indgår i den officielle læreplan.</p>
        <p>Du øver 25 spørgsmål ad gangen. Spørgsmål du ikke har set
        endnu prioriteres først, derefter dem du har svaret forkert
        på. Spørgsmål du har mestret kommer kun igen, når alt andet
        er gennemgået.</p>
        <p>Vi anbefaler at starte din træning her. Spørgsmål du svarer
        rigtigt på, tæller som mestret i alle andre testformater.</p>
      `
    },

    quick: {
      icon: "⚡",
      title: "Sådan fungerer Hurtig test",
      body: `
        <p>Hurtig test er et tilfældigt udvalg af spørgsmål fra hele
        banken — ingen tidsbegrænsning, ingen særlig sammensætning.
        En god måde at få lidt øvelse ind på farten.</p>
        <p>Spørgsmål du svarer rigtigt på, tæller som mestret i alle
        andre testformater.</p>
      `
    },

    traps: {
      icon: "🎯",
      title: "Sådan fungerer Typiske fælder",
      body: `
        <p><em>Mine fælder</em> samler de spørgsmål, du gentagne gange
        har svaret forkert på — dine personlige svage punkter. Listen
        vokser efterhånden, som du øver.</p>
        <p><em>100 sværeste</em> er en kurateret liste over de spørgsmål,
        andre brugere oftest fejler. De er gode at have set mindst én
        gang før prøvedagen.</p>
        <p>Skift mellem fanerne for at øve hver liste. Spørgsmål du
        svarer rigtigt på, tæller som mestret i alle andre testformater.</p>
      `
    },

    flashcards: {
      icon: "🃏",
      title: "Sådan fungerer Flashcards",
      body: `
        <p>Flashcards er fri øvelse uden pres. Vælg ét eller flere
        emner og klik Start. Klik <em>Vend</em> for at se det rigtige
        svar. Klik <em>Forstået</em> for at fjerne kortet fra dyngen,
        eller <em>Gense</em> for at lægge det bagerst og se det igen
        senere.</p>
        <p>Slå <em>Fokuser på svage emner</em> til, hvis du kun vil
        øve emner, du endnu ikke har mestret 100 %.</p>
        <p>Bemærk: Flashcards påvirker ikke din fremgang i de andre
        testformater. Brug det til at opfriske eller bygge selvtillid
        uden risiko.</p>
      `
    }

    // Future: add more entries here for other pages. Examples:
    //   official:    { icon: "📜", title: "...", body: "..." }
    //   simulation:  { icon: "⏱️", title: "...", body: "..." }
    //   quick:       { icon: "⚡", title: "...", body: "..." }
    //   traps:       { icon: "🎯", title: "...", body: "..." }
  };

  // ── Persistence ──
  function storageKey(helpKey) {
    return `indfodsret:help:${helpKey}:collapsed`;
  }

  function isCollapsed(helpKey) {
    try {
      return localStorage.getItem(storageKey(helpKey)) === "true";
    } catch (_) {
      return false;
    }
  }

  function setCollapsed(helpKey, collapsed) {
    try {
      localStorage.setItem(storageKey(helpKey), collapsed ? "true" : "false");
    } catch (_) {}
  }

  // ── Rendering ──
  function buildCard(helpKey, content) {
    const card = document.createElement("div");
    card.className = "help-card";
    card.setAttribute("data-help-key", helpKey);

    // Header (always visible — the collapsed strip IS this header)
    const header = document.createElement("button");
    header.type = "button";
    header.className = "help-card-header";
    header.setAttribute("aria-expanded", "true");
    header.innerHTML = `
      <span class="help-card-icon">${content.icon || "💡"}</span>
      <span class="help-card-title">${content.title}</span>
      <span class="help-card-chevron" aria-hidden="true">⌃</span>
    `;

    // Body (the expandable part)
    const body = document.createElement("div");
    body.className = "help-card-body";
    body.innerHTML = content.body;

    card.appendChild(header);
    card.appendChild(body);

    // Apply initial state from localStorage
    if (isCollapsed(helpKey)) {
      card.classList.add("collapsed");
      header.setAttribute("aria-expanded", "false");
    } else {
      // First visit / explicitly open: subtle one-shot pulse on the
      // chevron after a brief delay, so users notice they can collapse.
      // Animation runs once via CSS keyframes; no JS state to clear.
      setTimeout(() => card.classList.add("hint-pulse"), 900);
    }

    // Toggle handler
    header.addEventListener("click", () => {
      const wasCollapsed = card.classList.contains("collapsed");
      card.classList.toggle("collapsed");
      header.setAttribute("aria-expanded", String(wasCollapsed));
      setCollapsed(helpKey, !wasCollapsed);

      // Once they've interacted, kill the pulse permanently for this session
      card.classList.remove("hint-pulse");
    });

    return card;
  }

  // ── Initialization ──
  function init() {
    const placeholders = document.querySelectorAll("[data-help-card]");
    placeholders.forEach((placeholder) => {
      const helpKey = placeholder.getAttribute("data-help-card");
      const content = CONTENT[helpKey];
      if (!content) {
        console.warn(`[HelpCard] No content defined for key: ${helpKey}`);
        return;
      }
      const card = buildCard(helpKey, content);
      placeholder.replaceWith(card);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
