/* ────────────────────────────────────────────────────────
   CivicLearn My List — Slovensko
   Adapted from shared my-list.js. i18n removed, Slovak
   strings inlined, otazok plural forms correct.
   ──────────────────────────────────────────────────────── */

(function () {
  // Safety
  if (!window.CivicEdgeEngine) {
    console.error("CivicEdgeEngine not found");
    return;
  }

  const listEl = document.getElementById("myList");
  if (!listEl) {
    console.error("#myList container not found");
    return;
  }

  const MY_LIST_RENDER_LIMIT = 25;
  let myListPage = 0;

  // Slovak plural helper: 1 otázka, 2–4 otázky, 5+ otázok
  function pluralOtazok(n) {
    if (n === 1) return "1 otázka";
    if (n >= 2 && n <= 4) return n + " otázky";
    return n + " otázok";
  }

  // -------- helpers --------

  function clear() {
    listEl.innerHTML = "";
  }

  function emptyState() {
    const div = document.createElement("div");
    div.className = "muted";
    div.style.padding = "1rem";
    div.textContent = "Váš zoznam je prázdny";
    listEl.appendChild(div);
  }

  function renderItem(q) {
    const card = document.createElement("div");
    card.className = "mylist-card";

    /* Header row: question + badge + remove */
    const header = document.createElement("div");
    header.className = "mylist-question-row";

    const lang = window.CIVICEDGE_LANG || "sk";

    /* Question */
    const title = document.createElement("div");
    title.className = "mylist-question";
    title.textContent = q.text || (
      q._raw && (q._raw.q?.[lang] || q._raw.q?.en)
    ) || "";

    /* Microtopic badge */
    const badge = document.createElement("div");
    badge.className = "mylist-badge";
    badge.textContent =
      q.topicDisplay ||
      (q._raw?.microtopic?.[lang] || q._raw?.microtopic?.en) ||
      q.topicLabel ||
      "";

    /* Remove button */
    const actions = document.createElement("div");
    actions.className = "mylist-actions";

    const removeBtn = document.createElement("button");
    removeBtn.className = "mylist-remove";
    removeBtn.textContent = "Odstrániť";
    removeBtn.setAttribute("aria-label", "Odstrániť zo zoznamu");
    removeBtn.onclick = () => {
      CivicEdgeEngine.toggleSavedQuestion(q.id);
      // Push the updated saved list to Supabase so removals persist across devices
      if (window.CivicSync) CivicSync.pushNow("civicedge_saved");
      render();
    };

    actions.appendChild(removeBtn);

    header.appendChild(title);
    header.appendChild(badge);
    header.appendChild(actions);

    card.appendChild(header);

    /* Answers */
    const optionsWrap = document.createElement("div");
    optionsWrap.className = "mylist-options";

    let locked = false;

    const resolvedOptions =
      q.options && q.options.length
        ? q.options
        : (() => {
            const rawOpts = q._raw?.options?.[lang] || q._raw?.options?.en || [];
            const correctIndex = q._raw?.correctIndex ?? 0;

            return rawOpts.map((text, i) => ({
              text,
              correct: i === correctIndex
            }));
          })();

    // Shuffle regardless of which branch was taken
    for (let i = resolvedOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [resolvedOptions[i], resolvedOptions[j]] = [resolvedOptions[j], resolvedOptions[i]];
    }

    resolvedOptions.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "mylist-option";
      btn.textContent = opt.text;

      btn.addEventListener("click", () => {
        if (locked) return;
        locked = true;

        // mark clicked option
        if (opt.correct) {
          btn.classList.add("correct");
        } else {
          btn.classList.add("wrong");
          // also highlight correct one
          [...optionsWrap.children].forEach(b => {
            const o = resolvedOptions.find(x => x.text === b.textContent);
            if (o && o.correct) b.classList.add("correct");
          });
        }

        // lock all buttons
        [...optionsWrap.children].forEach(b => b.disabled = true);
      });

      optionsWrap.appendChild(btn);
    });

    card.appendChild(optionsWrap);

    return card;
  }

  function updateCount(n) {
    const el = document.getElementById("myListCount");
    if (!el) return;

    if (!n) {
      el.textContent = "";
      return;
    }

    el.textContent = pluralOtazok(n);
  }

  // -------- main render --------

  function render() {
    clear();

    const ids = CivicEdgeEngine.getSavedQuestionIds();
    const maxPage = Math.max(0, Math.ceil(ids.length / MY_LIST_RENDER_LIMIT) - 1);

    if (myListPage < 0) {
      myListPage = 0;
    } else if (myListPage > maxPage) {
      myListPage = maxPage;
    }

    // bank is already loaded by dashboard pages
    const bank = CivicEdgeEngine.getBank?.() || [];
    const map = new Map(bank.map((q) => [q.id, q]));

    let rendered = 0;

    const start = myListPage * MY_LIST_RENDER_LIMIT;
    const end = start + MY_LIST_RENDER_LIMIT;

    ids.slice(start, end).forEach((id) => {
      const q =
        map.get(id) ||
        map.get(String(id)) ||
        [...map.values()].find(x => String(x.id) === String(id));
      if (q) {
        listEl.appendChild(renderItem(q));
        rendered++;
      }
    });

    updateCount(ids.length);

    if (!ids.length) {
      emptyState();
    }

    if (ids.length > MY_LIST_RENDER_LIMIT) {
      const footer = document.createElement("div");
      footer.className = "mylist-footer";

      const startNum = start + 1;
      const endNum = Math.min(end, ids.length);

      const status = document.createElement("div");
      status.className = "mylist-status";
      status.textContent = `Zobrazujem ${startNum}–${endNum} z ${ids.length} uložených otázok`;

      const controls = document.createElement("div");
      controls.className = "mylist-controls";

      const prevBtn = document.createElement("button");
      prevBtn.className = "mylist-page-btn";
      prevBtn.textContent = "Predchádzajúce";
      prevBtn.disabled = myListPage === 0;
      prevBtn.onclick = () => {
        if (myListPage > 0) {
          myListPage--;
          render();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      };

      const nextBtn = document.createElement("button");
      nextBtn.className = "mylist-page-btn";
      nextBtn.textContent = "Nasledujúce";
      nextBtn.disabled = end >= ids.length;
      nextBtn.onclick = () => {
        myListPage++;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };

      controls.appendChild(prevBtn);
      controls.appendChild(nextBtn);

      footer.appendChild(status);
      footer.appendChild(controls);

      listEl.appendChild(footer);
    }
  }

  // -------- init --------

  (async () => {
    await CivicEdgeEngine.ensureBankLoaded();
    render();
  })();

})();
