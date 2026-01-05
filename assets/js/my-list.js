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

  // -------- helpers --------

  function clear() {
    listEl.innerHTML = "";
  }

function emptyState() {
  const div = document.createElement("div");
  div.className = "muted";
  div.style.padding = "1rem";
  div.textContent = CivicLearnI18n.t(
    "my_list_empty",
    "Your list is empty"
  );
  listEl.appendChild(div);
}


function renderItem(q) {
  const card = document.createElement("div");
  card.className = "mylist-card";

/* Header row: question + badge + remove */
const header = document.createElement("div");
header.className = "mylist-question-row";

/* Question */
const title = document.createElement("div");
title.className = "mylist-question";
title.textContent = q.text || (
  q._raw && (q._raw.q?.[window.CIVICEDGE_LANG] || q._raw.q?.en)
) || "";

/* Microtopic badge */
const badge = document.createElement("div");
badge.className = "mylist-badge";
badge.textContent =
  q.topicDisplay ||
  (q._raw?.microtopic?.[window.CIVICEDGE_LANG] || q._raw?.microtopic?.en) ||
  q.topicLabel ||
  "";

/* Remove button */
const actions = document.createElement("div");
actions.className = "mylist-actions";

const removeBtn = document.createElement("button");
removeBtn.className = "mylist-remove";
removeBtn.textContent = CivicLearnI18n.t("my_list_remove", "Remove");
removeBtn.onclick = () => {
  CivicEdgeEngine.toggleSavedQuestion(q.id);
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
        const lang = window.CIVICEDGE_LANG || "en";
        const rawOpts = q._raw?.options?.[lang] || q._raw?.options?.en || [];
        const correctIndex = Number.isFinite(q._raw?.correctIndex)
          ? q._raw.correctIndex
          : 0;

        return rawOpts.map((text, i) => ({
          text,
          correct: i === correctIndex
        }));
      })();

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

  const label = n === 1
    ? CivicLearnI18n.t("my_list_count_one", "1 question")
    : CivicLearnI18n.t("my_list_count_many", "{n} questions").replace("{n}", n);

  el.textContent = label;
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
  const q = map.get(id);
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
  status.textContent = CivicLearnI18n.t(
    "my_list_showing_range",
    "Showing {from}–{to} of {total} saved questions"
  )
    .replace("{from}", startNum)
    .replace("{to}", endNum)
    .replace("{total}", ids.length);

  const controls = document.createElement("div");
  controls.className = "mylist-controls";

  const prevBtn = document.createElement("button");
  prevBtn.className = "mylist-page-btn";
  prevBtn.textContent = CivicLearnI18n.t("my_list_prev", "Previous");
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
  nextBtn.textContent = CivicLearnI18n.t("my_list_next", "Next");
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
  await CivicEdgeEngine.start("quick", { limit: 0 });
  render();
})();


})();

